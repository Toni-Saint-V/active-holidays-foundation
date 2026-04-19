import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  isInsuranceOffer,
  isResidencyOffer,
  isTravelOffer,
  recommendationDetailSchema,
  recommendationShortlistSchema,
  type Case,
  type Offer,
  type RecommendationDetail,
  type RecommendationFit,
  type RecommendationShortlist,
  type ResultPayload
} from "@shared/contracts";

const shortlistModelSchema = z.object({
  items: z
    .array(
      z.object({
        offerId: z.string().min(1),
        title: z.string().min(1),
        summary: z.string().min(1),
        fitReason: z.string().min(1),
        caution: z.string().min(1)
      })
    )
    .min(1)
    .max(3)
});

const detailModelSchema = recommendationDetailSchema.pick({
  title: true,
  summary: true,
  whyThisFits: true,
  watchouts: true,
  trustSignals: true
});

type NormalizedOffer = {
  offerId: string;
  title: string;
  description: string;
  facts: string[];
  blockers: string[];
  score: number;
  eligible: boolean;
};

let openaiClient: OpenAI | null | undefined;

export class RecommendationOfferNotFoundError extends Error {
  constructor(offerId: string) {
    super(`Offer ${offerId} is not part of the current recommendation shortlist.`);
  }
}

function getOpenAIClient(): OpenAI | null {
  if (openaiClient !== undefined) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  openaiClient = apiKey ? new OpenAI({ apiKey }) : null;
  return openaiClient;
}

export function resetRecommendationClientForTests(): void {
  openaiClient = undefined;
}

function recommendationModel(): string {
  return process.env.OPENAI_RECOMMENDATION_MODEL ?? "gpt-4o-mini";
}

function dedupeOffers(result: ResultPayload): Offer[] {
  const offers = [result.primaryPath, ...result.alternativePaths].filter(
    (offer): offer is Offer => offer !== null
  );
  const seen = new Set<string>();
  const unique: Offer[] = [];
  for (const offer of offers) {
    if (seen.has(offer.id)) continue;
    seen.add(offer.id);
    unique.push(offer);
    if (unique.length === 3) break;
  }
  return unique;
}

function formatMoneyRub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function normalizeOffer(offer: Offer): NormalizedOffer {
  if (isTravelOffer(offer)) {
    return {
      offerId: offer.id,
      title: offer.title,
      description: offer.description,
      facts: [
        `Срок оформления: ${offer.processingWeeks} нед.`,
        `Оценка стоимости: ${formatMoneyRub(offer.estCostRub)}`,
        `Требования: ${offer.requirements.map((item) => item.label).join(", ")}`
      ],
      blockers: offer.blockers.map((item) => item.text),
      score: offer.score,
      eligible: offer.eligible
    };
  }

  if (isResidencyOffer(offer)) {
    return {
      offerId: offer.id,
      title: offer.nameRu,
      description: offer.description,
      facts: [
        `Мин. доход: €${offer.minIncomeEur.toLocaleString("ru-RU")}/мес.`,
        `Срок обработки: ${offer.processingDays} дн.`,
        `Консульства: ${offer.consulateOptions.join(", ") || "нужно уточнение"}`
      ],
      blockers: offer.blockers.map((item) => item.text),
      score: offer.score,
      eligible: offer.eligible
    };
  }

  const includes = Object.entries(offer.includes)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  return {
    offerId: offer.id,
    title: `${offer.providerNameRu} · ${offer.productNameRu}`,
    description: offer.description,
    facts: [
      `Покрытие: €${offer.coverageAmountEur.toLocaleString("ru-RU")}`,
      `Цена: €${offer.pricePerDayEur.toLocaleString("ru-RU")}/день`,
      `Включено: ${includes.join(", ") || "базовое покрытие"}`
    ],
    blockers: offer.blockers.map((item) => item.text),
    score: offer.score,
    eligible: offer.eligible
  };
}

function fitForOffer(result: ResultPayload, offer: NormalizedOffer): RecommendationFit {
  if (result.primaryPath?.id === offer.offerId) return "best_match";
  if (!offer.eligible || offer.blockers.length > 0) return "watch";
  return "good_option";
}

