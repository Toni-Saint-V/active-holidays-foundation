import { describe, expect, it } from "vitest";
import type { OrchestratorCatalogs } from "./orchestrator";
import { loadCatalogs } from "../../../server/lib/catalogs";
import { runDecision } from "./orchestrator";
import { buildScenarioEvidenceCoverage } from "../evidence/scenarioCoverage";

function staleR17Catalogs(catalogs: OrchestratorCatalogs): OrchestratorCatalogs {
  return {
    ...catalogs,
    ruleEvidence: catalogs.ruleEvidence.map((record) =>
      record.ruleId === "R17"
        ? {
            ...record,
            lastVerifiedAt: "2026-03-01T00:00:00.000Z",
            freshnessWindowDays: 7
          }
        : record
    )
  };
}

function r17EvidenceCatalogs(
  catalogs: OrchestratorCatalogs,
  overrides: Partial<OrchestratorCatalogs["ruleEvidence"][number]>
): OrchestratorCatalogs {
  return {
    ...catalogs,
    ruleEvidence: catalogs.ruleEvidence.map((record) =>
      record.ruleId === "R17" ? { ...record, ...overrides } : record
    )
  };
}

function r12EvidenceCatalogs(
  catalogs: OrchestratorCatalogs,
  overrides: Partial<OrchestratorCatalogs["ruleEvidence"][number]>
): OrchestratorCatalogs {
  return {
    ...catalogs,
    ruleEvidence: catalogs.ruleEvidence.map((record) =>
      record.ruleId === "R12" ? { ...record, ...overrides } : record
    )
  };
}

function withOnlyAlfaInsuranceFresh(catalogs: OrchestratorCatalogs): OrchestratorCatalogs {
  const insuranceSourceIds = new Set([
    "src_alfa_insurance",
    "src_ingos",
    "src_rosgosstrakh",
    "src_sogaz",
    "src_tinkoff"
  ]);
  return {
    ...catalogs,
    sources: catalogs.sources.map((source) =>
      insuranceSourceIds.has(source.id)
        ? {
            ...source,
            lastCheckedAt:
              source.id === "src_alfa_insurance"
                ? "2026-04-28T09:00:00.000Z"
                : "2026-03-01T09:00:00.000Z"
          }
        : source
    )
  };
}

function withAlfaFreshAtBoundary(catalogs: OrchestratorCatalogs): OrchestratorCatalogs {
  const next = withOnlyAlfaInsuranceFresh(catalogs);
  return {
    ...next,
    sources: next.sources.map((source) =>
      source.id === "src_alfa_insurance"
        ? { ...source, lastCheckedAt: "2026-04-24T09:00:00.000Z" }
        : source
    )
  };
}

function withStaleSource(
  catalogs: OrchestratorCatalogs,
  sourceId: string
): OrchestratorCatalogs {
  return {
    ...catalogs,
    sources: catalogs.sources.map((source) =>
      source.id === sourceId
        ? { ...source, lastCheckedAt: "2026-03-01T09:00:00.000Z" }
        : source
    )
  };
}

