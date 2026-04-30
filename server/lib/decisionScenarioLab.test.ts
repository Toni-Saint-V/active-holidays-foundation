import { describe, expect, it } from "vitest";
import { loadCatalogs } from "./catalogs";
import { buildDecisionScenarioLab } from "./decisionScenarioLab";
import { runDecision } from "@shared/domain/engine";

describe("buildDecisionScenarioLab", () => {
  it("builds concrete improvement scenarios for a recoverable case", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s1-rf-italy");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({ case: caseData, catalogs });
    const lab = buildDecisionScenarioLab(caseData, catalogs, result);

    expect(lab.noHelpfulScenarios).toBe(false);
    expect(lab.issues.length).toBeGreaterThan(0);
    expect(lab.scenarios.length).toBeGreaterThan(0);
    expect(lab.scenarios.some((scenario) => scenario.id === "documents-ready")).toBe(true);
    expect(lab.scenarios[0]?.comparison.whyChanged.length).toBeGreaterThan(0);
  });

  it("falls back to honest human review when automatic scenarios do not help", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s3-us-spb-business");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({ case: caseData, catalogs });
    const lab = buildDecisionScenarioLab(caseData, catalogs, result);

    expect(lab.noHelpfulScenarios).toBe(true);
    expect(lab.recommendedScenarioId).toBe("human-review");
    expect(lab.scenarios).toHaveLength(1);
    expect(lab.scenarios[0]?.type).toBe("human_review");
    expect(lab.scenarios[0]?.comparison.verdictAfter).toBe("HUMAN_REVIEW");
    expect(lab.scenarios[0]?.nextAction.type).toBe("send_for_review");
    expect(lab.scenarios[0]?.nextAction.targetScreen).toBe("human-review");
    expect(lab.humanReviewEscalation.required).toBe(true);
  });

  it("does not treat a bare path relabel as an improvement scenario", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s5-rf-italy-insurance");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({ case: caseData, catalogs });
    const lab = buildDecisionScenarioLab(caseData, catalogs, result);

    expect(lab.scenarios.some((scenario) => scenario.type === "path_switch")).toBe(false);
  });

  it("marks no-helpful fallback scenarios as human-review-only even when the base result is not review", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s5-rf-italy-insurance");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({ case: caseData, catalogs });
    const lab = buildDecisionScenarioLab(caseData, catalogs, result);

    expect(result.verdict).not.toBe("HUMAN_REVIEW");
    expect(lab.noHelpfulScenarios).toBe(true);
    expect(lab.scenarios[0]?.type).toBe("human_review");
    expect(lab.scenarios[0]?.safetyStatus).toBe("human_review_only");
    expect(lab.scenarios[0]?.comparison.confidenceAfter).toBe(result.trust.confidence);
    expect(lab.scenarios[0]?.delta?.verdict.after).toBe("HUMAN_REVIEW");
    expect(lab.scenarios[0]?.delta?.confidence.after).toBe(result.trust.confidence);
    expect(lab.scenarios[0]?.delta?.nextAction.afterType).toBe("send_for_review");
  });

  it("does not recommend a path switch that degrades the base result", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s5-rf-italy-insurance");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({ case: caseData, catalogs });
    const degradedBase = {
      ...result,
      verdict: "GO" as const,
      alternativePaths: result.alternativePaths.slice(0, 1),
      trust: {
        ...result.trust,
        confidence: 0.9
      }
    };

    const lab = buildDecisionScenarioLab(caseData, catalogs, degradedBase);

    expect(lab.noHelpfulScenarios).toBe(true);
    expect(lab.recommendedScenarioId).toBe("human-review");
    expect(lab.scenarios.some((scenario) => scenario.type === "path_switch")).toBe(false);
    expect(lab.scenarios[0]?.safetyStatus).toBe("human_review_only");
  });
});
