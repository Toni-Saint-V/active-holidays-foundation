import { describe, expect, it } from "vitest";
import {
  reconcileRequiredReportsWithInventory,
  type AutomationContextReportInput,
  type GateEligibilitySnapshot
} from "./automation-context-packet";
import type { AutomationId } from "./automation-registry";

const distillerRequiredUpstreams: AutomationId[] = [
  "ah-design-drift-vs-contract",
  "ah-execution-brief-sync",
  "ah-open-decisions-curator",
  "ah-product-os-radar",
  "ah-release-gate-sync",
  "ah-review-learning-distiller",
  "ah-truth-freshness-watch"
];

function report(
  automationId: AutomationId,
  options: { latest?: boolean; dated?: boolean } = {}
): AutomationContextReportInput {
  return {
    automationId,
    role: "feeder",
    gatingClass: "report-only",
    latestReportPath: `reports/automations/runs/${automationId}/latest.md`,
    latestReportExists: options.latest ?? true,
    datedReportExists: options.dated ?? true,
    latestReportHash: options.latest === false ? null : `${automationId}-hash`,
    heading: options.latest === false ? null : `# ${automationId}`
  };
}

function snapshotWithMissingArtifacts(
  automationId: AutomationId,
  missingArtifacts = ["latest-md", "dated-report-md"]
): GateEligibilitySnapshot {
  return {
    schemaVersion: 1,
    dependencyStatus: {
      "ah-next-best-action-distiller": {
        [automationId]: {
          status: "blocked_by_missing_artifacts",
          missingArtifacts
        }
      }
    }
  };
}

describe("reconcileRequiredReportsWithInventory", () => {
  it("classifies stale snapshot separately when the required report artifacts exist", () => {
    const latestReports = distillerRequiredUpstreams.map((automationId) => report(automationId));

    const reconciliation = reconcileRequiredReportsWithInventory(
      snapshotWithMissingArtifacts("ah-truth-freshness-watch"),
      latestReports
    );

    expect(reconciliation.missingRequiredReports).not.toContain("ah-truth-freshness-watch");
    expect(reconciliation.staleGateSnapshotReports).toContain("ah-truth-freshness-watch");
    expect(reconciliation.staleGateSnapshotArtifacts["ah-truth-freshness-watch"]).toEqual([
      "dated-report-md",
      "latest-md"
    ]);
  });

  it("keeps live filesystem inventory authoritative when the snapshot is missing a required dependency status", () => {
    const latestReports = distillerRequiredUpstreams.map((automationId) =>
      automationId === "ah-truth-freshness-watch"
        ? report(automationId, { latest: false, dated: false })
        : report(automationId)
    );

    const reconciliation = reconcileRequiredReportsWithInventory(
      {
        schemaVersion: 1,
        dependencyStatus: {
          "ah-next-best-action-distiller": {}
        }
      },
      latestReports
    );

    expect(reconciliation.missingRequiredReports).toContain("ah-truth-freshness-watch");
    expect(reconciliation.missingRequiredReportArtifacts["ah-truth-freshness-watch"]).toEqual([
      "dated-report-md",
      "latest-md"
    ]);
    expect(reconciliation.staleGateSnapshotReports).not.toContain("ah-truth-freshness-watch");
  });
});