function documentsWatchout(result: ResultPayload): string | null {
  if (result.documents.readyCount >= result.documents.requiredCount) return null;
  const missing = result.documents.items
    .filter((item) => item.status !== "ready")
    .slice(0, 2)
    .map((item) => item.label);
  return `Не готов полный пакет документов: ${missing.join(", ")}.`;
}

function shortlistDisclaimer(source: "openai" | "fallback"): string {
  if (source === "openai") {
    return "AI-слой объясняет текущий результат движка и не подменяет формальные требования.";
  }
  return "Карточки собраны без модели по текущему результату движка: используйте их как краткий разбор, а не как отдельный источник истины.";
}

function detailDisclaimer(source: "openai" | "fallback"): string {
  if (source === "openai") {
    return "Разбор основан только на текущем кейсе и расчёте движка Active Holidays.";
  }
  return "Разбор собран сервером без модели и опирается только на текущий расчёт движка.";
}

function deterministicRecommendedOfferId(
  result: ResultPayload,
  offers: NormalizedOffer[]
): string | null {
  return result.primaryPath?.id ?? offers[0]?.offerId ?? null;
}

function fallbackFitReason(
  offer: NormalizedOffer,
  fit: RecommendationFit
): string {
  if (fit === "best_match") {
    return `Этот вариант сейчас лучше всего согласован с результатом движка и score ${offer.score.toFixed(2)}.`;
  }
  if (fit === "good_option") {
    return `Это рабочая альтернатива с score ${offer.score.toFixed(2)}.`;
  }
  return "Вариант полезен для сравнения, но часть условий пока не проходит.";
}

function fallbackCaution(
  result: ResultPayload,
  offer: NormalizedOffer
): string {
  return (
    offer.blockers[0] ??
    result.criticalRisk?.detail ??
    documentsWatchout(result) ??
    result.risks[0]?.detail ??
    "Критичных сигналов сверху нет, но требования всё равно нужно сверять перед подачей."
  );
}

function deterministicDetailNextSteps(
  result: ResultPayload,
  fit: RecommendationFit
): string[] {
  if (fit !== "best_match") {
    return [
      "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта.",
      "Сверьте вердикт, confidence и основной путь в compare с базовым результатом.",
      "Действуйте только по блоку «Что делать после compare», а не по baseline-шагам."
    ];
  }

  return [
    result.nextAction.label,
    result.nextAction.detail,
    result.documents.readyCount < result.documents.requiredCount
      ? `Закройте недостающие документы: готово ${result.documents.readyCount} из ${result.documents.requiredCount}.`
      : "После проверки деталей можно переходить к следующему шагу."
  ].slice(0, 3);
}

function buildShortlistFallback(
  caseData: Case,
  result: ResultPayload,
  offers: NormalizedOffer[]
): RecommendationShortlist {
  const items = offers.map((offer, index) => {
    const fit = fitForOffer(result, offer);
    return {
      offerId: offer.offerId,
      rank: index + 1,
      fit,
      title: offer.title,
      summary: offer.description,
      fitReason: fallbackFitReason(offer, fit),
      caution: fallbackCaution(result, offer)
    };
  });

  return recommendationShortlistSchema.parse({
    version: "recommendation-ai.v1",
    caseId: caseData.id,
    generatedAt: new Date().toISOString(),
    basedOnComputedAt: result.computedAt,
    source: "fallback",
    recommendedOfferId: deterministicRecommendedOfferId(result, offers),
    items,
    disclaimer: shortlistDisclaimer("fallback")
  });
}

