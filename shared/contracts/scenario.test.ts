import { describe, expect, it } from "vitest";
import { scenarioCandidateSchema, scenarioLabPayloadSchema } from "./scenario";
import { trustSchema } from "./trust";

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

  it("uses scenario-lab.v2 for the breaking evidence-aware payload shape", () => {
    expect(
      scenarioLabPayloadSchema.safeParse({
        version: "scenario-lab.v1",
        caseId: "case",
        generatedAt: "2026-04-17T10:00:00.000Z",
        baseResult: {},
        issues: [],
        scenarios: [],
        recommendedScenarioId: null,
        noHelpfulScenarios: false,
        humanReviewEscalation: {
          required: false,
          title: "Ручная проверка не нужна",
          detail: "Есть рабочий автоматический сценарий.",
          triggeredBy: []
        }
      }).success
    ).toBe(false);
  });

  it("accepts every canonical trust freshness status in scenario candidates", () => {
    const freshnessValues = trustSchema.shape.freshnessStatus.options;

    for (const freshnessStatus of freshnessValues) {
      expect(
        scenarioCandidateSchema.safeParse({
          ...candidate,
          freshnessStatus,
          delta: {
            ...candidate.delta,
            freshnessStatus: {
              before: freshnessStatus,
              after: freshnessStatus,
              changed: false
            }
          }
        }).success
      ).toBe(true);
    }
  });
});
