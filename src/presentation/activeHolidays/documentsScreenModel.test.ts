import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildDocumentsScreenModel } from "./documentsScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 0.6,
      readyCount: 3,
      requiredCount: 5,
      items: [
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        },
        {
          id: "insurance",
          label: "Страховка",
          status: "ready",
          detail: "Полис уже загружен.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.7,
      confidenceBreakdown: {
        value: 0.7,
        base: 0.7,
        capsApplied: [],
        factors: []
      },
      evidenceStatus: "valid",
      freshnessStatus: "fresh",
      blockingReason: null,
      humanReviewReason: null,
      volatilityScore: 0.1,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildDocumentsScreenModel", () => {
  it("builds readiness and next-step copy from result payload", () => {
    const model = buildDocumentsScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.readiness.badgeTone).toBe("warning");
    expect(model.requirements.items).toHaveLength(2);
    expect(model.nextStep.description).toBe("Закройте недостающий чеклист.");
  });

  it("switches to a review gate for human-review verdicts", () => {
    const model = buildDocumentsScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Документный трек откроет оператор");
    expect(model.gate?.actionLabel).toBe("Вернуться к ручной проверке");
  });
});
