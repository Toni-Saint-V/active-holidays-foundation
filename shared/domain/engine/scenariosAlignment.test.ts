import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalogs } from "../../../server/lib/catalogs";
import { runDecision } from "./orchestrator";

type ScenarioExpectation = {
  caseId: string;
  expectedVerdict: string;
  expectedActionType: string;
  expectedPrimaryPath: string | null;
};

describe("seed scenarios", () => {
  it("stay aligned with the live decision engine", async () => {
    const catalogs = await loadCatalogs();
    const raw = readFileSync(
      path.resolve(process.cwd(), "data/scenarios/scenarios.json"),
      "utf8"
    );
    const scenarios = JSON.parse(raw) as ScenarioExpectation[];

    for (const scenario of scenarios) {
      const caseData = catalogs.cases.find((entry) => entry.id === scenario.caseId);
      expect(caseData, `missing case ${scenario.caseId}`).toBeDefined();
      if (!caseData) continue;

      const result = runDecision({ case: caseData, catalogs });

      expect(result.verdict).toBe(scenario.expectedVerdict);
      expect(result.nextAction.type).toBe(scenario.expectedActionType);
      expect(result.primaryPath?.id ?? null).toBe(scenario.expectedPrimaryPath);
    }
  });
});
