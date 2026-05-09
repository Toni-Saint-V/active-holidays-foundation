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
  "clean_ready",
  "evidence_stale",
  "evidence_missing",
  "evidence_conflicting",
  "evidence_manual_only"
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

function evidenceReasons(input: PublicReadinessInput): PublicReadinessReason[] {
  if (input.trust.evidenceStatus === "stale") return ["evidence_stale"];
  if (input.trust.evidenceStatus === "missing") return ["evidence_missing"];
  if (input.trust.evidenceStatus === "conflicting") return ["evidence_conflicting"];
  if (input.trust.evidenceStatus === "manual_only") return ["evidence_manual_only"];
  return [];
}

export function derivePublicReadiness(
  input: PublicReadinessInput
): PublicReadinessProjection {
  const evidence = evidenceReasons(input);

  if (input.assumptionsCount > 0) {
    return {
      state: "insufficient_data",
      sourceVerdict: input.verdict,
      reasons: ["missing_required_input", ...evidence]
    };
  }

  if (hasHardBlocker(input)) {
    return {
      state: "not_ready_blocked",
      sourceVerdict: input.verdict,
      reasons: [
        input.primaryPathPresent ? "hard_blocker" : "no_available_path",
        ...evidence
      ]
    };
  }

  if (hasHumanReviewSignal(input)) {
    return {
      state: "needs_human_review",
      sourceVerdict: input.verdict,
      reasons: ["human_review_required", ...evidence]
    };
  }

  if (input.documents.blockedCount > 0 || input.verdict === "NOT_NOW") {
    return {
      state: "not_ready_fixable",
      sourceVerdict: input.verdict,
      reasons: ["documents_blocked", ...evidence]
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
      reasons: ["clean_ready", ...evidence]
    };
  }

  return {
    state: "almost_ready",
    sourceVerdict: input.verdict,
    reasons: ["conditions_remaining", ...evidence]
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
