import type {
  CaseSignals,
  ConfidenceBreakdown,
  Offer,
  ProductType,
  RuleResult,
  Verdict
} from "@shared/contracts";
import { mandatorySignalIds, hasSignal } from "../signals";

type ComputeVerdictInput = {
  productType: ProductType;
  signals: CaseSignals;
  ruleResults: RuleResult[];
  rankedOffers: Offer[];
  confidence: ConfidenceBreakdown;
  ambiguity: number;
  conflictCount: number;
};

export function computeVerdict(input: ComputeVerdictInput): Verdict {
  const {
    productType,
    signals,
    ruleResults,
    rankedOffers,
    confidence,
    ambiguity,
    conflictCount
  } = input;
  const firedRules = ruleResults.filter((result) => result.fired);
  const hasHumanReview = firedRules.some(
    (rule) => rule.output.type === "human_review_trigger"
  );
  const hasBlocker = firedRules.some((rule) => rule.output.type === "blocker");
  const hasWarning = firedRules.some((rule) => rule.output.type === "warning");
  const mandatory = mandatorySignalIds(productType);
  const mandatoryPresent = mandatory.every((id) => hasSignal(signals, id));
  const primary = rankedOffers.find((offer) => offer.eligible) ?? null;

  if (hasHumanReview) return "HUMAN_REVIEW";
  if (
    (conflictCount > 0 && confidence.value < 0.6 && ambiguity > 0.3) ||
    (confidence.value < 0.6 && ambiguity > 0.3)
  ) {
    return "HUMAN_REVIEW";
  }
  if (hasBlocker && !primary) return "NOT_NOW";
  if (!primary || confidence.value < 0.5) {
    return hasBlocker ? "NOT_NOW" : "NOT_NOW";
  }
  if (!mandatoryPresent) return "HUMAN_REVIEW";
  if (confidence.value >= 0.8 && !hasWarning && !hasBlocker) return "GO";
  return "GO_WITH_CONDITIONS";
}
