import { describe, expect, it } from "vitest";
import { scenarioCandidateSchema } from "./scenario";

const candidate = {
  id: "documents-ready",
  type: "documents",
  title: "Добрать обязательные документы",
  summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
  recommended: true,
  safetyStatus: "safe_automatic",
  evidenceStatus: "valid",
  freshnessStatus: "fresh",
  blockingReason: null,
  humanReviewReason: null,
  nextAction: {
    type: "upload_missing_docs",
    priority: "blocking",
    label: "Перейти к документам",
    detail: "Закройте недостающий чеклист.",
    targetScreen: "documents",
    triggeredBy: ["documents_ready_count"]
  },
  comparison: {
    verdictBefore: "GO",
    verdictAfter: "GO",
    confidenceBefore: 0.74,
    confidenceAfter: 0.82,
    primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
    primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
    resolvedRisks: [],
    remainingRisks: [],
    documents: {
      readyCountBefore: 5,
      readyCountAfter: 7,
      requiredCount: 7,
      itemsToCollect: []
    },
    whyChanged: ["Чеклист становится полным."]
  },
  delta: {
    verdict: { before: "GO", after: "GO", changed: false },
    confidence: { before: 0.74, after: 0.82, delta: 0.08 },
    documents: {
      readyCountBefore: 5,
      readyCountAfter: 7,
      readyCountDelta: 2,
      requiredCountBefore: 7,
      requiredCountAfter: 7,
      scoreBefore: 0.71,
      scoreAfter: 1,
      scoreDelta: 0.29
    },
    risks: { resolved: [], added: [], remaining: [] },
    nextAction: {
      beforeType: "upload_missing_docs",
      afterType: "upload_missing_docs",
      beforeLabel: "Собрать документы",
      afterLabel: "Перейти к документам",
      changed: true
    },
    evidenceStatus: { before: "valid", after: "valid", changed: false },
    freshnessStatus: { before: "fresh", after: "fresh", changed: false },
    blockingReason: { before: null, after: null, changed: false },
    humanReviewReason: { before: null, after: null, changed: false }
  },
  plan: {
    headline: "После этого сценария следующий шаг — перейти к документам.",
    firstSteps: ["Подготовить страховку."],
    criticalSteps: ["Не отправлять заявку с неполным пакетом."],
    canWait: [],
    humanReviewRequired: false,
    humanReviewReason: null
  }
};

describe("scenarioCandidateSchema", () => {
  it("requires evidence-aware classification on canonical scenario candidates", () => {
    const legacyCandidate = { ...candidate };
    delete (legacyCandidate as Partial<typeof candidate>).safetyStatus;
    delete (legacyCandidate as Partial<typeof candidate>).evidenceStatus;
    delete (legacyCandidate as Partial<typeof candidate>).freshnessStatus;
    delete (legacyCandidate as Partial<typeof candidate>).blockingReason;
    delete (legacyCandidate as Partial<typeof candidate>).humanReviewReason;
    delete (legacyCandidate as Partial<typeof candidate>).delta;

    expect(scenarioCandidateSchema.safeParse(legacyCandidate).success).toBe(false);
    expect(scenarioCandidateSchema.safeParse(candidate).success).toBe(true);
  });
});
