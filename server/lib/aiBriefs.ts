import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  humanReviewManagerBriefSchema,
  recommendationWhatIfBriefSchema,
  type Case,
  type HumanReviewCasePacket,
  type HumanReviewRequest,
  type RecommendationWhatIfBrief,
  type HumanReviewManagerBrief,
  type ResultPayload,
  type ScenarioLabComparison
} from "@shared/contracts";

const whatIfModelSchema = z.object({
  headline: z.string().min(1),
  verdictDeltaSummary: z.string().min(1),
  readinessDeltaSummary: z.string().min(1),
  priorityActions: z.array(z.string().min(1)).min(1).max(3),
  riskCallout: z.string().min(1),
  operatorNote: z.string().min(1)
});

const managerBriefModelSchema = z.object({
  managerSummary: z.string().min(1),
  firstChecks: z.array(z.string().min(1)).min(1).max(4),
  userReplyDraft: z.string().min(1),
  escalationNote: z.string().min(1)
});

let openaiClient: OpenAI | null | undefined;

function getOpenAIClient(): OpenAI | null {
  if (openaiClient !== undefined) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  openaiClient = apiKey ? new OpenAI({ apiKey }) : null;
  return openaiClient;
}

export function resetAiBriefClientForTests(): void {
  openaiClient = undefined;
}

function recommendationModel(): string {
  return process.env.OPENAI_RECOMMENDATION_MODEL ?? "gpt-4o-mini";
}

const verdictLabel: Record<ResultPayload["verdict"], string> = {
  GO: "Можно ехать",
  GO_WITH_CONDITIONS: "Можно, но с условиями",
  NOT_NOW: "Сейчас не стоит",
  HUMAN_REVIEW: "Нужна ручная проверка"
};

function responseHasRefusal(response: {
  output: Array<{ type: string; content?: Array<{ type: string }> }>;
}): boolean {
  return response.output.some(
    (item) =>
      item.type === "message" &&
      item.content?.some((content) => content.type === "refusal")
  );
}

function readinessDeltaLabel(value: number): string {
  if (value >= 0.08) return "Определённость по маршруту заметно выросла.";
  if (value > 0.01) return "Определённость по маршруту выросла.";
  if (value <= -0.08) return "Определённость по маршруту заметно снизилась.";
  if (value < -0.01) return "Определённость по маршруту снизилась.";
  return "Определённость по маршруту без заметного изменения.";
}

function evidenceStatusLabel(status: string): string {
  if (status === "valid") return "проверены";
  if (status === "stale") return "устарели";
  if (status === "missing") return "неполные";
  if (status === "conflicting") return "конфликтуют";
  if (status === "manual_only") return "только ручная проверка";
  return status;
}

function freshnessStatusLabel(status: string): string {
  if (status === "fresh") return "подтверждена";
  if (status === "stale") return "устарела";
  if (status === "unknown") return "не подтверждена";
  return status;
}

function priorityLabel(priority: string): string {
  if (priority === "critical") return "критично";
  if (priority === "high") return "высокий приоритет";
  return "средний приоритет";
}

