import type { RuleResult } from "@shared/contracts";

export function ruleResultAffectsPath(
  result: RuleResult,
  pathId?: string | null
): boolean {
  const pathIds = result.output.pathIds;
  if (!pathIds) return true;
  if (pathIds.length === 0) return false;
  return !!pathId && pathIds.includes(pathId);
}

export function filterRelevantRuleResults(
  ruleResults: RuleResult[],
  pathId?: string | null
): RuleResult[] {
  return ruleResults.filter((result) => ruleResultAffectsPath(result, pathId));
}
