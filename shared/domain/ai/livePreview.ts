import type { Case, IntakePreview } from "@shared/contracts";
import { mandatorySignalIds, hasSignal } from "../signals";
import { runDecision, type OrchestratorCatalogs } from "../engine/orchestrator";

export function previewVerdict(
  input: { case: Case; catalogs: OrchestratorCatalogs },
  options: { now?: () => Date } = {}
): IntakePreview {
  const result = runDecision(input, { preview: true, now: options.now });
  const mandatory = mandatorySignalIds();
  const mandatoryDone = mandatory.filter((id) => hasSignal(input.case.signals, id)).length;
  const firedRules = result.ruleResults.filter((rule) => rule.fired);
  return {
    caseId: input.case.id,
    tentativeVerdict: result.verdict,
    tentativeConfidence: result.trust.confidence,
    capsApplied: result.trust.confidenceBreakdown.capsApplied,
    resolvedSignalCount: input.case.signals.length,
    requiredMandatoryCount: mandatory.length,
    hasBlockingRule: firedRules.some((rule) => rule.output.type === "blocker"),
    hasHumanReviewTrigger: firedRules.some(
      (rule) => rule.output.type === "human_review_trigger"
    )
  };
}
