import { describe, expect, it } from "vitest";
import type {
  CaseSignals,
  RuleResult,
  Source,
  TravelOffer
} from "@shared/contracts";
import {
  computeAmbiguity,
  computeConfidenceBreakdown,
  detectConflicts
} from "../confidence";
import { previewVerdict } from "../ai/livePreview";
import { resolveAction } from "../action";
import { generateWhy } from "./why";
import { computeVerdict } from "./verdict";
import { deriveRisks, pickCriticalRisk } from "../risk";

const NOW = "2026-04-17T09:00:00.000Z";

function buildTravelOffer(
  id: string,
  eligible: boolean
): TravelOffer {
  return {
    id,
    productType: "travel",
    title: `Маршрут ${id}`,
    kind: "visa_free",
    citizenship: "RU",
    destination: "IT",
    processingWeeks: 2,
    estCostRub: 25_000,
    description: "Тестовый маршрут.",
    requirements: [{ id: "passport", label: "Загранпаспорт", mandatory: true }],
    score: eligible ? 0.92 : 0.41,
    baseScore: eligible ? 0.82 : 0.31,
    ruleBoosts: [],
    blockers: eligible ? [] : [{ ruleId: "alt_blocker", text: "Альтернативный маршрут заблокирован." }],
    eligible
  };
}

const signals: CaseSignals = [
  { id: "citizenship", value: "RU", source: "user", capturedAt: NOW },
  { id: "destination", value: "IT", source: "user", capturedAt: NOW },
  { id: "travel_purpose", value: "tourism", source: "user", capturedAt: NOW },
  { id: "passport_validity_months", value: 18, source: "user", capturedAt: NOW },
  { id: "timeline_weeks", value: 6, source: "user", capturedAt: NOW }
];

const sources: Source[] = [
  {
    id: "consulate",
    label: "Консульство",
    url: "https://example.com/consulate",
    tier: "official",
    lastCheckedAt: NOW,
    volatilityScore: 0,
    summary: "Тестовый источник."
  }
];

const alternativePathRuleResults: RuleResult[] = [
  {
    ruleId: "alt_blocker",
    fired: true,
    category: "document",
    priority: 90,
    productType: "travel",
    output: {
      type: "blocker",
      severity: "critical",
      pathIds: ["alt_path"]
    },
    consumedSignals: ["destination"],
    explanation: "Альтернативный маршрут заблокирован: слот недоступен."
  },
  {
    ruleId: "alt_warning",
    fired: true,
    category: "timeline",
    priority: 80,
    productType: "travel",
    output: {
      type: "warning",
      severity: "medium",
      pathIds: ["alt_path"]
    },
    consumedSignals: ["timeline_weeks"],
    explanation: "Альтернативный маршрут под давлением по срокам."
  }
];

describe("path-scoped travel rules", () => {
  it("ignores blockers and warnings that only affect an alternative path", () => {
    const primary = buildTravelOffer("primary_path", true);
    const alternative = buildTravelOffer("alt_path", false);
    const conflicts = detectConflicts(alternativePathRuleResults, primary.id);
    const confidence = computeConfidenceBreakdown({
      signals,
      ruleResults: alternativePathRuleResults,
      sources,
      conflicts,
      productType: "travel",
      pathId: primary.id
    });
    const ambiguity = computeAmbiguity(
      alternativePathRuleResults,
      conflicts,
      primary.id
    );
    const verdict = computeVerdict({
      productType: "travel",
      signals,
      ruleResults: alternativePathRuleResults,
      rankedOffers: [primary, alternative],
      confidence,
      ambiguity,
      conflictCount: conflicts.count,
      pathId: primary.id
    });
    const risks = deriveRisks(alternativePathRuleResults, primary.id);
    const nextAction = resolveAction({
      productType: "travel",
      verdict,
      primary,
      criticalRisk: pickCriticalRisk(risks),
      ruleResults: alternativePathRuleResults,
      signals,
      pathId: primary.id
    });

    expect(confidence.capsApplied).not.toContain("active_blocker");
    expect(confidence.value).toBeGreaterThan(0.8);
    expect(ambiguity).toBe(0);
    expect(verdict).toBe("GO");
    expect(risks).toEqual([]);
    expect(nextAction.type).toBe("start_application");
    expect(nextAction.triggeredBy).toEqual(["primary_path"]);
    expect(
      confidence.factors.find((factor) => factor.id === "rule_coverage")?.value
    ).toBe(0);
    expect(generateWhy(alternativePathRuleResults, primary.id)).toEqual([]);
  });

  it("keeps intake preview clear when only an alternative path is blocked", () => {
    const preview = previewVerdict(
      {
        case: {
          id: "case_preview",
          title: "Preview",
          productType: "travel",
          createdAt: NOW,
          updatedAt: NOW,
          signals,
          overrides: [],
          preferences: [],
          forkedFrom: null
        },
        catalogs: {
          paths: [buildTravelOffer("primary_path", true), buildTravelOffer("alt_path", false)],
          visaRules: [
            {
              citizenship: "RU",
              destination: "IT",
              regime: "visa_free",
              maxStayDays: 90,
              processingWeeks: 0,
              feeEur: 0,
              registrationRequired: false,
              sourceId: "consulate",
              note: "Тестовое правило."
            }
          ],
          restrictions: [],
          sources,
          ruleEvidence: [
            {
              ruleId: "R12",
              countryOrScope: "RU->IT",
              sourceUrlOrRef: "repo:test:visa-free-cost",
              sourceKind: "internal_note",
              lastVerifiedAt: NOW,
              freshnessWindowDays: 30,
              automationClass: "safe_auto",
              evidenceStatus: "valid",
              rationale: "Test fixture covers the cost-prioritization rule evidence."
            },
            {
              ruleId: "R15",
              countryOrScope: "RU->IT",
              sourceUrlOrRef: "repo:test:seasonal-demand",
              sourceKind: "internal_note",
              lastVerifiedAt: NOW,
              freshnessWindowDays: 30,
              automationClass: "safe_auto",
              evidenceStatus: "valid",
              rationale: "Test fixture covers the seasonal-demand rule evidence."
            },
            {
              ruleId: "R11",
              countryOrScope: "RU->IT",
              sourceUrlOrRef: "repo:rule:R11",
              sourceKind: "internal_note",
              lastVerifiedAt: NOW,
              freshnessWindowDays: 30,
              automationClass: "safe_auto",
              evidenceStatus: "valid",
              rationale: "Test fixture covers the path-strategy rule evidence."
            }
          ],
          residencyPrograms: [],
          insuranceProducts: []
        }
      },
      {
        now: () => new Date(NOW)
      }
    );

    expect(preview.hasBlockingRule).toBe(false);
    expect(preview.hasHumanReviewTrigger).toBe(false);
  });
});
