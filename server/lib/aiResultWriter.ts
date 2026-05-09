import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  aiResultPayloadSchema,
  aiResultWriterActionPlanSchema,
  aiResultWriterPrimaryNextStepSchema,
  aiResultWriterUncertaintySchema,
  derivePublicReadinessFromResult,
  type AiResultPayload,
  type Case,
  type PublicReadinessProjection,
  type RecommendationShortlist,
  type ResultPayload
} from "@shared/contracts";

type BuildAiResultPayloadInput = {
  caseData: Case;
  result: ResultPayload;
  readiness?: PublicReadinessProjection;
  shortlist?: RecommendationShortlist | null;
};

type FallbackReason = "generation_unavailable" | "generation_unusable" | null;

type ClaimGuardResult = {
  value: string;
  blockedClaims: string[];
  sanitized: boolean;
  hardFailure: boolean;
};

type ClaimGuardAccumulator = {
  blockedClaims: Set<string>;
  sanitized: boolean;
  hardFailure: boolean;
};

const aiResultWriterModelSchema = aiResultPayloadSchema
  .pick({
    statusSummary: true,
    primaryNextStep: true,
    actionPlan: true,
    safeRecommendationText: true
  })
  .strict();

const BLOCKED_CLAIMS: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "unsupported_guarantee_ru",
    pattern: /гарантия|гарантировано/iu
  },
  {
    label: "unsupported_approval_claim_ru",
    pattern: /точно одобрят|одобрят/iu
  },
  {
    label: "unsupported_probability_ru",
    pattern: /вероятность|шанс(?:ы)?|скорее всего|почти точно/iu
  },
  {
    label: "unsupported_no_risk_ru",
    pattern: /без риска/iu
  },
  {
    label: "unsupported_probability_en",
    pattern: /approval chance|likely approval|approved for sure|high confidence|low confidence/i
  },
  {
    label: "unsupported_guarantee_en",
    pattern: /guaranteed/i
  },
  {
    label: "unsupported_no_risk_en",
    pattern: /no risk/i
  },
  {
    label: "unsupported_numeric_percent",
    pattern: /\d{1,3}\s?%/iu
  },
  {
    label: "unsupported_numeric_score",
    pattern: /\b\d{1,3}\/100\b/iu
  }
];

const INTERNAL_LEAK_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "hidden_reasoning_en",
    pattern: /chain[- ]of[- ]thought|reasoning|thinking process/i
  },
  {
    label: "hidden_reasoning_ru",
    pattern: /пошагов|ход рассуждени|внутренн[а-я\s-]*рассуждени/iu
  },
  {
    label: "internal_diagnostics",
    pattern: /confidence|score|audittrail|ruleresults|diagnostic|internal/i
  },
  {
    label: "internal_enum_leak",
    pattern: /go_with_conditions|human_review|not_ready_fixable|model_unavailable|model_response_unusable|fallback|openai/i
  }
];

const READINESS_LABEL: Record<PublicReadinessProjection["state"], string> = {
  ready: "Маршрут готов к исполнению",
  almost_ready: "Маршрут почти готов",
  not_ready_fixable: "Маршрут можно продолжить после исправлений",
  not_ready_blocked: "Маршрут пока заблокирован",
  needs_human_review: "Нужна ручная проверка",
  insufficient_data: "Недостаточно данных"
};

const EVIDENCE_STATUS_LABEL: Record<ResultPayload["trust"]["evidenceStatus"], string> = {
  valid: "источники подтверждены",
  stale: "источники требуют обновления",
  missing: "часть источников не подтверждена",
  conflicting: "источники конфликтуют",
  manual_only: "источники требуют ручной сверки"
};

let openaiClient: OpenAI | null | undefined;

function getOpenAIClient(): OpenAI | null {
  if (openaiClient !== undefined) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  openaiClient = apiKey ? new OpenAI({ apiKey }) : null;
  return openaiClient;
}

export function resetAiResultWriterClientForTests(): void {
  openaiClient = undefined;
}

