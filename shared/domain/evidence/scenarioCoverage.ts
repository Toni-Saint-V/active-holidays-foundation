import type {
  Case,
  ProductType,
  RuleEvidenceRecord,
  RuleResult,
  Verdict
} from "@shared/contracts";
import { runDecision, type OrchestratorCatalogs } from "../engine/orchestrator";

export type ScenarioEvidenceCoverageStatus = "covered" | "degraded" | "blocked";

export type ScenarioEvidenceCoverageItem = {
  caseId: string;
  productType: ProductType;
  status: ScenarioEvidenceCoverageStatus;
  verdict: Verdict;
  evidenceGateRuleIds: string[];
};

type ScenarioLike = {
  caseId: string;
  productType: ProductType;
};

type BuildScenarioEvidenceCoverageInput = {
  cases: Case[];
  scenarios: ScenarioLike[];
  catalogs: OrchestratorCatalogs;
};

function evidenceGateRuleIds(ruleResults: RuleResult[]): string[] {
  return ruleResults
    .filter((result) => result.ruleId.startsWith("EVIDENCE_GATE:"))
    .map((result) => result.ruleId)
    .sort();
}

function coverageStatus(
  verdict: Verdict,
  gateRuleIds: string[]
): ScenarioEvidenceCoverageStatus {
  if (gateRuleIds.length === 0) return "covered";
  return verdict === "HUMAN_REVIEW" ? "blocked" : "degraded";
}

export function buildScenarioEvidenceCoverage(
  input: BuildScenarioEvidenceCoverageInput
): ScenarioEvidenceCoverageItem[] {
  return input.scenarios.map((scenario) => {
    const caseData = input.cases.find((entry) => entry.id === scenario.caseId);
    if (!caseData) {
      throw new Error(`Scenario case not found: ${scenario.caseId}`);
    }
    const result = runDecision({ case: caseData, catalogs: input.catalogs });
    const gateRuleIds = evidenceGateRuleIds(result.ruleResults);
    return {
      caseId: scenario.caseId,
      productType: scenario.productType,
      status: coverageStatus(result.verdict, gateRuleIds),
      verdict: result.verdict,
      evidenceGateRuleIds: gateRuleIds
    };
  });
}

export function cloneRuleEvidence(
  records: readonly RuleEvidenceRecord[]
): RuleEvidenceRecord[] {
  return records.map((record) => ({ ...record }));
}
