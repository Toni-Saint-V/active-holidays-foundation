import type { Case, IntakePreview } from "@shared/contracts";
import { filterRelevantRuleResults } from "../rules/relevance";
import { hasResolvedSignal, mandatorySignalIds } from "../signals";
import { runDecision, type OrchestratorCatalogs } from "../engine/orchestrator";

export function previewVerdict(
  input: { case: Case; catalogs: OrchestratorCatalogs },
  options: { now?: () => Date } = {}
): IntakePreview {
  const result = runDecision(input, { preview: true, now: options.now });
  const mandatory = mandatorySignalIds(input.case.productType);
  const mandatoryDone = mandatory.filter((id) => hasResolvedSignal(input.case.signals, id)).length;
  const focusPathId = result.primaryPath?.id ?? result.alternativePaths[0]?.id ?? null;
  const firedRules = filterRelevantRuleResults(
    result.ruleResults.filter((rule) => rule.fired),
    focusPathId
  );
  return {
    caseId: input.case.id,
    tentativeVerdict: result.verdict,
    tentativeConfidence: result.trust.confidence,
    capsApplied: result.trust.confidenceBreakdown.capsApplied,
    resolvedSignalCount: mandatoryDone,
    requiredMandatoryCount: mandatory.length,
    hasBlockingRule: firedRules.some((rule) => rule.output.type === "blocker"),
    hasHumanReviewTrigger: firedRules.some(
      (rule) => rule.output.type === "human_review_trigger"
    )
  };
}
