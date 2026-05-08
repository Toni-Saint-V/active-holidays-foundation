import { z } from "zod";
import { recommendationSourceSchema } from "./recommendations";

export const recommendationWhatIfBriefRequestSchema = z.object({
  candidateCaseId: z.string().min(1),
  offerId: z.string().min(1),
  offerLabel: z.string().min(1).optional()
});
export type RecommendationWhatIfBriefRequest = z.infer<
  typeof recommendationWhatIfBriefRequestSchema
>;

export const recommendationWhatIfBriefSchema = z.object({
  version: z.literal("recommendation-whatif-brief.v1"),
  caseId: z.string().min(1),
  candidateCaseId: z.string().min(1),
  offerId: z.string().min(1),
  source: recommendationSourceSchema,
  generatedAt: z.string().datetime(),
  headline: z.string().min(1),
  verdictDeltaSummary: z.string().min(1),
  confidenceDeltaSummary: z.string().min(1),
  priorityActions: z.array(z.string().min(1)).min(1).max(3),
  riskCallout: z.string().min(1),
  operatorNote: z.string().min(1),
  disclaimer: z.string().min(1)
});
export type RecommendationWhatIfBrief = z.infer<
  typeof recommendationWhatIfBriefSchema
>;

export const humanReviewManagerBriefRequestSchema = z.object({
  operatorContext: z.string().min(1).max(1000).optional()
});
export type HumanReviewManagerBriefRequest = z.infer<
  typeof humanReviewManagerBriefRequestSchema
>;

export const humanReviewManagerBriefSchema = z.object({
  version: z.literal("human-review-manager-brief.v1"),
  caseId: z.string().min(1),
  requestId: z.string().min(1),
  source: recommendationSourceSchema,
  generatedAt: z.string().datetime(),
  managerSummary: z.string().min(1),
  firstChecks: z.array(z.string().min(1)).min(1).max(4),
  userReplyDraft: z.string().min(1),
  escalationNote: z.string().min(1),
  disclaimer: z.string().min(1)
});
export type HumanReviewManagerBrief = z.infer<typeof humanReviewManagerBriefSchema>;
