import type { CriticalRisk, Risk, RiskSeverity, RuleResult } from "@shared/contracts";
import { ruleResultAffectsPath } from "../rules/relevance";

const severityOrder: Record<RiskSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

function severityToPulse(severity: RiskSeverity): number {
  switch (severity) {
    case "critical":
      return 1;
    case "high":
      return 0.75;
    case "medium":
      return 0.5;
    case "low":
      return 0.25;
  }
}

export function deriveRisks(
  ruleResults: RuleResult[],
  pathId?: string | null
): Risk[] {
  const risks: Risk[] = [];
  for (const result of ruleResults) {
    if (!result.fired || !ruleResultAffectsPath(result, pathId)) continue;
    let severity: RiskSeverity | null = null;
    if (result.output.type === "blocker") severity = result.output.severity ?? "critical";
    else if (result.output.type === "human_review_trigger") severity = "critical";
    else if (result.output.type === "warning") severity = result.output.severity ?? "medium";
    else if (result.output.type === "advisory") severity = result.output.severity ?? "low";
    if (!severity) continue;
    risks.push({
      id: `risk_${result.ruleId}`,
      severity,
      label: result.explanation.split(":")[0] ?? result.explanation,
      detail: result.explanation,
      triggeredBy: [result.ruleId],
      pulseAmplitude: severityToPulse(severity)
    });
  }
  return risks
    .slice()
    .sort(
      (a, b) =>
        severityOrder[b.severity] - severityOrder[a.severity] ||
        a.id.localeCompare(b.id)
    );
}

export function pickCriticalRisk(risks: Risk[]): CriticalRisk {
  const first = risks[0];
  if (!first) return null;
  if (first.severity === "critical" || first.severity === "high") return first;
  return null;
}