function aiResultWriterModel(): string {
  return process.env.OPENAI_RESULT_WRITER_MODEL ?? process.env.OPENAI_RECOMMENDATION_MODEL ?? "gpt-4o-mini";
}

function clampText(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  const sliced = normalized.slice(0, Math.max(1, max - 1)).trim();
  return sliced.endsWith(".") ? sliced : `${sliced}.`;
}

function canonicalText(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").trim();
}

function claimGuardText(candidate: string, fallback: string): ClaimGuardResult {
  const safeFallback = clampText(fallback, 560);
  const text = clampText(candidate, 560);
  const blockedClaims = BLOCKED_CLAIMS.filter((rule) => rule.pattern.test(canonicalText(text))).map(
    (rule) => rule.label
  );
  const internalLeaks = INTERNAL_LEAK_PATTERNS.filter((rule) =>
    rule.pattern.test(canonicalText(text))
  ).map((rule) => rule.label);

  if (internalLeaks.length > 0) {
    return {
      value: safeFallback,
      blockedClaims: [...blockedClaims, ...internalLeaks],
      sanitized: true,
      hardFailure: true
    };
  }

  if (blockedClaims.length > 0) {
    return {
      value: safeFallback,
      blockedClaims,
      sanitized: true,
      hardFailure: false
    };
  }

  return {
    value: text.length > 0 ? text : safeFallback,
    blockedClaims: [],
    sanitized: text.length === 0,
    hardFailure: false
  };
}

function mergeGuard(acc: ClaimGuardAccumulator, next: ClaimGuardResult): void {
  for (const claim of next.blockedClaims) acc.blockedClaims.add(claim);
  acc.sanitized ||= next.sanitized;
  acc.hardFailure ||= next.hardFailure;
}

function urgencyFromResult(result: ResultPayload, readiness: PublicReadinessProjection) {
  if (readiness.state === "needs_human_review") return "human_review" as const;
  if (result.nextAction.priority === "blocking" || result.nextAction.priority === "path") {
    return "now" as const;
  }
  if (result.nextAction.priority === "advisory") return "before_departure" as const;
  if (result.nextAction.priority === "fallback") return "optional" as const;
  return "human_review" as const;
}

function actionTypeFromResult(result: ResultPayload, readiness: PublicReadinessProjection) {
  if (readiness.state === "needs_human_review" || result.verdict === "HUMAN_REVIEW") {
    return "human_review" as const;
  }
  if (
    readiness.state === "insufficient_data" ||
    result.assumptions.length > 0 ||
    result.documents.items.some((item) => item.status !== "ready")
  ) {
    return "fix_missing_data" as const;
  }
  if (readiness.state === "not_ready_blocked" || result.criticalRisk || result.risks.length > 0) {
    return "verify_risk" as const;
  }
  return "prepare" as const;
}

function fallbackReasonLabel(reason: FallbackReason): string {
  if (reason === "generation_unavailable") {
    return "Разбор сформирован по проверенным правилам кейса: автоматическая генерация сейчас ограничена.";
  }
  if (reason === "generation_unusable") {
    return "Разбор сформирован по проверенным правилам кейса: автоматически сгенерированный текст не прошёл проверку безопасности.";
  }
  return "Ответ построен по текущим проверенным данным кейса.";
}

function deterministicUncertainty(args: {
  result: ResultPayload;
  readiness: PublicReadinessProjection;
  source: "deterministic" | "ai_structured" | "deterministic_recovery";
  fallbackReason: FallbackReason;
}) {
  if (args.fallbackReason) {
    return aiResultWriterUncertaintySchema.parse({
      label: "deterministic_recovery",
      reason: fallbackReasonLabel(args.fallbackReason),
      source: "deterministic_recovery"
    });
  }

  if (
    args.readiness.state === "needs_human_review" ||
    args.result.trust.evidenceStatus === "conflicting" ||
    args.result.trust.evidenceStatus === "manual_only" ||
    args.result.trust.humanReviewReason
  ) {
    return aiResultWriterUncertaintySchema.parse({
      label: "human_review_recommended",
      reason: "Есть сигналы, которые требуют ручной проверки перед финальным действием.",
      source: args.source
    });
  }

  if (
    args.readiness.state === "insufficient_data" ||
    args.result.assumptions.length > 0 ||
    args.result.trust.evidenceStatus === "missing" ||
    args.result.trust.evidenceStatus === "stale"
  ) {
    return aiResultWriterUncertaintySchema.parse({
      label: "needs_more_data",
      reason: "Данных недостаточно или они устарели: перед действием нужно закрыть пробелы.",
      source: args.source
    });
  }

  return aiResultWriterUncertaintySchema.parse({
    label: "within_confirmed_data",
    reason: "В кейсе есть риск-сигналы: действуйте только после дополнительной проверки.",
    source: args.source
  });
}