function normalizeUiCopy(value: string): string {
  return value
    .replace(/handoff/gi, "пакет передачи")
    .replace(/summary/gi, "резюме")
    .replace(/first checks?/gi, "первые проверки")
    .replace(/escalation note/gi, "примечание для эскалации")
    .replace(/evidence gate/gi, "проверка источников")
    .replace(/EVIDENCE_GATE:([A-Z0-9_-]+)/g, "правило источников $1")
    .replace(/\bautomation=([a-z0-9_-]+)/gi, "режим: $1")
    .replace(/\bstale\b/gi, "устарел")
    .replace(/\bsafe_auto\b/gi, "авто-проверка")
    .replace(/\bmanual_only\b/gi, "только вручную")
    .replace(/\bhuman_review\b/gi, "ручная проверка")
    .replace(/\bautomation=авто-проверка/gi, "режим: авто-проверка")
    .replace(/\bR\d{2}\b/gi, "источник")
    .replace(/\s*;\s*/g, ", ")
    .replace(/\s*:\s*/g, ": ")
    .replace(/,\s*,/g, ", ")
    .replace(/\brepo=[^,\s]+/gi, "")
    .replace(/\bscope=[^,\s]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function redactContact(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "контакт подтверждён";
  const email = trimmed.match(/^([^@]+)@(.+)$/);
  if (email) {
    return `${email[1]?.slice(0, 1) ?? "*"}***@${email[2]}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 4) return `***${digits.slice(-2)}`;
  return "контакт подтверждён";
}

function sanitizeOperatorText(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeUiCopy(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s().-]{5,}\d/g, "[phone]")
    .trim();
  return normalized.length > 0 ? clampCopy(normalized, 320) : null;
}

function clampCopy(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, Math.max(0, max - 1)).trim();
  return cut.endsWith(".") ? cut : `${cut}.`;
}

function ensureCopyWindow(
  value: string,
  bounds: { min: number; max: number; fallback: string }
): string {
  const normalized = normalizeUiCopy(value);
  if (!normalized) return bounds.fallback;
  if (normalized.length > bounds.max) return clampCopy(normalized, bounds.max);
  if (normalized.length < bounds.min) {
    const padded = `${normalized} ${bounds.fallback}`.trim();
    return clampCopy(padded, bounds.max);
  }
  return normalized;
}

function sanitizePublicAiBriefText(value: string): string {
  return normalizeUiCopy(value)
    .replace(/\d{1,3}\s?%/giu, "")
    .replace(/\b\d{1,3}\/100\b/giu, "")
    .replace(/\bп\.п\.\b/giu, "")
    .replace(
      /\b(confidence|high confidence|low confidence|approval chance|likely approval|approved for sure|guaranteed|no risk)\b/giu,
      ""
    )
    .replace(
      /\b(вероятност[а-я]*|шанс(?:ы)?|скорее всего|почти точно|точно одобрят|одобрят|без риска|гарантия|гарантировано)\b/giu,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function fallbackWhatIfBrief(input: {
  caseId: string;
  candidateCaseId: string;
  offerId: string;
  offerLabel?: string;
  comparison: ScenarioLabComparison;
}): RecommendationWhatIfBrief {
  const { comparison } = input;
  const baseline = comparison.baseline.outcome;
  const candidate = comparison.candidate.outcome;
  const candidatePlan = comparison.candidate.actionPlan;
  const signalShiftCount = comparison.delta.changedSignalIds?.length ?? 0;
  const preferenceShiftCount = comparison.delta.changedPreferenceIds?.length ?? 0;
  const stepActions = candidatePlan.steps
    .slice(0, 2)
    .map((step) => `${step.label}: ${step.detail}`);
  const priorityActions = [
    ...stepActions,
    comparison.delta.nextActionChanged
      ? `Синхронизировать следующий шаг: «${baseline.nextActionLabel}» → «${candidate.nextActionLabel}».`
      : "Следующий шаг не меняется — усиление идёт за счёт качества пакета и порядка действий.",
    comparison.delta.documentsReadyDelta < 0
      ? "После сдвига документов стало меньше: сначала восстановите базовый пакет перед переходом."
      : "Документный контур не просел: можно двигаться по шагам candidate-сценария без потери базы."
  ]
    .filter(Boolean)
    .slice(0, 3);

  const riskCallout = candidatePlan.escalationReason
    ? `Ключевой риск: ${candidatePlan.escalationReason}`
    : comparison.delta.humanReviewChanged
      ? "Сдвиг уводит в ручную проверку: запускать автоматически нельзя, только через менеджера."
      : comparison.delta.verdictChanged
        ? "Вердикт меняется, поэтому нужен ручной контроль перехода между сценариями."
        : "Критичной эскалации не видно, но сценарий остаётся compare-only до ручной сверки рисков.";

  return recommendationWhatIfBriefSchema.parse({
    version: "recommendation-whatif-brief.v1",
    caseId: input.caseId,
    candidateCaseId: input.candidateCaseId,
    offerId: input.offerId,
    source: "deterministic_recovery",
    generatedAt: new Date().toISOString(),
    headline: input.offerLabel
      ? `Если сместить маршрут в сторону «${input.offerLabel}»: что реально изменится`
      : "Если сместить маршрут по альтернативному сценарию: фактический эффект",
    verdictDeltaSummary: `${verdictLabel[baseline.verdict]} → ${verdictLabel[candidate.verdict]}`,
    readinessDeltaSummary: readinessDeltaLabel(comparison.delta.confidenceDelta),
    priorityActions,
    riskCallout,
    operatorNote: `Сдвиг основан на ${signalShiftCount} сигналах и ${preferenceShiftCount} предпочтениях. Подтверждение — только через детерминированный compare.`,
    disclaimer:
      "Краткий разбор собран сервером без модели и опирается на фактические данные текущего compare."
  });
}

function fallbackManagerBrief(input: {
  caseData: Case;
  request: HumanReviewRequest;
  packet: HumanReviewCasePacket;
  operatorContext?: string;
}): HumanReviewManagerBrief {
  const userFacingReviewReason = (() => {
    const normalized = normalizeUiCopy(input.packet.reviewReason);
    if (
      /(правило источников|источников источник|режим:\s*авто-проверка|manual_only|evidence|R\\d{2})/i.test(
        normalized
      )
    ) {
      return "источники требуют ручной проверки перед финальным выводом.";
    }
    return normalized;
  })();

  const normalizeChecklistDetail = (detail: string): string => {
    const normalized = normalizeUiCopy(detail);
    if (
      /(R\d{2}|правило источников|режим:\s*авто-проверка|manual_only|evidence|источников источник)/i.test(
        normalized
      )
    ) {
      return "Проверка источников требует ручной верификации перед любым выводом по кейсу.";
    }
    return normalized;
  };

  const checklist = (input.packet.operatorChecklist ?? [])
    .slice(0, 4)
    .map((item, index) =>
      ensureCopyWindow(
        `${index + 1}. ${normalizeUiCopy(item.title)}: ${normalizeChecklistDetail(item.detail)} (${priorityLabel(item.priority)}). Зафиксировать риск и следующее действие без обещаний исхода.`,
        {
          min: 40,
          max: 240,
          fallback:
            "Проверка должна завершаться конкретным выводом для пользователя и команды."
        }
      )
    );

  const doNotAutoNotes = input.packet.doNotAutoDecideNotes ?? [];
  const note = doNotAutoNotes[0]
    ? normalizeUiCopy(doNotAutoNotes[0])
    : "До решения оператора не обещать пользователю исход кейса.";

  const docsLine =
    (input.packet.documentsToInspect?.length ?? 0) > 0
      ? `Приоритет по документам: ${input.packet.documentsToInspect
          .slice(0, 2)
          .map((item) => item.label)
          .join(", ")}.`
      : null;
  const riskLine = input.packet.riskSummary?.criticalRisk
    ? `Критичный риск: ${input.packet.riskSummary.criticalRisk.label}.`
    : null;
  const evidenceLine = `Источники: ${evidenceStatusLabel(
    input.packet.evidence.evidenceStatus
  )}; актуальность ${freshnessStatusLabel(input.packet.evidence.freshnessStatus)}.`;
  const nextStepLine = input.packet.scenario
    ? `Следующий шаг по сценарию: ${normalizeUiCopy(input.packet.scenario.nextActionLabel)}.`
    : `Следующий шаг по текущему вердикту: ${normalizeUiCopy(input.packet.currentResult.nextAction.label)}.`;
  const fallbackChecks = [
    ensureCopyWindow(`1. Подтвердить причину ручной проверки: ${userFacingReviewReason}`, {
      min: 40,
      max: 240,
      fallback: "Нужно явно зафиксировать, какой риск блокирует автоматическое продолжение."
    }),
    ensureCopyWindow(`2. Сверить доказательную базу: ${evidenceLine}`, {
      min: 40,
      max: 240,
      fallback:
        "Проверить источники и их актуальность до любого решения по маршруту и документам."
    }),
    ensureCopyWindow(
      docsLine
        ? `3. Проверить документы: ${docsLine}`
        : "3. Проверить документы: подтвердить, что обязательный пакет не имеет скрытых пробелов.",
      {
        min: 40,
        max: 240,
        fallback: "Без документной сверки нельзя безопасно фиксировать следующий шаг."
      }
    ),
    ensureCopyWindow(`4. Согласовать действие с пользователем: ${nextStepLine}`, {
      min: 40,
      max: 240,
      fallback: "После сверки рисков зафиксировать следующий шаг в понятной формулировке."
    })
  ];

  const replyDraft = ensureCopyWindow(
    [
    `Принял кейс ${input.caseData.title} в ручную проверку.`,
    `Сейчас проверяем: ${userFacingReviewReason}`,
    evidenceLine,
    docsLine,
    nextStepLine,
    "Проверю риски и документы вручную, затем вернусь с точным статусом и конкретным действием."
  ]
    .filter(Boolean)
    .join(" "),
    {
      min: 45,
      max: 240,
      fallback:
        "После ручной проверки вернусь с подтверждённым статусом и следующим действием по кейсу."
    }
  );

  return humanReviewManagerBriefSchema.parse({
    version: "human-review-manager-brief.v1",
    caseId: input.caseData.id,
    requestId: input.request.id,
    source: "deterministic_recovery",
    generatedAt: new Date().toISOString(),
    managerSummary: ensureCopyWindow(
      [
      `Кейс ${input.caseData.title} переведён в ручную проверку.`,
      evidenceLine,
      `Вердикт сейчас: ${verdictLabel[input.packet.currentResult.verdict]}.`,
      riskLine
    ]
      .filter(Boolean)
      .join(" "),
      {
        min: 45,
        max: 170,
        fallback:
          "Кейс требует ручной проверки по рискам и источникам перед фиксацией следующего шага."
      }
    ),
    firstChecks: checklist.length > 0 ? checklist : fallbackChecks,
    userReplyDraft: replyDraft,
    escalationNote: ensureCopyWindow(note, {
      min: 45,
      max: 220,
      fallback: "Эскалировать кейс, если источники конфликтуют или риск нельзя снять документами."
    }),
    disclaimer:
      "Пакет собран сервером без модели на основе фактов human-review packet."
  });
}

function whatIfInput(input: {
  caseId: string;
  candidateCaseId: string;
  offerId: string;
  offerLabel?: string;
  comparison: ScenarioLabComparison;
}): string {
  return JSON.stringify(
    {
      task: "Собери краткий what-if разбор для экрана результата Active Holidays.",
      rules: [
        "Пиши только по фактам JSON и только по-русски.",
        "Не придумывай новые документы, цены, правила, дедлайны и обещания.",
        "Не меняй ownership: compare уже посчитан детерминированным движком.",
        "Дай 1 headline, сводку изменения определенности без числовых процентов, 1-3 практических шага и риск-callout."
      ],
      context: {
        caseId: input.caseId,
        candidateCaseId: input.candidateCaseId,
        offerId: input.offerId,
        offerLabel: input.offerLabel ?? null,
        comparison: input.comparison
      }
    },
    null,
    2
  );
}

function managerInput(input: {
  caseData: Case;
  request: HumanReviewRequest;
  packet: HumanReviewCasePacket;
  operatorContext?: string;
}): string {
  return JSON.stringify(
    {
      task: "Собери короткий пакет менеджера для ручной проверки кейса Active Holidays.",
      rules: [
        "Пиши только по фактам JSON и только по-русски.",
        "Не придумывай новые причины, проверки, обещания, SLA или исходы.",
        "Сформируй: краткое резюме, список первых проверок, черновик ответа пользователю и заметку для эскалации.",
        "Каждый пункт первых проверок должен быть конкретным действием, а не общим советом."
      ],
      context: {
        case: {
          id: input.caseData.id,
          title: input.caseData.title,
          productType: input.caseData.productType
        },
        request: {
          id: input.request.id,
          status: input.request.status,
          channel: input.request.channel,
          message: sanitizeOperatorText(input.request.message),
          contact: redactContact(input.request.contact)
        },
        packet: input.packet,
        operatorContext: sanitizeOperatorText(input.operatorContext)
      }
    },
    null,
    2
  );
}

function sanitizeWhatIfBrief(
  input: {
    caseId: string;
    candidateCaseId: string;
    offerId: string;
    offerLabel?: string;
    comparison: ScenarioLabComparison;
  },
  output: z.infer<typeof whatIfModelSchema>,
  source: "ai_structured" | "deterministic_recovery"
): RecommendationWhatIfBrief {
  const fallback = fallbackWhatIfBrief(input);
  return recommendationWhatIfBriefSchema.parse({
    ...fallback,
    source,
    headline: sanitizePublicAiBriefText(output.headline) || fallback.headline,
    verdictDeltaSummary:
      sanitizePublicAiBriefText(output.verdictDeltaSummary) || fallback.verdictDeltaSummary,
    readinessDeltaSummary:
      sanitizePublicAiBriefText(output.readinessDeltaSummary) || fallback.readinessDeltaSummary,
    priorityActions:
      output.priorityActions.map((item) => item.trim()).filter(Boolean).slice(0, 3).length > 0
        ? output.priorityActions
            .map((item) => sanitizePublicAiBriefText(item))
            .filter(Boolean)
            .slice(0, 3)
        : fallback.priorityActions,
    riskCallout: sanitizePublicAiBriefText(output.riskCallout) || fallback.riskCallout,
    operatorNote: sanitizePublicAiBriefText(output.operatorNote) || fallback.operatorNote,
    disclaimer:
      source === "ai_structured"
        ? "AI-слой объясняет уже посчитанный compare и не подменяет решение движка."
        : fallback.disclaimer
  });
}

function sanitizeManagerBrief(
  input: {
    caseData: Case;
    request: HumanReviewRequest;
    packet: HumanReviewCasePacket;
    operatorContext?: string;
  },
  output: z.infer<typeof managerBriefModelSchema>,
  source: "ai_structured" | "deterministic_recovery"
): HumanReviewManagerBrief {
  const cleanedFirstChecks = output.firstChecks
    .map((item) =>
      ensureCopyWindow(item, {
        min: 40,
        max: 240,
        fallback:
          "Проверка должна завершаться подтверждённым решением и понятным следующим действием."
      })
    )
    .map((line) => {
      if (
        /(правило источников|режим:\s*авто-проверка|источник:\s*устарел|источников источник|manual_only|evidence)/i.test(
          line
        )
      ) {
        return ensureCopyWindow(
          "Проверить источники и их актуальность: подтвердить свежие данные до любого вывода по кейсу и следующему действию.",
          {
            min: 40,
            max: 240,
            fallback:
              "Проверить источник, документ и риск перед коммуникацией следующего шага пользователю."
          }
        );
      }
      return line;
    })
    .filter(Boolean)
    .slice(0, 4);

  const fallback = fallbackManagerBrief(input);
  return humanReviewManagerBriefSchema.parse({
    ...fallback,
    source,
    managerSummary: ensureCopyWindow(normalizeUiCopy(output.managerSummary), {
      min: 45,
      max: 170,
      fallback: fallback.managerSummary
    }),
    firstChecks: cleanedFirstChecks.length > 0 ? cleanedFirstChecks : fallback.firstChecks,
    userReplyDraft: ensureCopyWindow(normalizeUiCopy(output.userReplyDraft), {
      min: 45,
      max: 240,
      fallback: fallback.userReplyDraft
    }),
    escalationNote: ensureCopyWindow(normalizeUiCopy(output.escalationNote), {
      min: 45,
      max: 220,
      fallback: fallback.escalationNote
    }),
    disclaimer:
      source === "ai_structured"
        ? "AI-слой собрал черновой manager packet, но решение по кейсу остаётся за оператором."
        : fallback.disclaimer
  });
}

export async function buildRecommendationWhatIfBrief(input: {
  caseId: string;
  candidateCaseId: string;
  offerId: string;
  offerLabel?: string;
  comparison: ScenarioLabComparison;
}): Promise<RecommendationWhatIfBrief> {
  const client = getOpenAIClient();
  if (!client) return fallbackWhatIfBrief(input);

  try {
    const response = await client.responses.create({
      model: recommendationModel(),
      input: [
        {
          role: "system",
          content:
            "Ты ведущий риск-аналитик Active Holidays. Дай экспертный разбор сценарного сдвига: только по JSON-фактам, по-русски, без догадок и без обещаний исхода."
        },
        {
          role: "user",
          content: whatIfInput(input)
        }
      ],
      text: {
        format: zodTextFormat(whatIfModelSchema, "recommendation_what_if_brief")
      }
    });

    if (responseHasRefusal(response) || !response.output_text) {
      return fallbackWhatIfBrief(input);
    }

    const parsed = whatIfModelSchema.parse(JSON.parse(response.output_text));
    return sanitizeWhatIfBrief(input, parsed, "ai_structured");
  } catch {
    return fallbackWhatIfBrief(input);
  }
}

export async function buildHumanReviewManagerBrief(input: {
  caseData: Case;
  request: HumanReviewRequest;
  packet: HumanReviewCasePacket;
  operatorContext?: string;
}): Promise<HumanReviewManagerBrief> {
  const client = getOpenAIClient();
  if (!client) return fallbackManagerBrief(input);

  try {
    const response = await client.responses.create({
      model: recommendationModel(),
      input: [
        {
          role: "system",
          content:
            "Ты senior-оператор Active Holidays. Собери плотный и практичный менеджерский бриф: только по JSON-фактам, по-русски, без воды, без обещаний результата кейса."
        },
        {
          role: "user",
          content: managerInput(input)
        }
      ],
      text: {
        format: zodTextFormat(managerBriefModelSchema, "human_review_manager_brief")
      }
    });

    if (responseHasRefusal(response) || !response.output_text) {
      return fallbackManagerBrief(input);
    }

    const parsed = managerBriefModelSchema.parse(JSON.parse(response.output_text));
    return sanitizeManagerBrief(input, parsed, "ai_structured");
  } catch {
    return fallbackManagerBrief(input);
  }
}
