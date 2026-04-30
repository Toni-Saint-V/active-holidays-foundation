import { describe, expect, it } from "vitest";
import type {
  Case,
  HumanReviewTrustCalibration,
  RuleEvidenceRecord,
  Source
} from "@shared/contracts";
import type { OrchestratorCatalogs } from "./orchestrator";
import {
  fingerprintCase,
  fingerprintCatalogs,
  fingerprintResult,
  hash,
  projectResultForFingerprint
} from "./fingerprint";
import { runDecision } from "./orchestrator";
import { loadCatalogs } from "../../../server/lib/catalogs";

const NOW = "2026-04-17T09:00:00.000Z";

function buildCase(): Case {
  return {
    id: "fp_case_1",
    title: "Fingerprint case",
    productType: "travel",
    createdAt: NOW,
    updatedAt: NOW,
    signals: [
      { id: "citizenship", value: "RU", source: "user", capturedAt: NOW },
      { id: "destination", value: "IT", source: "user", capturedAt: NOW },
      { id: "travel_purpose", value: "tourism", source: "user", capturedAt: NOW },
      { id: "passport_validity_months", value: 18, source: "user", capturedAt: NOW }
    ],
    overrides: [],
    preferences: [],
    forkedFrom: null
  };
}

function toOrchestrator(
  catalogs: Awaited<ReturnType<typeof loadCatalogs>>
): OrchestratorCatalogs {
  return {
    paths: catalogs.paths,
    visaRules: catalogs.visaRules,
    restrictions: catalogs.restrictions,
    sources: catalogs.sources,
    ruleEvidence: catalogs.ruleEvidence,
    residencyPrograms: catalogs.residencyPrograms,
    insuranceProducts: catalogs.insuranceProducts
  };
}

describe("hash() canonicalization", () => {
  it("is invariant under object key order", () => {
    expect(hash({ a: 1, b: 2, c: 3 })).toBe(hash({ c: 3, b: 2, a: 1 }));
  });

  it("rounds floats so equivalent representations hash equally", () => {
    expect(hash({ v: 0.1 + 0.2 })).toBe(hash({ v: 0.3 }));
  });

  it("distinguishes semantically different values", () => {
    expect(hash({ a: 1 })).not.toBe(hash({ a: 2 }));
  });
});

describe("fingerprintCase", () => {
  it("is stable regardless of signal input order", () => {
    const original = buildCase();
    const reordered: Case = {
      ...original,
      signals: [...original.signals].reverse()
    };
    expect(fingerprintCase(original)).toBe(fingerprintCase(reordered));
  });

  it("flips when a signal value changes", () => {
    const original = buildCase();
    const changed: Case = {
      ...original,
      signals: original.signals.map((signal) =>
        signal.id === "passport_validity_months"
          ? { ...signal, value: 6 }
          : signal
      )
    };
    expect(fingerprintCase(original)).not.toBe(fingerprintCase(changed));
  });

  it("is stable when only volatile timestamps change (resubmit of the same case)", () => {
    const original = buildCase();
    const REFRESHED_CAPTURED = "2027-09-11T14:30:00.000Z";
    const refreshed: Case = {
      ...original,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2027-09-11T15:00:00.000Z",
      signals: original.signals.map((signal) => ({
        ...signal,
        capturedAt: REFRESHED_CAPTURED
      })),
      overrides: [
        {
          signalId: "timeline_weeks",
          value: 6,
          reason: "manual tweak",
          appliedAt: "2026-04-17T10:00:00.000Z"
        }
      ]
    };
    const rerecorded: Case = {
      ...refreshed,
      updatedAt: "2099-12-31T23:59:59.000Z",
      signals: refreshed.signals.map((signal) => ({
        ...signal,
        capturedAt: "2099-12-31T23:59:59.000Z"
      })),
      overrides: refreshed.overrides.map((override) => ({
        ...override,
        appliedAt: "2099-12-31T23:59:59.000Z"
      }))
    };
    expect(fingerprintCase(refreshed)).toBe(fingerprintCase(rerecorded));
  });
});