function recommendationFact(shortlist: RecommendationShortlist | null | undefined): string | null {
  if (!shortlist || shortlist.items.length === 0 || !shortlist.recommendedOfferId) return null;
  const recommended = shortlist.items.find((item) => item.offerId === shortlist.recommendedOfferId);
  if (!recommended) return null;
  return `Рекомендованный вариант: ${recommended.title}.`;
}

function deterministicStatusSummary(
  result: ResultPayload,
  readiness: PublicReadinessProjection
): string {
  const readinessLabel = READINESS_LABEL[readiness.state];
  if (result.criticalRisk) {
    return `${readinessLabel}. Есть критичный риск: ${result.criticalRisk.detail}`;
  }
  return `${readinessLabel}. ${result.nextAction.detail}`;
}

function deterministicPrimaryNextStep(
  result: ResultPayload,
  readiness: PublicReadinessProjection
) {
  const actionType = actionTypeFromResult(result, readiness);
  const urgency = urgencyFromResult(result, readiness);

  if (actionType === "human_review") {
    return aiResultWriterPrimaryNextStepSchema.parse({
      label: "Передайте кейс эксперту",
      reason: "Автоматический слой не должен фиксировать финальное решение при текущих сигналах.",
      urgency,
      actionType
    });
  }

  if (actionType === "fix_missing_data") {
    return aiResultWriterPrimaryNextStepSchema.parse({
      label: "Закройте пробелы в данных и документах",
      reason: "Без полного пакета и уточнённых фактов маршрут остаётся предварительным.",
      urgency,
      actionType
    });
  }

  if (actionType === "verify_risk") {
    return aiResultWriterPrimaryNextStepSchema.parse({
      label: "Проверьте риск-сигналы перед подачей",
      reason: "Риск-профиль может изменить приоритет действий и безопасный путь.",
      urgency,
      actionType
    });
  }

  return aiResultWriterPrimaryNextStepSchema.parse({
    label: clampText(result.nextAction.label, 160),
    reason: "Следующий шаг можно готовить только в рамках подтверждённых данных кейса.",
    urgency,
    actionType
  });
}

function deterministicActionPlan(
  result: ResultPayload,
  readiness: PublicReadinessProjection
) {
  const missingDocs = result.documents.items
    .filter((item) => item.status !== "ready")
    .slice(0, 2)
    .map((item) => item.label);
  const topRisks = [
    ...(result.criticalRisk ? [result.criticalRisk.detail] : []),
    ...result.risks.slice(0, 1).map((risk) => risk.detail)
  ];

  const doNow = [
    clampText(result.nextAction.label, 180),
    missingDocs.length > 0
      ? clampText(`Соберите недостающие документы: ${missingDocs.join(", ")}.`, 180)
      : "Проверьте, что обязательный пакет документов подтверждён.",
    topRisks[0]
      ? clampText(`Перепроверьте риск: ${topRisks[0]}`, 180)
      : "Зафиксируйте последний пересчёт кейса перед действием."
  ].slice(0, 3);

  const beforeDeparture = [
    "Сверьте сроки поездки и актуальность подтверждающих документов.",
    "Проверьте, что ограничения по маршруту не изменились после последней проверки.",
    "Обновите кейс, если изменились даты, финансы или условия подачи."
  ].slice(0, 3);

  const ifUncertain = [
    "Если остаются пробелы по данным, запустите повторную проверку кейса.",
    "При конфликте источников передайте кейс на ручную проверку."
  ].slice(0, 2);

  if (readiness.state === "needs_human_review") {
    return aiResultWriterActionPlanSchema.parse({
      doNow: [
        "Соберите материалы кейса для эксперта.",
        "Передайте кейс в ручную проверку без автоматических обещаний."
      ],
      beforeDeparture,
      ifUncertain
    });
  }

  return aiResultWriterActionPlanSchema.parse({
    doNow,
    beforeDeparture,
    ifUncertain
  });
}

