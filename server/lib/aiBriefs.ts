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
  confidenceDeltaSummary: z.string().min(1),
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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDelta(value: number): string {
  const points = Math.round(value * 100);
  if (points === 0) return "без изменения";
  return `${points > 0 ? "+" : ""}${points} п.п.`;
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
  if (status === "fresh") return "актуальны";
  if (status === "stale") return "устарели";
  if (status === "unknown") return "неизвестная актуальность";
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
    .replace(/\bstale\b/gi, "устарел")
    .replace(/\bsafe_auto\b/gi, "авто-проверка")
    .replace(/\bmanual_only\b/gi, "только вручную")
    .replace(/\bhuman_review\b/gi, "ручная проверка")
    .replace(/\s+/g, " ")
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
    source: "fallback",
    generatedAt: new Date().toISOString(),
    headline: input.offerLabel
      ? `Если сместить маршрут в сторону «${input.offerLabel}»: что реально изменится`
      : "Если сместить маршрут по альтернативному сценарию: фактический эффект",
    verdictDeltaSummary: `${verdictLabel[baseline.verdict]} → ${verdictLabel[candidate.verdict]}`,
    confidenceDeltaSummary: `${formatPercent(baseline.confidence)} → ${formatPercent(candidate.confidence)} (${formatDelta(comparison.delta.confidenceDelta)})`,
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
  const checklist = (input.packet.operatorChecklist ?? [])
    .slice(0, 4)
    .map(
      (item, index) =>
        `${index + 1}. ${normalizeUiCopy(item.title)} — ${normalizeUiCopy(item.detail)} (${priorityLabel(item.priority)})`
    );

  const doNotAutoNotes = input.packet.doNotAutoDecideNotes ?? [];
  const note = doNotAutoNotes[0]
    ? normalizeUiCopy(doNotAutoNotes[0])
    : "До решения оператора не обещать пользователю исход кейса.";

  const contextLine = input.operatorContext
    ? `Контекст от оператора: ${input.operatorContext}`
    : null;
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
  const evidenceLine = `Источники ${evidenceStatusLabel(
    input.packet.evidence.evidenceStatus
  )}, актуальность ${freshnessStatusLabel(input.packet.evidence.freshnessStatus)}.`;

  const replyDraft = [
    `Принял кейс ${input.caseData.id} в ручную проверку.`,
    `Сейчас проверяем: ${normalizeUiCopy(input.packet.reviewReason)}.`,
    evidenceLine,
    docsLine,
    input.packet.scenario
      ? `Сценарий: ${normalizeUiCopy(input.packet.scenario.title)}. Следующий шаг: ${normalizeUiCopy(input.packet.scenario.nextActionLabel)}.`
      : `Следующий шаг из текущего вердикта: ${input.packet.currentResult.nextAction.label}.`,
    "Проверю документы и ограничения вручную, затем вернусь с точным статусом и следующим действием."
  ]
    .filter(Boolean)
    .join(" ");

  return humanReviewManagerBriefSchema.parse({
    version: "human-review-manager-brief.v1",
    caseId: input.caseData.id,
    requestId: input.request.id,
    source: "fallback",
    generatedAt: new Date().toISOString(),
    managerSummary: [
      `Кейс ${input.caseData.title} переведён в ручную проверку.`,
      evidenceLine,
      `Вердикт сейчас: ${verdictLabel[input.packet.currentResult.verdict]}.`,
      riskLine,
      contextLine
    ]
      .filter(Boolean)
      .join(" "),
    firstChecks: checklist.length > 0 ? checklist : [input.packet.reviewReason],
    userReplyDraft: replyDraft,
    escalationNote: note,
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
        "Дай 1 headline, сводку дельты вердикта/уверенности, 1-3 практических шага и риск-callout."
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
          message: input.request.message,
          contact: input.request.contact
        },
        packet: input.packet,
        operatorContext: input.operatorContext ?? null
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
  source: "openai" | "fallback"
): RecommendationWhatIfBrief {
  const fallback = fallbackWhatIfBrief(input);
  return recommendationWhatIfBriefSchema.parse({
    ...fallback,
    source,
    headline: normalizeUiCopy(output.headline) || fallback.headline,
    verdictDeltaSummary: normalizeUiCopy(output.verdictDeltaSummary) || fallback.verdictDeltaSummary,
    confidenceDeltaSummary:
      normalizeUiCopy(output.confidenceDeltaSummary) || fallback.confidenceDeltaSummary,
    priorityActions:
      output.priorityActions.map((item) => item.trim()).filter(Boolean).slice(0, 3).length > 0
        ? output.priorityActions.map((item) => normalizeUiCopy(item)).filter(Boolean).slice(0, 3)
        : fallback.priorityActions,
    riskCallout: normalizeUiCopy(output.riskCallout) || fallback.riskCallout,
    operatorNote: normalizeUiCopy(output.operatorNote) || fallback.operatorNote,
    disclaimer:
      source === "openai"
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
  source: "openai" | "fallback"
): HumanReviewManagerBrief {
  const fallback = fallbackManagerBrief(input);
  return humanReviewManagerBriefSchema.parse({
    ...fallback,
    source,
    managerSummary: normalizeUiCopy(output.managerSummary) || fallback.managerSummary,
    firstChecks:
      output.firstChecks.map((item) => item.trim()).filter(Boolean).slice(0, 4).length > 0
        ? output.firstChecks.map((item) => normalizeUiCopy(item)).filter(Boolean).slice(0, 4)
        : fallback.firstChecks,
    userReplyDraft: normalizeUiCopy(output.userReplyDraft) || fallback.userReplyDraft,
    escalationNote: normalizeUiCopy(output.escalationNote) || fallback.escalationNote,
    disclaimer:
      source === "openai"
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
    return sanitizeWhatIfBrief(input, parsed, "openai");
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
    return sanitizeManagerBrief(input, parsed, "openai");
  } catch {
    return fallbackManagerBrief(input);
  }
}
