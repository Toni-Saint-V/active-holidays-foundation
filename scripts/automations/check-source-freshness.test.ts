import { describe, expect, it } from "vitest";
import {
  buildRunArtifactStem,
  buildSourceFreshnessReport,
  renderMarkdownReport,
  type RecordWithSource,
  type Source
} from "./check-source-freshness";

const now = new Date("2026-04-24T12:00:00.000Z");

const freshOfficial: Source = {
  id: "src_official_fresh",
  label: "Official fresh source",
  url: "https://example.com/official",
  tier: "official",
  lastCheckedAt: "2026-04-23T12:00:00.000Z",
  volatilityScore: 0.1
};

function buildReport(overrides: {
  sources: Source[];
  records?: RecordWithSource[];
}) {
  return buildSourceFreshnessReport({
    now,
    sources: overrides.sources,
    waiverState: { waivers: [] },
    datasets: [
      {
        path: "data/db/visa_rules.json",
        records: overrides.records ?? [{ sourceId: "src_official_fresh" }]
      }
    ]
  });
}

describe("buildSourceFreshnessReport", () => {
  it("turns referenced official/operator stale failures into product-impact next tasks", () => {
    const staleOperator: Source = {
      id: "src_operator_stale",
      label: "Operator stale source",
      url: "https://example.com/operator",
      tier: "operator",
      lastCheckedAt: "2026-04-10T12:00:00.000Z",
      volatilityScore: 0.4
    };

    const report = buildReport({
      sources: [freshOfficial, staleOperator],
      records: [{ sourceId: "src_operator_stale" }]
    });

    expect(report.status).toBe("blocked");
    expect(report.failures).toContain("src_operator_stale stale 14d > 5d (operator)");
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        sourceId: "src_operator_stale",
        kind: "stale_referenced",
        severity: "blocker",
        productImpact: expect.stringContaining("can make user-facing guidance stale")
      })
    );
    expect(report.nextTasks).toContainEqual(
      expect.objectContaining({
        id: "truth-refresh-src_operator_stale",
        title: "Refresh stale operator source: Operator stale source",
        sourceId: "src_operator_stale",
        productArea: "truth_trust",
        evidence: ["data/db/sources.json", "data/db/visa_rules.json"],
        blockedByManualReview: true,
        actionNeeded: expect.stringContaining("Manually re-check Operator stale source"),
        acceptanceCriteria: expect.arrayContaining([
          expect.stringContaining("Manual review boundary is explicit")
        ]),
        codexBrief: expect.stringContaining("Truth freshness task"),
        downstreamSyncDraft: expect.objectContaining({
          canonicalEnvelopeStatus: "draft_requires_adapter",
          writeMode: "report_only",
          targetSurface: "Automation Inbox",
          syncKey: "automation:ah-truth-freshness-watch:truth-refresh-src_operator_stale",
          draftStatus: "Ready",
          severity: "blocker"
        }),
        verification: ["npm run automations:check:truth"]
      })
    );
  });

  it("uses the same timestamp-level stale boundary as the engine", () => {
    const boundaryOfficial: Source = {
      id: "src_official_boundary",
      label: "Official boundary source",
      url: "https://example.com/boundary",
      tier: "official",
      lastCheckedAt: "2026-04-17T11:59:59.000Z",
      volatilityScore: 0.1
    };

    const report = buildReport({
      sources: [boundaryOfficial],
      records: [{ sourceId: "src_official_boundary" }]
    });

    expect(report.status).toBe("blocked");
    expect(report.failures).toContain("src_official_boundary stale 7d > 7d (official)");
  });

  it("keeps waived referenced freshness drift actionable without failing the gate", () => {
    const waivedOfficial: Source = {
      id: "src_official_waived",
      label: "Official waived source",
      url: "https://example.com/waived",
      tier: "official",
      lastCheckedAt: "2026-04-10T12:00:00.000Z",
      volatilityScore: 0.2
    };

    const report = buildSourceFreshnessReport({
      now,
      sources: [waivedOfficial],
      waiverState: {
        waivers: [
          {
            appliesTo: "src_official_waived",
            affectedChecks: ["freshness:ah-truth-freshness-watch"],
            affectedAutomationIds: ["ah-truth-freshness-watch"],
            reason: "Temporary source outage.",
            expiresAt: "2026-04-25T12:00:00.000Z"
          }
        ]
      },
      datasets: [{ path: "data/db/visa_rules.json", records: [{ sourceId: "src_official_waived" }] }]
    });

    expect(report.status).toBe("pass");
    expect(report.failures).toEqual([]);
    expect(report.warnings).toContain("src_official_waived stale 14d > 7d (official)");
    expect(report.warnings).toContain("src_official_waived freshness waiver active");
    expect(report.nextTasks).toContainEqual(
      expect.objectContaining({
        id: "truth-refresh-src_official_waived",
        severity: "warning",
        productReason: expect.stringContaining("time-boxed waiver"),
        blockedByManualReview: true,
        downstreamSyncDraft: expect.objectContaining({
          confidence: "medium"
        })
      })
    );
  });

  it("creates a repair task for missing source references", () => {
    const report = buildReport({
      sources: [freshOfficial],
      records: [{ sourceId: "src_missing_source" }]
    });

    expect(report.status).toBe("blocked");
    expect(report.failures).toContain("missing source reference: src_missing_source");
    expect(report.nextTasks).toContainEqual(
      expect.objectContaining({
        id: "truth-fix-missing-source-src_missing_source",
        title: "Fix missing source mapping: src_missing_source",
        evidence: ["data/db/sources.json", "data/db/visa_rules.json"],
        productReason: expect.stringContaining("cannot show reliable evidence"),
        blockedByManualReview: false,
        downstreamSyncDraft: expect.objectContaining({
          confidence: "high"
        })
      })
    );
  });

  it("collects external rule evidence source refs and ignores repo-local evidence refs", () => {
    const report = buildReport({
      sources: [freshOfficial],
      records: [
        {
          sourceUrlOrRef: "src_official_fresh",
          sourceKind: "official"
        },
        {
          sourceUrlOrRef: "repo:rule:R11",
          sourceKind: "internal_note"
        }
      ]
    });

    expect(report.status).toBe("pass");
    expect(report.referencedSourceCount).toBe(1);
    expect(report.failures).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("keeps invalid source freshness timestamps behind manual review", () => {
    const invalidTimestampSource: Source = {
      id: "src_invalid_timestamp",
      label: "Invalid timestamp source",
      url: "https://example.com/invalid",
      tier: "official",
      lastCheckedAt: "not-a-date",
      volatilityScore: 0.2
    };

    const report = buildReport({
      sources: [invalidTimestampSource],
      records: [{ sourceId: "src_invalid_timestamp" }]
    });

    expect(report.status).toBe("blocked");
    expect(report.nextTasks).toContainEqual(
      expect.objectContaining({
        id: "truth-fix-source-timestamp-src_invalid_timestamp",
        blockedByManualReview: true,
        actionNeeded: expect.stringContaining("Manually re-check src_invalid_timestamp"),
        codexBrief: expect.stringContaining(
          "Do not update source freshness timestamps or product truth until a human/manual source review confirms the source."
        ),
        downstreamSyncDraft: expect.objectContaining({
          confidence: "medium"
        })
      })
    );
  });

  it("renders deterministic report frontmatter for gate freshness projection", () => {
    const report = buildReport({ sources: [freshOfficial] });

    expect(renderMarkdownReport(report)).toMatch(
      /^---\nlastVerifiedAt: 2026-04-24T12:00:00\.000Z\n---\n\n# Truth \+ Freshness Watch/
    );
  });

  it("uses timestamp-level artifact names so same-day writes do not overwrite run evidence", () => {
    expect(buildRunArtifactStem("2026-04-24T12:00:00.000Z")).toBe("2026-04-24T12-00-00-000Z");
    expect(buildRunArtifactStem("2026-04-24T18:30:12.500Z")).toBe("2026-04-24T18-30-12-500Z");
  });
});