function deterministicEvidenceFacts(
  result: ResultPayload,
  readiness: PublicReadinessProjection,
  shortlist?: RecommendationShortlist | null
) {
  const known = [
    `Статус маршрута: ${READINESS_LABEL[readiness.state]}.`,
    `Следующий шаг: ${result.nextAction.label}.`,
    `Документы проверены: готово ${result.documents.readyCount} из ${result.documents.requiredCount}.`,
    `Проверка источников: ${EVIDENCE_STATUS_LABEL[result.trust.evidenceStatus]}.`
  ];
  const recommendation = recommendationFact(shortlist);
  if (recommendation) known.push(recommendation);

  const missing = [
    ...result.assumptions.slice(0, 3).map((item) => item.detail),
    ...(result.trust.evidenceStatus === "missing"
      ? ["Часть источников не подтверждена: нужен дополнительный сбор данных."]
      : []),
    ...(result.trust.evidenceStatus === "stale"
      ? ["Данные устарели: требуется обновление перед действием."]
      : [])
  ].slice(0, 5);

  const riskSignals = [
    ...(result.criticalRisk ? [result.criticalRisk.detail] : []),
    ...result.risks.slice(0, 3).map((item) => item.detail),
    ...(result.trust.blockingReason ? [result.trust.blockingReason] : []),
    ...(result.trust.humanReviewReason ? [result.trust.humanReviewReason] : [])
  ].slice(0, 5);

  return {
    known: known.slice(0, 5).map((item) => clampText(item, 220)),
    missing: missing.map((item) => clampText(item, 220)),
    riskSignals: riskSignals.map((item) => clampText(item, 220))
  };
}

function deterministicSafeRecommendationText(
  result: ResultPayload,
  readiness: PublicReadinessProjection
): string {
  const base =
    "На основе указанных данных маршрут можно использовать как ориентир, но финальное действие подтверждайте только после проверки документов и рисков.";

  if (readiness.state === "needs_human_review" || result.verdict === "HUMAN_REVIEW") {
    return "На основе указанных данных рекомендуется ручная проверка: автоматический разбор не фиксирует финальное решение.";
  }

  if (readiness.state === "insufficient_data") {
    return "На основе указанных данных сначала нужно закрыть недостающую информацию, затем повторить проверку кейса.";
  }

  return base;
}

function buildDeterministicPayload(args: {
  caseData: Case;
  result: ResultPayload;
  readiness: PublicReadinessProjection;
  shortlist?: RecommendationShortlist | null;
  source: "deterministic" | "ai_structured" | "deterministic_recovery";
  fallbackReason: FallbackReason;
  claimGuard?: { blockedClaims: string[]; sanitized: boolean };
}): AiResultPayload {
  const statusSummary = clampText(
    deterministicStatusSummary(args.result, args.readiness),
    220
  );
  const primaryNextStep = deterministicPrimaryNextStep(args.result, args.readiness);
  const actionPlan = deterministicActionPlan(args.result, args.readiness);
  const evidenceFacts = deterministicEvidenceFacts(args.result, args.readiness, args.shortlist);
  const uncertainty = deterministicUncertainty({
    result: args.result,
    readiness: args.readiness,
    source: args.source,
    fallbackReason: args.fallbackReason
  });
  const safeRecommendationText = clampText(
    deterministicSafeRecommendationText(args.result, args.readiness),
    560
  );

  return aiResultPayloadSchema.parse({
    version: "ai-result-writer.v1",
    caseId: args.caseData.id,
    generatedAt: new Date().toISOString(),
    basedOnComputedAt: args.result.computedAt,
    statusSummary,
    primaryNextStep,
    actionPlan,
    evidenceFacts,
    uncertainty,
    safeRecommendationText,
    claimGuard: {
      blockedClaims: args.claimGuard?.blockedClaims ?? [],
      sanitized: args.claimGuard?.sanitized ?? false
    }
  });
}

