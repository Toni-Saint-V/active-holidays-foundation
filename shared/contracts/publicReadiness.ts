import { z } from "zod";
import type { EvidenceStatus } from "./evidence";
import type { ResultPayload } from "./result";
import type { RuleOutputType } from "./rules";
import { verdictSchema, type Verdict } from "./verdict";

export const publicReadinessStateSchema = z.enum([
  "ready",
  "almost_ready",
  "not_ready_fixable",
  "not_ready_blocked",
  "needs_human_review",
  "insufficient_data"
]);
export type PublicReadinessState = z.infer<typeof publicReadinessStateSchema>;

export const publicReadinessReasonSchema = z.enum([
  "missing_required_input",
  "hard_blocker",
  "no_available_path",
  "human_review_required",
  "documents_blocked",
  "conditions_remaining",
  "clean_ready"
]);
export type PublicReadinessReason = z.infer<typeof publicReadinessReasonSchema>;

export type PublicReadinessInput = {
  verdict: Verdict;
  primaryPathPresent: boolean;
  criticalRiskPresent: boolean;
  documents: {
    score: number;
    blockedCount: number;
    attentionNeededCount: number;
  };
  trust: {
    evidenceStatus: EvidenceStatus;
    humanReviewReason: string | null;
    blockingReason: string | null;
  };
  firedRuleOutputs: RuleOutputType[];
  assumptionsCount: number;
};

export type PublicReadinessProjection = {
  state: PublicReadinessState;
  sourceVerdict: Verdict;
  reasons: PublicReadinessReason[];
};

export const publicReadinessProjectionSchema = z.object({
  state: publicReadinessStateSchema,
  sourceVerdict: verdictSchema,
  reasons: z.array(publicReadinessReasonSchema).min(1)
});

function hasHumanReviewSignal(input: PublicReadinessInput): boolean {
  return (
    input.verdict === "HUMAN_REVIEW" ||
    input.trust.humanReviewReason !== null ||
    input.firedRuleOutputs.includes("human_review_trigger")
  );
}

function hasHardBlocker(input: PublicReadinessInput): boolean {
  return (
    input.criticalRiskPresent ||
    (input.verdict === "NOT_NOW" && !input.primaryPathPresent) ||
    (input.verdict === "NOT_NOW" && input.firedRuleOutputs.includes("blocker"))
  );
}

export function derivePublicReadiness(
  input: PublicReadinessInput
): PublicReadinessProjection {
  if (input.assumptionsCount > 0) {
    return {
      state: "insufficient_data",
      sourceVerdict: input.verdict,
      reasons: ["missing_required_input"]
    };
  }

  if (hasHardBlocker(input)) {
    return {
      state: "not_ready_blocked",
      sourceVerdict: input.verdict,
      reasons: [
        input.primaryPathPresent ? "hard_blocker" : "no_available_path"
      ]
    };
  }

  if (hasHumanReviewSignal(input)) {
    return {
      state: "needs_human_review",
      sourceVerdict: input.verdict,
      reasons: ["human_review_required"]
    };
  }

  if (input.documents.blockedCount > 0 || input.verdict === "NOT_NOW") {
    return {
      state: "not_ready_fixable",
      sourceVerdict: input.verdict,
      reasons: ["documents_blocked"]
    };
  }

  if (
    input.verdict === "GO" &&
    input.documents.score >= 1 &&
    input.documents.attentionNeededCount === 0
  ) {
    return {
      state: "ready",
      sourceVerdict: input.verdict,
      reasons: ["clean_ready"]
    };
  }

  return {
    state: "almost_ready",
    sourceVerdict: input.verdict,
    reasons: ["conditions_remaining"]
  };
}

export function publicReadinessInputFromResult(
  result: ResultPayload
): PublicReadinessInput {
  return {
    verdict: result.verdict,
    primaryPathPresent: result.primaryPath !== null,
    criticalRiskPresent: result.criticalRisk !== null,
    documents: {
      score: result.documents.score,
      blockedCount: result.documents.items.filter((item) => item.status === "blocked").length,
      attentionNeededCount: result.documents.items.filter(
        (item) => item.status === "attention_needed"
      ).length
    },
    trust: {
      evidenceStatus: result.trust.evidenceStatus,
      humanReviewReason: result.trust.humanReviewReason,
      blockingReason: result.trust.blockingReason
    },
    firedRuleOutputs: result.ruleResults
      .filter((rule) => rule.fired)
      .map((rule) => rule.output.type),
    assumptionsCount: result.assumptions.length
  };
}

export function derivePublicReadinessFromResult(
  result: ResultPayload
): PublicReadinessProjection {
  return derivePublicReadiness(publicReadinessInputFromResult(result));
}
