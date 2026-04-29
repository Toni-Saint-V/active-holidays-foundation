import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildTrustScreenModel } from "./trustScreenModel";

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
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить дальше.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 1,
      readyCount: 5,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.83,
      confidenceBreakdown: {
        value: 0.83,
        base: 0.83,
        capsApplied: [],
        factors: []
      },
      evidenceStatus: "valid",
      freshnessStatus: "fresh",
      blockingReason: null,
      humanReviewReason: null,
      volatilityScore: 0.14,
      sources: [
        {
          id: "src_consulate",
          label: "Консульство",
          url: "https://example.com/consulate",
          tier: "official",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.1
        },
        {
          id: "src_operator",
          label: "Оператор",
          url: "https://example.com/operator",
          tier: "operator",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.2
        }
      ],
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

describe("buildTrustScreenModel", () => {
  it("adds stable source summaries and volatility copy", () => {
    const model = buildTrustScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.hero.badgeTone).toBe("positive");
    expect(model.sourcesSection.items[0]?.summary).toContain("Официальный источник");
    expect(model.sourcesSection.volatilityLabel).toContain("14%");
  });

  it("blocks trust details for human-review verdicts", () => {
    const model = buildTrustScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Доверие уточнит оператор");
  });
});