function responseHasRefusal(response: {
  output: Array<{ type: string; content?: Array<{ type: string }> }>;
}): boolean {
  return response.output.some(
    (item) =>
      item.type === "message" &&
      item.content?.some((content) => content.type === "refusal")
  );
}

function aiPromptInput(args: {
  caseData: Case;
  result: ResultPayload;
  readiness: PublicReadinessProjection;
  shortlist?: RecommendationShortlist | null;
  deterministic: AiResultPayload;
}): string {
  return JSON.stringify(
    {
      task: "Собери безопасный структурированный AI-разбор результата Active Holidays.",
      rules: [
        "Пиши только по фактам JSON и только по-русски.",
        "Не используй вероятности, проценты одобрения, гарантии и legal promises.",
        "Не раскрывай внутренние рассуждения, score, confidence или diagnostics.",
        "Не меняй ownership движка: AI объясняет, но не решает."
      ],
      context: {
        caseId: args.caseData.id,
        caseTitle: args.caseData.title,
        verdict: args.result.verdict,
        readiness: args.readiness,
        nextAction: args.result.nextAction,
        criticalRisk: args.result.criticalRisk?.detail ?? null,
        riskSignals: args.result.risks.slice(0, 3).map((item) => item.detail),
        documents: {
          readyCount: args.result.documents.readyCount,
          requiredCount: args.result.documents.requiredCount,
          pending: args.result.documents.items
            .filter((item) => item.status !== "ready")
            .slice(0, 3)
            .map((item) => item.label)
        },
        assumptions: args.result.assumptions.slice(0, 3).map((item) => item.detail),
        evidenceStatus: args.result.trust.evidenceStatus,
        shortlist:
          args.shortlist?.items.map((item) => ({
            offerId: item.offerId,
            title: item.title,
            fit: item.fit
          })) ?? [],
        deterministicScaffold: {
          statusSummary: args.deterministic.statusSummary,
          primaryNextStep: args.deterministic.primaryNextStep,
          actionPlan: args.deterministic.actionPlan,
          safeRecommendationText: args.deterministic.safeRecommendationText
        }
      }
    },
    null,
    2
  );
}

function sanitizeActionPlan(args: {
  candidate: z.infer<typeof aiResultWriterActionPlanSchema>;
  fallback: z.infer<typeof aiResultWriterActionPlanSchema>;
  guard: ClaimGuardAccumulator;
}) {
  const sanitizeList = (
    candidate: string[],
    fallback: string[],
    limits: { min: number; max: number }
  ): string[] => {
    const out: string[] = [];
    const total = Math.max(candidate.length, limits.min);
    for (let index = 0; index < total && out.length < limits.max; index += 1) {
      const fallbackValue = fallback[index] ?? fallback[fallback.length - 1];
      const guardResult = claimGuardText(candidate[index] ?? fallbackValue, fallbackValue);
      mergeGuard(args.guard, guardResult);
      out.push(clampText(guardResult.value, 180));
    }
    while (out.length < limits.min) {
      out.push(clampText(fallback[out.length] ?? fallback[fallback.length - 1], 180));
    }
    return out.slice(0, limits.max);
  };

  return aiResultWriterActionPlanSchema.parse({
    doNow: sanitizeList(args.candidate.doNow, args.fallback.doNow, { min: 1, max: 3 }),
    beforeDeparture: sanitizeList(args.candidate.beforeDeparture, args.fallback.beforeDeparture, {
      min: 1,
      max: 3
    }),
    ifUncertain: sanitizeList(args.candidate.ifUncertain, args.fallback.ifUncertain, {
      min: 1,
      max: 2
    })
  });
}

