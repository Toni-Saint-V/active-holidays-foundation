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
  const stepActions = candidatePlan.steps
    .slice(0, 3)
    .map((step) => `${step.label}: ${step.detail}`);
  const priorityActions =
    stepActions.length > 0
      ? stepActions
      : [
          candidatePlan.headline,
          candidatePlan.detail,
          "Откройте полный сценарий и следуйте только шагам из candidate-форка."
        ].slice(0, 3);

  const riskCallout =
    candidatePlan.escalationReason ??
    (comparison.delta.humanReviewChanged
      ? "После сдвига сценарий требует ручной проверки менеджером."
      : "Критичной эскалации не видно, но шаги нужно подтверждать через compare.");

  return recommendationWhatIfBriefSchema.parse({
    version: "recommendation-whatif-brief.v1",
    caseId: input.caseId,
    candidateCaseId: input.candidateCaseId,
    offerId: input.offerId,
    source: "fallback",
    generatedAt: new Date().toISOString(),
    headline: input.offerLabel
      ? `Если сместить маршрут в сторону «${input.offerLabel}»`
      : "Если сместить маршрут по альтернативному сценарию",
    verdictDeltaSummary: `${verdictLabel[baseline.verdict]} → ${verdictLabel[candidate.verdict]}`,
    confidenceDeltaSummary: `${formatPercent(baseline.confidence)} → ${formatPercent(candidate.confidence)} (${formatDelta(comparison.delta.confidenceDelta)})`,
    priorityActions,
    riskCallout,
    operatorNote:
      "AI-слой объясняет сдвиг, но финальное решение по сценарию подтверждает только детерминированный compare.",
    disclaimer:
      "Краткий разбор собран сервером без модели и опирается на текущий сравниваемый fork-сценарий."
  });
}

function fallbackManagerBrief(input: {
  caseData: Case;
  request: HumanReviewRequest;
  packet: HumanReviewCasePacket;
  operatorContext?: string;
}): HumanReviewManagerBrief {
  const checklist = input.packet.operatorChecklist
    .slice(0, 4)
    .map((item) => `${item.title}: ${item.detail}`);

  const note =
    input.packet.doNotAutoDecideNotes[0] ??
    "До решения оператора не обещать пользователю исход кейса.";

  const contextLine = input.operatorContext
    ? `Контекст от оператора: ${input.operatorContext}`
    : null;

  const replyDraft = [
    `Принял кейс ${input.caseData.id} в ручную проверку.`,
    `Причина: ${input.packet.reviewReason}`,
    input.packet.scenario
      ? `Сценарий: ${input.packet.scenario.title}. Следующий шаг: ${input.packet.scenario.nextActionLabel}.`
      : `Следующий шаг из текущего вердикта: ${input.packet.currentResult.nextAction.label}.`,
    "Сверю документы и evidence-блокеры, вернусь с точным статусом после ручной проверки."
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
      `Кейс ${input.caseData.title} ушёл в ручную проверку.`,
      `Evidence: ${input.packet.evidence.evidenceStatus}/${input.packet.evidence.freshnessStatus}.`,
      `Вердикт сейчас: ${verdictLabel[input.packet.currentResult.verdict]}.`,
      contextLine
    ]
      .filter(Boolean)
      .join(" "),
    firstChecks: checklist.length > 0 ? checklist : [input.packet.reviewReason],
    userReplyDraft: replyDraft,
    escalationNote: note,
    disclaimer:
      "Пакет менеджера собран без модели и опирается на текущий human-review packet движка."
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
      task: "Собери короткий manager packet для ручной проверки кейса Active Holidays.",
      rules: [
        "Пиши только по фактам JSON и только по-русски.",
        "Не придумывай новые причины, проверки, обещания, SLA или исходы.",
        "Сформируй: краткий summary, список first checks, черновик ответа пользователю, escalation note."
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
    headline: output.headline.trim() || fallback.headline,
    verdictDeltaSummary: output.verdictDeltaSummary.trim() || fallback.verdictDeltaSummary,
    confidenceDeltaSummary:
      output.confidenceDeltaSummary.trim() || fallback.confidenceDeltaSummary,
    priorityActions:
      output.priorityActions.map((item) => item.trim()).filter(Boolean).slice(0, 3).length > 0
        ? output.priorityActions.map((item) => item.trim()).filter(Boolean).slice(0, 3)
        : fallback.priorityActions,
    riskCallout: output.riskCallout.trim() || fallback.riskCallout,
    operatorNote: output.operatorNote.trim() || fallback.operatorNote,
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
    managerSummary: output.managerSummary.trim() || fallback.managerSummary,
    firstChecks:
      output.firstChecks.map((item) => item.trim()).filter(Boolean).slice(0, 4).length > 0
        ? output.firstChecks.map((item) => item.trim()).filter(Boolean).slice(0, 4)
        : fallback.firstChecks,
    userReplyDraft: output.userReplyDraft.trim() || fallback.userReplyDraft,
    escalationNote: output.escalationNote.trim() || fallback.escalationNote,
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
            "Ты объясняешь what-if сравнение в Active Holidays. Работай только по фактам JSON. Пиши коротко, по-русски и без обещаний исхода."
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
            "Ты помощник оператора Active Holidays. Собирай manager brief только по JSON-фактам, по-русски, без обещаний результата кейса."
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