describe("fingerprintCatalogs", () => {
  it("is stable when volatile source fields change", async () => {
    const catalogs = toOrchestrator(await loadCatalogs());
    const drifted: OrchestratorCatalogs = {
      ...catalogs,
      sources: catalogs.sources.map<Source>((source) => ({
        ...source,
        lastCheckedAt: "2099-01-01T00:00:00.000Z"
      }))
    };
    expect(fingerprintCatalogs(catalogs)).toBe(fingerprintCatalogs(drifted));
  });

  it("flips when a path definition is removed", async () => {
    const base = toOrchestrator(await loadCatalogs());
    const lighter: OrchestratorCatalogs = {
      ...base,
      paths: base.paths.slice(1)
    };
    expect(fingerprintCatalogs(base)).not.toBe(fingerprintCatalogs(lighter));
  });

  it("flips when source array order is identical but a source label changes", async () => {
    const base = toOrchestrator(await loadCatalogs());
    const nudged: OrchestratorCatalogs = {
      ...base,
      sources: base.sources.map((source, index) =>
        index === 0 ? { ...source, label: `${source.label}*` } : source
      )
    };
    expect(fingerprintCatalogs(base)).not.toBe(fingerprintCatalogs(nudged));
  });

  it("is stable when same-scope rule evidence records are reordered", async () => {
    const base = toOrchestrator(await loadCatalogs());
    const first: RuleEvidenceRecord = {
      ruleId: "R_MULTI",
      countryOrScope: "global",
      sourceUrlOrRef: "src_a",
      sourceKind: "official",
      lastVerifiedAt: "2026-04-17T09:00:00.000Z",
      freshnessWindowDays: 14,
      automationClass: "safe_auto",
      evidenceStatus: "valid",
      rationale: "First source."
    };
    const second: RuleEvidenceRecord = {
      ...first,
      sourceUrlOrRef: "src_b",
      sourceKind: "operator",
      rationale: "Second source."
    };
    const left: OrchestratorCatalogs = {
      ...base,
      ruleEvidence: [first, second]
    };
    const right: OrchestratorCatalogs = {
      ...base,
      ruleEvidence: [second, first]
    };

    expect(fingerprintCatalogs(left)).toBe(fingerprintCatalogs(right));
  });

  it("keeps empty human-review calibrations compatible with historical catalog fingerprints", async () => {
    const base = toOrchestrator(await loadCatalogs());
    expect(fingerprintCatalogs(base)).toBe(
      fingerprintCatalogs({ ...base, humanReviewCalibrations: [] })
    );
  });

  it("flips when a real human-review calibration is present", async () => {
    const base = toOrchestrator(await loadCatalogs());
    const calibration: HumanReviewTrustCalibration = {
      version: "human-review-trust-calibration.v1",
      calibrationId: "hrc_case_1",
      eventId: "hrl_case_1_2026-05-01T08:00:00.000Z",
      requestId: "hr_case_1",
      caseId: "case_1",
      rootCause: "stale_evidence",
      action: "fail_closed_until_evidence_refresh",
      status: "active",
      evidenceStatus: "stale",
      freshnessStatus: "stale",
      confidenceDelta: 0,
      applyToFutureAutomation: true,
      reason: "Оставить fail-closed до обновления источников.",
      createdAt: "2026-05-01T08:00:00.000Z",
      sourceCatalogMutation: {
        allowed: false,
        applied: false
      }
    };

    expect(fingerprintCatalogs(base)).not.toBe(
      fingerprintCatalogs({ ...base, humanReviewCalibrations: [calibration] })
    );
  });
});

describe("fingerprintResult", () => {
  it("is stable across different audit timing fields", async () => {
    const catalogs = await loadCatalogs();
    const orchestrator = toOrchestrator(catalogs);
    const caseData = catalogs.cases.find((entry) => entry.id === "s1-rf-italy");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const first = runDecision({ case: caseData, catalogs: orchestrator });
    const second = runDecision({ case: caseData, catalogs: orchestrator });

    expect(fingerprintResult(first)).toBe(fingerprintResult(second));

    // Sanity-check: projection zeroes out tookMs / startedAt / finishedAt.
    const projected = projectResultForFingerprint(first);
    expect(projected.auditTrail.startedAt).toBe("normalized");
    expect(projected.auditTrail.totalMs).toBe(0);
  });
});