export async function buildAiResultPayload(
  input: BuildAiResultPayloadInput
): Promise<AiResultPayload> {
  const readiness = input.readiness ?? derivePublicReadinessFromResult(input.result);
  const deterministic = buildDeterministicPayload({
    caseData: input.caseData,
    result: input.result,
    readiness,
    shortlist: input.shortlist,
    source: "deterministic",
    fallbackReason: null
  });

  const client = getOpenAIClient();
  if (!client) {
    return buildDeterministicPayload({
      caseData: input.caseData,
      result: input.result,
      readiness,
      shortlist: input.shortlist,
      source: "deterministic_recovery",
      fallbackReason: "generation_unavailable"
    });
  }

  try {
    const response = await client.responses.create({
      model: aiResultWriterModel(),
      input: [
        {
          role: "system",
          content:
            "Ты пишешь безопасный AI-разбор для Active Holidays. Пиши только по фактам JSON, только по-русски, без вероятностей, гарантий, скрытых рассуждений и внутренних диагностик."
        },
        {
          role: "user",
          content: aiPromptInput({
            caseData: input.caseData,
            result: input.result,
            readiness,
            shortlist: input.shortlist,
            deterministic
          })
        }
      ],
      text: {
        format: zodTextFormat(aiResultWriterModelSchema, "ai_result_writer")
      }
    });

    if (responseHasRefusal(response) || !response.output_text) {
      return buildDeterministicPayload({
        caseData: input.caseData,
        result: input.result,
        readiness,
        shortlist: input.shortlist,
        source: "deterministic_recovery",
        fallbackReason: "generation_unusable"
      });
    }

    const parsed = aiResultWriterModelSchema.parse(JSON.parse(response.output_text));
    const guard: ClaimGuardAccumulator = {
      blockedClaims: new Set<string>(),
      sanitized: false,
      hardFailure: false
    };

    const statusSummary = claimGuardText(parsed.statusSummary, deterministic.statusSummary);
    mergeGuard(guard, statusSummary);

    const primaryLabel = claimGuardText(
      parsed.primaryNextStep.label,
      deterministic.primaryNextStep.label
    );
    mergeGuard(guard, primaryLabel);

    const primaryReason = claimGuardText(
      parsed.primaryNextStep.reason,
      deterministic.primaryNextStep.reason
    );
    mergeGuard(guard, primaryReason);

    const safeRecommendationText = claimGuardText(
      parsed.safeRecommendationText,
      deterministic.safeRecommendationText
    );
    mergeGuard(guard, safeRecommendationText);

    const actionPlan = sanitizeActionPlan({
      candidate: parsed.actionPlan,
      fallback: deterministic.actionPlan,
      guard
    });

    if (guard.hardFailure) {
      return buildDeterministicPayload({
        caseData: input.caseData,
        result: input.result,
        readiness,
        shortlist: input.shortlist,
        source: "deterministic_recovery",
        fallbackReason: "generation_unusable",
        claimGuard: {
          blockedClaims: Array.from(guard.blockedClaims),
          sanitized: true
        }
      });
    }

    return aiResultPayloadSchema.parse({
      ...deterministic,
      generatedAt: new Date().toISOString(),
      statusSummary: clampText(statusSummary.value, 220),
      primaryNextStep: aiResultWriterPrimaryNextStepSchema.parse({
        label: clampText(primaryLabel.value, 160),
        reason: clampText(primaryReason.value, 280),
        urgency: deterministic.primaryNextStep.urgency,
        actionType: deterministic.primaryNextStep.actionType
      }),
      actionPlan,
      uncertainty: deterministicUncertainty({
        result: input.result,
        readiness,
        source: "ai_structured",
        fallbackReason: null
      }),
      safeRecommendationText: clampText(safeRecommendationText.value, 560),
      claimGuard: {
        blockedClaims: Array.from(guard.blockedClaims),
        sanitized: guard.sanitized
      }
    });
  } catch {
    return buildDeterministicPayload({
      caseData: input.caseData,
      result: input.result,
      readiness,
      shortlist: input.shortlist,
      source: "deterministic_recovery",
      fallbackReason: "generation_unusable"
    });
  }
}
