import { describe, expect, it } from "vitest";
import {
  derivePublicReadiness,
  derivePublicReadinessFromResult,
  publicReadinessStateSchema,
  publicReadinessInputFromResult,
  publicReadinessProjectionSchema,
  type PublicReadinessInput
} from "./publicReadiness";
import type { ResultPayload } from "./result";
import { verdictSchema } from "./verdict";

function createInput(overrides: Partial<PublicReadinessInput> = {}): PublicReadinessInput {
  return {
    verdict: "GO",
    primaryPathPresent: true,
    criticalRiskPresent: false,
    documents: {
      score: 1,
      blockedCount: 0,
      attentionNeededCount: 0
    },
    trust: {
      evidenceStatus: "valid",
      humanReviewReason: null,
      blockingReason: null
    },
    firedRuleOutputs: [],
    assumptionsCount: 0,
    ...overrides
  };
}

function createResultPayload(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "case-public-readiness",
    computedAt: "2026-05-02T00:00:00.000Z",
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "human_review",
      label: "Передать кейс эксперту",
      detail: "Автомат не может честно подтвердить маршрут.",
      targetScreen: "human-review",
      triggeredBy: ["evidence"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [
      {
        ruleId: "R_EVIDENCE",
        fired: true,
        category: "advisory",
        priority: 100,
        productType: "travel",
        output: { type: "human_review_trigger" },
        consumedSignals: [],
        explanation: "Источник требует ручной проверки."
      }
    ],
    documents: {
      score: 0.5,
      readyCount: 1,
      requiredCount: 2,
      items: [
        {
          id: "passport",
          label: "Паспорт",
          status: "ready",
          detail: "Документ готов.",
          pathId: null
        },
        {
          id: "insurance",
          label: "Страховка",
          status: "blocked",
          detail: "Нужен полис.",
          pathId: null
        }
      ]
    },
    trust: {
      confidence: 0.42,
      confidenceBreakdown: {
        value: 0.42,
        base: 0.42,
        capsApplied: [],
        factors: []
      },
      evidenceStatus: "missing",
      freshnessStatus: "unknown",
      blockingReason: null,
      humanReviewReason: "Evidence gate requires review.",
      volatilityScore: 0.3,
      sources: [],
      lastCheckedAt: "2026-05-02T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "case-public-readiness",
      startedAt: "2026-05-02T00:00:00.000Z",
      finishedAt: "2026-05-02T00:00:00.000Z",
      totalMs: 1,
      steps: [],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("public readiness contract", () => {
  it("defines exactly the six Product Canon public states", () => {
    expect(publicReadinessStateSchema.options).toEqual([
      "ready",
      "almost_ready",
      "not_ready_fixable",
      "not_ready_blocked",
      "needs_human_review",
      "insufficient_data"
    ]);
  });

  it("does not replace the canonical engine verdict enum", () => {
    expect(verdictSchema.options).toEqual([
      "GO",
      "GO_WITH_CONDITIONS",
      "NOT_NOW",
      "HUMAN_REVIEW"
    ]);
  });

  it("validates the derived projection shape at the contract boundary", () => {
    const projection = derivePublicReadiness(createInput());

    expect(publicReadinessProjectionSchema.safeParse(projection).success).toBe(true);
  });

  it("derives ready from a clean GO result", () => {
    expect(derivePublicReadiness(createInput()).state).toBe("ready");
  });

  it("derives almost_ready from GO_WITH_CONDITIONS with only attention-needed documents", () => {
    expect(
      derivePublicReadiness(
        createInput({
          verdict: "GO_WITH_CONDITIONS",
          documents: {
            score: 0.86,
            blockedCount: 0,
            attentionNeededCount: 1
          }
        })
      ).state
    ).toBe("almost_ready");
  });

  it("derives not_ready_fixable when the case can continue but has blocked documents", () => {
    expect(
      derivePublicReadiness(
        createInput({
          verdict: "GO_WITH_CONDITIONS",
          documents: {
            score: 0.57,
            blockedCount: 2,
            attentionNeededCount: 1
          }
        })
      ).state
    ).toBe("not_ready_fixable");
  });

  it("derives not_ready_blocked above human review when hard blockers are present", () => {
    expect(
      derivePublicReadiness(
        createInput({
          verdict: "HUMAN_REVIEW",
          criticalRiskPresent: true,
          firedRuleOutputs: ["human_review_trigger", "blocker"]
        })
      ).state
    ).toBe("not_ready_blocked");
  });

  it("derives needs_human_review when review is required and no higher blocker applies", () => {
    expect(
      derivePublicReadiness(
        createInput({
          verdict: "HUMAN_REVIEW",
          trust: {
            evidenceStatus: "missing",
            humanReviewReason: "Evidence gate requires review.",
            blockingReason: null
          },
          firedRuleOutputs: ["human_review_trigger"]
        })
      ).state
    ).toBe("needs_human_review");
  });

  it("derives insufficient_data before every other state when required intake data is missing", () => {
    expect(
      derivePublicReadiness(
        createInput({
          verdict: "HUMAN_REVIEW",
          assumptionsCount: 1,
          criticalRiskPresent: true,
          firedRuleOutputs: ["human_review_trigger", "blocker"]
        })
      ).state
    ).toBe("insufficient_data");
  });

  it("projects a real ResultPayload into the public readiness adapter", () => {
    const result = createResultPayload();

    expect(publicReadinessInputFromResult(result)).toMatchObject({
      verdict: "HUMAN_REVIEW",
      primaryPathPresent: false,
      documents: {
        score: 0.5,
        blockedCount: 1,
        attentionNeededCount: 0
      },
      firedRuleOutputs: ["human_review_trigger"]
    });
    expect(derivePublicReadinessFromResult(result).state).toBe("needs_human_review");
  });
});
