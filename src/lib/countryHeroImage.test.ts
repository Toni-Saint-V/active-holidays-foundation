import { describe, expect, it } from "vitest";
import type { Case, ResultPayload, SignalRecord } from "@shared/contracts";
import {
  resolveCountryHeroImage,
  resolveResultDestinationCountry
} from "./countryHeroImage";

function createCase(signals: SignalRecord[]): Case {
  return {
    id: "s1-rf-italy",
    title: "S1",
    productType: "travel",
    createdAt: "2026-05-08T00:00:00.000Z",
    updatedAt: "2026-05-08T00:00:00.000Z",
    signals,
    overrides: [],
    preferences: [],
    forkedFrom: null
  };
}

function createTravelResult(destination: string): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-05-08T00:00:00.000Z",
    verdict: "GO_WITH_CONDITIONS",
    primaryPath: {
      id: "travel-path",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination,
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной путь",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.82,
      baseScore: 0.8,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Дальше",
      detail: "Деталь",
      targetScreen: "documents",
      triggeredBy: ["path"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 0.5,
      readyCount: 1,
      requiredCount: 2,
      items: []
    },
    trust: {
      confidence: 0.6,
      confidenceBreakdown: {
        value: 0.6,
        base: 0.6,
        factors: [],
        capsApplied: []
      },
      evidenceStatus: "valid",
      freshnessStatus: "fresh",
      blockingReason: null,
      humanReviewReason: null,
      volatilityScore: 0.2,
      sources: [],
      lastCheckedAt: "2026-05-08T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-05-08T00:00:00.000Z",
      finishedAt: "2026-05-08T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "collectSignals",
          tookMs: 1.2,
          inputsSummary: "signals",
          outputSummary: "ok",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false
  };
}

describe("countryHeroImage", () => {
  it("maps allowed countries to landmark images", () => {
    expect(resolveCountryHeroImage("IT")).toBe("/photos/landmark-it.webp");
    expect(resolveCountryHeroImage("ES")).toBe("/photos/landmark-es.webp");
    expect(resolveCountryHeroImage("FR")).toBe("/photos/landmark-fr.webp");
    expect(resolveCountryHeroImage("GR")).toBe("/photos/landmark-gr.webp");
  });

  it("returns null for unsupported country", () => {
    expect(resolveCountryHeroImage("DE")).toBeNull();
    expect(resolveCountryHeroImage(null)).toBeNull();
  });

  it("resolves destination from primary path first", () => {
    const result = createTravelResult("ES");
    const caseData = createCase([
      {
        id: "destination",
        value: "IT",
        source: "seed",
        capturedAt: "2026-05-08T00:00:00.000Z"
      }
    ]);

    expect(resolveResultDestinationCountry(result, caseData)).toBe("ES");
  });

  it("falls back to case destination signal when primary path is missing", () => {
    const result = {
      ...createTravelResult("IT"),
      primaryPath: null
    };
    const caseData = createCase([
      {
        id: "destination",
        value: "GR",
        source: "seed",
        capturedAt: "2026-05-08T00:00:00.000Z"
      }
    ]);

    expect(resolveResultDestinationCountry(result, caseData)).toBe("GR");
  });
});