describe("evidence gate in the real verdict pipeline", () => {
  it("routes a stale-evidence GO candidate to human review", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s4-rf-residency-dnv");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({
      case: caseData,
      catalogs: staleR17Catalogs(catalogs)
    });

    expect(result.verdict).toBe("HUMAN_REVIEW");
    expect(result.nextAction.type).toBe("send_for_review");
    expect(result.ruleResults.map((rule) => rule.ruleId)).toContain("EVIDENCE_GATE:R17");
    expect(result.ruleResults.find((rule) => rule.ruleId === "EVIDENCE_GATE:R17")?.explanation)
      .toContain("stale");
    expect(result.trust.confidence).toBe(0);
  });

  it("applies scoped evidence calibration only while the evidence gate target still blocks", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s4-rf-residency-dnv");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const calibration = {
      version: "human-review-trust-calibration.v1" as const,
      calibrationId: "hrc_r17_stale",
      eventId: "hrl_r17_stale",
      requestId: "hr_r17_stale",
      caseId: caseData.id,
      rootCause: "stale_evidence" as const,
      action: "fail_closed_until_evidence_refresh" as const,
      status: "active" as const,
      evidenceStatus: "stale" as const,
      freshnessStatus: "stale" as const,
      target: {
        type: "evidence_gap" as const,
        gapIds: ["audit-only-gap-id"],
        ruleIds: ["R17"]
      },
      confidenceDelta: 0,
      applyToFutureAutomation: true,
      reason: "Оператор ранее закрыл stale evidence по R17.",
      createdAt: "2026-04-30T10:00:00.000Z",
      sourceCatalogMutation: {
        allowed: false as const,
        applied: false as const
      }
    };

    const blocked = runDecision({
      case: caseData,
      catalogs: {
        ...staleR17Catalogs(catalogs),
        humanReviewCalibrations: [calibration]
      }
    });
    expect(blocked.ruleResults.map((rule) => rule.ruleId)).toContain(
      "HUMAN_REVIEW_CALIBRATION:hrc_r17_stale"
    );

    const refreshed = runDecision({
      case: caseData,
      catalogs: {
        ...catalogs,
        humanReviewCalibrations: [calibration]
      }
    });
    expect(refreshed.ruleResults.map((rule) => rule.ruleId)).not.toContain(
      "HUMAN_REVIEW_CALIBRATION:hrc_r17_stale"
    );
  });

  it("applies trust-state calibration only while the case evidence state remains unsafe", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s4-rf-residency-dnv");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const calibration = {
      version: "human-review-trust-calibration.v1" as const,
      calibrationId: "hrc_trust_missing",
      eventId: "hrl_trust_missing",
      requestId: "hr_trust_missing",
      caseId: caseData.id,
      rootCause: "missing_evidence" as const,
      action: "fail_closed_until_evidence_refresh" as const,
      status: "active" as const,
      evidenceStatus: "missing" as const,
      freshnessStatus: "unknown" as const,
      target: {
        type: "trust_state" as const,
        blockerId: "trust:s4-rf-residency-dnv:missing:review",
        evidenceStatus: "missing" as const,
        freshnessStatus: "unknown" as const
      },
      confidenceDelta: 0,
      applyToFutureAutomation: true,
      reason: "Оператор закрыл trust-only блокировку без rule-level evidence target.",
      createdAt: "2026-04-30T10:00:00.000Z",
      sourceCatalogMutation: {
        allowed: false as const,
        applied: false as const
      }
    };

    const missing = runDecision({
      case: caseData,
      catalogs: {
        ...catalogs,
        ruleEvidence: catalogs.ruleEvidence.filter((record) => record.ruleId !== "R17"),
        humanReviewCalibrations: [calibration]
      }
    });
    expect(missing.ruleResults.map((rule) => rule.ruleId)).toContain(
      "HUMAN_REVIEW_CALIBRATION:hrc_trust_missing"
    );

    const refreshed = runDecision({
      case: caseData,
      catalogs: {
        ...catalogs,
        humanReviewCalibrations: [calibration]
      }
    });
    expect(refreshed.ruleResults.map((rule) => rule.ruleId)).not.toContain(
      "HUMAN_REVIEW_CALIBRATION:hrc_trust_missing"
    );
  });

  it("routes a missing-evidence GO candidate to human review", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s4-rf-residency-dnv");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({
      case: caseData,
      catalogs: {
        ...catalogs,
        ruleEvidence: catalogs.ruleEvidence.filter((record) => record.ruleId !== "R17")
      }
    });

    expect(result.verdict).toBe("HUMAN_REVIEW");
    expect(result.nextAction.priority).toBe("human_review");
    expect(result.nextAction.type).toBe("send_for_review");
    expect(result.ruleResults.find((rule) => rule.ruleId === "EVIDENCE_GATE:R17")?.explanation)
      .toContain("missing");
    expect(result.trust.confidence).toBe(0);
  });

  it("routes a stale referenced-source candidate to human review", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s2-tr-spb");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision(
      {
        case: caseData,
        catalogs: withStaleSource(
          r12EvidenceCatalogs(catalogs, {
            evidenceStatus: "valid",
            rationale: "Test fixture: valid evidence with stale source freshness."
          }),
          "src_russia_mfa_tr"
        )
      },
      {
        now: () => new Date("2026-04-29T09:00:00.000Z")
      }
    );

    expect(result.verdict).toBe("HUMAN_REVIEW");
    expect(result.nextAction.type).toBe("send_for_review");
    expect(result.ruleResults.find((rule) => rule.ruleId === "EVIDENCE_GATE:R12")?.explanation)
      .toContain("stale");
    expect(result.trust.confidence).toBe(0);
  });

  it("routes a conflicting-evidence GO candidate to human review", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s4-rf-residency-dnv");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({
      case: caseData,
      catalogs: r17EvidenceCatalogs(catalogs, {
        evidenceStatus: "conflicting",
        rationale: "External source contradicts the current DNV eligibility assumption."
      })
    });

    expect(result.verdict).toBe("HUMAN_REVIEW");
    expect(result.nextAction.type).toBe("send_for_review");
    expect(result.ruleResults.find((rule) => rule.ruleId === "EVIDENCE_GATE:R17")?.explanation)
      .toContain("conflicting");
    expect(result.trust.confidence).toBe(0);
  });

  it("routes a manual-only GO candidate to human review", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s4-rf-residency-dnv");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({
      case: caseData,
      catalogs: r17EvidenceCatalogs(catalogs, {
        automationClass: "manual_only",
        evidenceStatus: "manual_only",
        sourceKind: "internal_note",
        sourceUrlOrRef: "repo:manual-review-required:R17",
        rationale: "Eligibility changed to manual-only until a human validates the source."
      })
    });

    expect(result.verdict).toBe("HUMAN_REVIEW");
    expect(result.nextAction.priority).toBe("human_review");
    expect(result.nextAction.type).toBe("send_for_review");
    expect(result.ruleResults.find((rule) => rule.ruleId === "EVIDENCE_GATE:R17")?.explanation)
      .toContain("manual_only");
    expect(result.trust.confidence).toBe(0);
    expect(result.primaryPath).toBeNull();
  });

  it("routes a selected insurance offer with stale source freshness to human review", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s5-rf-italy-insurance");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision(
      {
        case: caseData,
        catalogs: withStaleSource(catalogs, "src_alfa_insurance")
      },
      {
        now: () => new Date("2026-04-29T09:00:00.000Z")
      }
    );

    expect(result.verdict).toBe("HUMAN_REVIEW");
    expect(result.nextAction.type).toBe("send_for_review");
    expect(result.ruleResults.find((rule) => rule.ruleId === "EVIDENCE_GATE:OFFER_SOURCE:alfa_plus")?.explanation)
      .toContain("stale");
    expect(result.trust.evidenceStatus).toBe("stale");
    expect(result.trust.freshnessStatus).toBe("stale");
    expect(result.trust.humanReviewReason).toContain("EVIDENCE_GATE:OFFER_SOURCE:alfa_plus");
  });

  it("does not surface insurance alternatives whose source freshness is stale", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s5-rf-italy-insurance");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision(
      {
        case: caseData,
        catalogs: withOnlyAlfaInsuranceFresh(catalogs)
      },
      {
        now: () => new Date("2026-04-29T09:00:00.000Z")
      }
    );

    expect(result.verdict).toBe("GO_WITH_CONDITIONS");
    expect(result.primaryPath?.id).toBe("alfa_plus");
    expect(result.ruleResults.map((rule) => rule.ruleId)).not.toContain(
      "EVIDENCE_GATE:OFFER_SOURCE:alfa_plus"
    );
    expect(result.alternativePaths.map((offer) => offer.id)).not.toEqual(
      expect.arrayContaining([
        "rosgosstrakh_family",
        "sogaz_premium",
        "ingos_schengen",
        "tinkoff_basic"
      ])
    );
    const evidenceStep = result.auditTrail.steps.find((step) => step.name === "evaluateEvidence");
    const excludedEvidence = (evidenceStep?.notes ?? [])
      .filter((note) => note.startsWith("{"))
      .map((note) => JSON.parse(note) as Record<string, unknown>)
      .filter((note) => note.type === "excludedOfferEvidence");
    expect(excludedEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "excludedOfferEvidence",
          offerId: "rosgosstrakh_family",
          ruleId: "OFFER_SOURCE:rosgosstrakh_family",
          countryOrScope: "RU->IT",
          evidenceStatus: "stale",
          automationClass: "safe_auto",
          sourceUrlOrRef: "src_rosgosstrakh",
          sourceKind: "operator",
          lastVerifiedAt: "2026-03-01T09:00:00.000Z",
          freshnessWindowDays: 5,
          rationale: expect.stringContaining("rosgosstrakh_family")
        }),
        expect.objectContaining({
          offerId: "sogaz_premium",
          ruleId: "OFFER_SOURCE:sogaz_premium",
          evidenceStatus: "stale"
        }),
        expect.objectContaining({
          offerId: "ingos_schengen",
          ruleId: "OFFER_SOURCE:ingos_schengen",
          evidenceStatus: "stale"
        }),
        expect.objectContaining({
          offerId: "tinkoff_basic",
          ruleId: "OFFER_SOURCE:tinkoff_basic",
          evidenceStatus: "stale"
        })
      ])
    );
  });

  it("uses one semantic clock across evidence freshness and computedAt", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s5-rf-italy-insurance");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    let calls = 0;
    const result = runDecision(
      {
        case: caseData,
        catalogs: withAlfaFreshAtBoundary(catalogs)
      },
      {
        now: () => {
          calls += 1;
          return calls === 1
            ? new Date("2026-04-29T09:00:00.000Z")
            : new Date("2026-04-29T09:00:00.001Z");
        }
      }
    );

    expect(calls).toBe(1);
    expect(result.computedAt).toBe("2026-04-29T09:00:00.000Z");
    expect(result.verdict).toBe("GO_WITH_CONDITIONS");
    expect(result.primaryPath?.id).toBe("alfa_plus");
    expect(result.ruleResults.map((rule) => rule.ruleId)).not.toContain(
      "EVIDENCE_GATE:OFFER_SOURCE:alfa_plus"
    );
  });

  it("keeps the scenario coverage matrix explicit about evidence-blocked cases", async () => {
    const catalogs = await loadCatalogs();
    const matrix = buildScenarioEvidenceCoverage({
      cases: catalogs.cases,
      scenarios: [{ caseId: "s4-rf-residency-dnv", productType: "residency_es" }],
      catalogs: staleR17Catalogs(catalogs)
    });

    expect(matrix).toEqual([
      {
        caseId: "s4-rf-residency-dnv",
        productType: "residency_es",
        status: "blocked",
        verdict: "HUMAN_REVIEW",
        evidenceGateRuleIds: ["EVIDENCE_GATE:R17"]
      }
    ]);
  });
});
