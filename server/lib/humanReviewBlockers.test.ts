import { describe, expect, it } from "vitest";
import type { ResultPayload, Trust } from "@shared/contracts";
import { extractHumanReviewBlockers } from "./humanReviewBlockers";

function trust(overrides: Partial<Trust> = {}): Trust {
  return {
    confidence: 0,
    confidenceBreakdown: {
      value: 0,
      base: 0,
      capsApplied: ["manual_review"],
      factors: []
    },
    evidenceStatus: "conflicting",
    freshnessStatus: "fresh",
    blockingReason: "Источники конфликтуют по требованиям маршрута.",
    humanReviewReason: "Нужен ручной разбор конфликтующих источников.",
    volatilityScore: 0.9,
    sources: [],
    lastCheckedAt: "2026-04-30T10:00:00.000Z",
    ...overrides
  };
}

function result(computedAt: string): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "case_1",
    computedAt,
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "human_review",
      label: "Передать кейс менеджеру",
      detail: "Нужна ручная проверка.",
      targetScreen: "human-review",
      triggeredBy: []
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 0,
      readyCount: 0,
      requiredCount: 0,
      items: []
    },
    trust: trust(),
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "case_1",
      startedAt: computedAt,
      finishedAt: computedAt,
      totalMs: 0,
      steps: [],
      preview: false
    },
    preview: false
  };
}

describe("extractHumanReviewBlockers", () => {
  it("keeps trust fallback blocker ids stable across recomputes", () => {
    const first = extractHumanReviewBlockers(result("2026-04-30T10:00:00.000Z"))[0];
    const second = extractHumanReviewBlockers(result("2026-04-30T10:05:00.000Z"))[0];

    expect(first?.id).toBeTruthy();
    expect(first?.id).toBe(second?.id);
    expect(first?.id).not.toContain("2026-04-30T10:00:00.000Z");
    expect(first?.id).toContain("trust:case_1:conflicting");
  });
});
