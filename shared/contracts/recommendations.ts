import { z } from "zod";

export const recommendationSourceSchema = z.enum([
  "ai_structured",
  "deterministic_recovery"
]);
export type RecommendationSource = z.infer<typeof recommendationSourceSchema>;

export const recommendationFitSchema = z.enum([
  "best_match",
  "good_option",
  "watch"
]);
export type RecommendationFit = z.infer<typeof recommendationFitSchema>;

export const recommendationUncertaintyReasonSchema = z.enum([
  "evidence_stale",
  "evidence_missing",
  "evidence_conflicting",
  "evidence_manual_only",
  "assumptions_present",
  "generation_unavailable",
  "generation_unusable"
]);
export type RecommendationUncertaintyReason = z.infer<
  typeof recommendationUncertaintyReasonSchema
>;

export const recommendationUncertaintySchema = z.object({
  status: z.enum(["clear", "uncertain", "manual_review"]),
  reasons: z.array(recommendationUncertaintyReasonSchema),
  note: z.string().min(1)
});
export type RecommendationUncertainty = z.infer<typeof recommendationUncertaintySchema>;

export const recommendationShortlistItemSchema = z.object({
  offerId: z.string().min(1),
  rank: z.number().int().min(1).max(3),
  fit: recommendationFitSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  fitReason: z.string().min(1),
  caution: z.string().min(1)
});
export type RecommendationShortlistItem = z.infer<typeof recommendationShortlistItemSchema>;

export const recommendationShortlistSchema = z.object({
  version: z.literal("recommendation-ai.v1"),
  caseId: z.string().min(1),
  generatedAt: z.string().datetime(),
  basedOnComputedAt: z.string().datetime(),
  source: recommendationSourceSchema,
  recommendedOfferId: z.string().min(1).nullable(),
  items: z.array(recommendationShortlistItemSchema).min(1).max(3),
  uncertainty: recommendationUncertaintySchema,
  disclaimer: z.string().min(1)
});
export type RecommendationShortlist = z.infer<typeof recommendationShortlistSchema>;

export const recommendationDetailRequestSchema = z.object({
  offerId: z.string().min(1)
});
export type RecommendationDetailRequest = z.infer<typeof recommendationDetailRequestSchema>;

export const recommendationDetailSchema = z.object({
  version: z.literal("recommendation-ai.v1"),
  caseId: z.string().min(1),
  offerId: z.string().min(1),
  generatedAt: z.string().datetime(),
  basedOnComputedAt: z.string().datetime(),
  source: recommendationSourceSchema,
  fit: recommendationFitSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  whyThisFits: z.array(z.string().min(1)).min(1).max(3),
  watchouts: z.array(z.string().min(1)).min(1).max(3),
  nextSteps: z.array(z.string().min(1)).min(1).max(3),
  trustSignals: z.array(z.string().min(1)).min(1).max(3),
  uncertainty: recommendationUncertaintySchema,
  disclaimer: z.string().min(1)
});
export type RecommendationDetail = z.infer<typeof recommendationDetailSchema>;