function buildDetailFallback(
  caseData: Case,
  result: ResultPayload,
  offer: NormalizedOffer
): RecommendationDetail {
  const fit = fitForOffer(result, offer);
  const watchouts = [
    ...offer.blockers,
    ...(result.criticalRisk ? [result.criticalRisk.detail] : []),
    ...(documentsWatchout(result) ? [documentsWatchout(result)] : [])
  ].filter(Boolean) as string[];

  const whyThisFits = [
    `Вариант ${fit === "best_match" ? "стоит первым" : "остаётся в shortlist"} в текущем результате движка.`,
    ...offer.facts.slice(0, 2)
  ].slice(0, 3);

  const nextSteps = deterministicDetailNextSteps(result, fit);

  const trustSignals = [
    `Вердикт движка: ${result.verdict}.`,
    `Уверенность движка: ${Math.round(result.trust.confidence * 100)}%.`,
    `Пересчёт результата: ${result.computedAt}.`
  ];

  return recommendationDetailSchema.parse({
    version: "recommendation-ai.v1",
    caseId: caseData.id,
    offerId: offer.offerId,
    generatedAt: new Date().toISOString(),
    basedOnComputedAt: result.computedAt,
    source: "fallback",
    fit,
    title: offer.title,
    summary: offer.description,
    whyThisFits,
    watchouts: watchouts.slice(0, 3).length > 0
      ? watchouts.slice(0, 3)
      : ["Отдельных критичных замечаний по этому варианту сейчас не видно, но требования нужно перепроверить перед действием."],
    nextSteps,
    trustSignals,
    disclaimer: detailDisclaimer("fallback")
  });
}

function modelContext(caseData: Case, result: ResultPayload, offers: NormalizedOffer[]) {
  return {
    case: {
      id: caseData.id,
      title: caseData.title,
      productType: caseData.productType
    },
    result: {
      verdict: result.verdict,
      confidence: Number(result.trust.confidence.toFixed(2)),
      computedAt: result.computedAt,
      nextAction: {
        label: result.nextAction.label,
        detail: result.nextAction.detail,
        targetScreen: result.nextAction.targetScreen
      },
      criticalRisk: result.criticalRisk?.detail ?? null,
      risks: result.risks.slice(0, 3).map((risk) => risk.detail),
      documents: {
        readyCount: result.documents.readyCount,
        requiredCount: result.documents.requiredCount,
        missing: result.documents.items
          .filter((item) => item.status !== "ready")
          .slice(0, 3)
          .map((item) => item.label)
      },
      whyBullets: result.whyBullets.slice(0, 4).map((item) => item.text)
    },
    candidates: offers
  };
}

function responseHasRefusal(response: { output: Array<{ type: string; content?: Array<{ type: string }> }> }): boolean {
  return response.output.some(
    (item) =>
      item.type === "message" &&
      item.content?.some((content) => content.type === "refusal")
  );
}

function shortlistInput(caseData: Case, result: ResultPayload, offers: NormalizedOffer[]): string {
  return JSON.stringify(
    {
      task: "Build a Russian shortlist for the Active Holidays recommendation flow.",
      rules: [
        "Use only candidate offerIds from the JSON.",
        "Do not choose primary/default order or fit labels. They are server-owned.",
        "Do not invent requirements, prices, deadlines, paths, risks, or screens.",
        "Keep every field concise and product-clear.",
        "If evidence is weak, make caution explicit."
      ],
      context: modelContext(caseData, result, offers)
    },
    null,
    2
  );
}

function detailInput(caseData: Case, result: ResultPayload, offer: NormalizedOffer): string {
  return JSON.stringify(
    {
      task: "Build a Russian detail view for one shortlisted recommendation.",
      rules: [
        "Use only facts from the JSON.",
        "Do not invent missing checks, policies, actions, or next steps.",
        "Keep bullets short and concrete.",
        "Mention uncertainty directly if the current result leaves a gap."
      ],
      context: {
        ...modelContext(caseData, result, [offer]),
        selectedOfferId: offer.offerId
      }
    },
    null,
    2
  );
}

