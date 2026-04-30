import { describe, expect, it } from "vitest";
import type { RuleEvidenceRecord, Source } from "@shared/contracts";
import { evaluateRuleEvidence } from "./evaluate";

const NOW = new Date("2026-04-29T09:00:00.000Z");

function record(
  overrides: Partial<RuleEvidenceRecord> = {}
): RuleEvidenceRecord {
  return {
    ruleId: "R17",
    countryOrScope: "product:residency_es",
    sourceUrlOrRef: "src_spain_uge",
    sourceKind: "official",
    lastVerifiedAt: "2026-04-23T12:25:00.000Z",
    freshnessWindowDays: 14,
    automationClass: "safe_auto",
    evidenceStatus: "valid",
    rationale: "Repo source supports this rule assumption.",
    ...overrides
  };
}

function source(overrides: Partial<Source> = {}): Source {
  return {
    id: "src_spain_uge",
    label: "Official source",
    url: "https://example.com/source",
    tier: "official",
    lastCheckedAt: "2026-04-23T12:25:00.000Z",
    volatilityScore: 0.1,
    summary: "Official source fixture.",
    ...overrides
  };
}

describe("evaluateRuleEvidence", () => {
  it("keeps fresh safe-auto evidence valid", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [record()],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("valid");
    expect(decision.automationClass).toBe("safe_auto");
    expect(decision.blocksAutomation).toBe(false);
  });

  it("classifies stale evidence deterministically from lastVerifiedAt and freshnessWindowDays", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [
        record({
          lastVerifiedAt: "2026-03-01T00:00:00.000Z",
          freshnessWindowDays: 7
        })
      ],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("stale");
    expect(decision.blocksAutomation).toBe(true);
  });

  it("uses stricter referenced-source freshness when rule evidence points to a source id", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [record({ freshnessWindowDays: 30 })],
      sources: [
        source({
          lastCheckedAt: "2026-04-16T09:00:00.000Z",
          tier: "official"
        })
      ],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("stale");
    expect(decision.blocksAutomation).toBe(true);
  });

  it("reports the canonical source tier when catalog metadata differs from record metadata", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [record({ sourceKind: "official" })],
      sources: [source({ tier: "operator" })],
      now: NOW
    });

    expect(decision.sourceKind).toBe("operator");
  });

  it("fails closed when external evidence points to a missing source id", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [record({ sourceUrlOrRef: "src_missing_external_source" })],
      sources: [source()],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("missing");
    expect(decision.blocksAutomation).toBe(true);
  });

  it("prefers exact-scope evidence over global fallback evidence", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [
        record({
          countryOrScope: "global",
          lastVerifiedAt: "2026-03-01T00:00:00.000Z",
          freshnessWindowDays: 7
        }),
        record()
      ],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("valid");
    expect(decision.blocksAutomation).toBe(false);
  });

  it("classifies absent evidence as missing", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("missing");
    expect(decision.blocksAutomation).toBe(true);
  });

  it("classifies explicit conflicts as conflicting", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [record({ evidenceStatus: "conflicting" })],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("conflicting");
    expect(decision.blocksAutomation).toBe(true);
  });

  it("uses the strongest unsafe status when matching evidence records disagree", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [
        record(),
        record({
          sourceUrlOrRef: "src_spain_conflict",
          evidenceStatus: "conflicting",
          rationale: "A second source contradicts the original rule assumption."
        }),
        record({
          lastVerifiedAt: "2026-03-01T00:00:00.000Z",
          freshnessWindowDays: 7
        })
      ],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("conflicting");
    expect(decision.blocksAutomation).toBe(true);
    expect(decision.sourceUrlOrRef).toBe("src_spain_conflict");
    expect(decision.rationale).toBe("A second source contradicts the original rule assumption.");
  });

  it("attributes stale decisions to the stale matching evidence record", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [
        record({
          sourceUrlOrRef: "src_spain_fresh",
          rationale: "Fresh source is still valid."
        }),
        record({
          sourceUrlOrRef: "src_spain_stale",
          lastVerifiedAt: "2026-03-01T00:00:00.000Z",
          freshnessWindowDays: 7,
          rationale: "This stale source requires manual review."
        })
      ],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("stale");
    expect(decision.sourceUrlOrRef).toBe("src_spain_stale");
    expect(decision.lastVerifiedAt).toBe("2026-03-01T00:00:00.000Z");
    expect(decision.rationale).toBe("This stale source requires manual review.");
  });

  it("blocks assisted evidence even when the source is fresh and valid", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [record({ automationClass: "assisted" })],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("valid");
    expect(decision.automationClass).toBe("assisted");
    expect(decision.blocksAutomation).toBe(true);
  });

  it("classifies manual-only evidence as manual_only", () => {
    const decision = evaluateRuleEvidence({
      ruleId: "R17",
      countryOrScope: "product:residency_es",
      records: [
        record({
          automationClass: "manual_only",
          evidenceStatus: "manual_only",
          sourceKind: "internal_note",
          sourceUrlOrRef: "repo:manual-review-required"
        })
      ],
      now: NOW
    });

    expect(decision.evidenceStatus).toBe("manual_only");
    expect(decision.automationClass).toBe("manual_only");
    expect(decision.blocksAutomation).toBe(true);
  });
});