function sanitizeShortlist(
  output: z.infer<typeof shortlistModelSchema>,
  caseData: Case,
  result: ResultPayload,
  offers: NormalizedOffer[]
): RecommendationShortlist {
  const modelItems = new Map<string, z.infer<typeof shortlistModelSchema>["items"][number]>();
  for (const item of output.items) {
    if (!offers.some((offer) => offer.offerId === item.offerId)) continue;
    if (modelItems.has(item.offerId)) continue;
    modelItems.set(item.offerId, item);
  }

  if (modelItems.size === 0) {
    return buildShortlistFallback(caseData, result, offers);
  }

  const items = offers.map((offer, index) => {
    const fit = fitForOffer(result, offer);
    const modelItem = modelItems.get(offer.offerId);
    return {
      offerId: offer.offerId,
      rank: index + 1,
      fit,
      title: modelItem?.title?.trim() || offer.title,
      summary: modelItem?.summary?.trim() || offer.description,
      fitReason: modelItem?.fitReason?.trim() || fallbackFitReason(offer, fit),
      caution: modelItem?.caution?.trim() || fallbackCaution(result, offer)
    };
  });

  return recommendationShortlistSchema.parse({
    version: "recommendation-ai.v1",
    caseId: caseData.id,
    generatedAt: new Date().toISOString(),
    basedOnComputedAt: result.computedAt,
    source: "openai",
    recommendedOfferId: deterministicRecommendedOfferId(result, offers),
    items,
    disclaimer: shortlistDisclaimer("openai")
  });
}

function sanitizeDetail(
  output: z.infer<typeof detailModelSchema>,
  caseData: Case,
  result: ResultPayload,
  offer: NormalizedOffer
): RecommendationDetail {
  const fit = fitForOffer(result, offer);
  return recommendationDetailSchema.parse({
    version: "recommendation-ai.v1",
    caseId: caseData.id,
    offerId: offer.offerId,
    generatedAt: new Date().toISOString(),
    basedOnComputedAt: result.computedAt,
    source: "openai",
    fit,
    title: output.title,
    summary: output.summary,
    whyThisFits: output.whyThisFits,
    watchouts: output.watchouts,
    nextSteps: deterministicDetailNextSteps(result, fit),
    trustSignals: output.trustSignals,
    disclaimer: detailDisclaimer("openai")
  });
}

export async function buildRecommendationShortlist(
  caseData: Case,
  result: ResultPayload
): Promise<RecommendationShortlist | null> {
  const offers = dedupeOffers(result).map(normalizeOffer);
  if (offers.length === 0) return null;

  const client = getOpenAIClient();
  if (!client) {
    return buildShortlistFallback(caseData, result, offers);
  }

  try {
    const response = await client.responses.create({
      model: recommendationModel(),
      input: [
        {
          role: "system",
          content:
            "Ты объясняешь recommendation flow в Active Holidays. Работай только по фактам из JSON. Весь ответ должен быть на русском. Не придумывай новые требования, маршруты, документы, цены, вероятности и действия."
        },
        {
          role: "user",
          content: shortlistInput(caseData, result, offers)
        }
      ],
      text: {
        format: zodTextFormat(shortlistModelSchema, "recommendation_shortlist")
      }
    });

    if (responseHasRefusal(response) || !response.output_text) {
      return buildShortlistFallback(caseData, result, offers);
    }

    const parsed = shortlistModelSchema.parse(JSON.parse(response.output_text));
    return sanitizeShortlist(parsed, caseData, result, offers);
  } catch {
    return buildShortlistFallback(caseData, result, offers);
  }
}

export async function buildRecommendationDetail(
  caseData: Case,
  result: ResultPayload,
  offerId: string
): Promise<RecommendationDetail> {
  const offer = dedupeOffers(result).map(normalizeOffer).find((item) => item.offerId === offerId);
  if (!offer) {
    throw new RecommendationOfferNotFoundError(offerId);
  }

  const client = getOpenAIClient();
  if (!client) {
    return buildDetailFallback(caseData, result, offer);
  }

  try {
    const response = await client.responses.create({
      model: recommendationModel(),
      input: [
        {
          role: "system",
          content:
            "Ты готовишь detail view для выбранной рекомендации Active Holidays. Работай только по JSON-контексту, пиши по-русски, коротко и честно. Не придумывай новые проверки, правила, преимущества или шаги."
        },
        {
          role: "user",
          content: detailInput(caseData, result, offer)
        }
      ],
      text: {
        format: zodTextFormat(detailModelSchema, "recommendation_detail")
      }
    });

    if (responseHasRefusal(response) || !response.output_text) {
      return buildDetailFallback(caseData, result, offer);
    }

    const parsed = detailModelSchema.parse(JSON.parse(response.output_text));
    return sanitizeDetail(parsed, caseData, result, offer);
  } catch {
    return buildDetailFallback(caseData, result, offer);
  }
}
