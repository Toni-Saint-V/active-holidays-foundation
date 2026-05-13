import { z } from "zod";
import { recommendationSourceSchema } from "./recommendations";
import { candidateAccessTokenInputSchema } from "./caseAccess";

export const landingWowBriefSchema = z.object({
  version: z.literal("landing-wow-brief.v1"),
  caseId: z.string().min(1),
  source: recommendationSourceSchema,
  generatedAt: z.string().datetime(),
  teaser: z.string().min(1),
  highlights: z.array(z.string().min(1)).min(1).max(3),
  ctaHint: z.string().min(1),
  disclaimer: z.string().min(1)
});
export type LandingWowBrief = z.infer<typeof landingWowBriefSchema>;

export const intakeWowBriefSchema = z.object({
  version: z.literal("intake-wow-brief.v1"),
  caseId: z.string().min(1),
  source: recommendationSourceSchema,
  generatedAt: z.string().datetime(),
  nextSignalFocus: z.string().min(1),
  whyNow: z.string().min(1),
  suggestedAnswer: z.string().min(1),
  caution: z.string().min(1),
  disclaimer: z.string().min(1)
});
export type IntakeWowBrief = z.infer<typeof intakeWowBriefSchema>;

export const recommendationWhatIfBriefRequestSchema = z.object({
  candidateCaseId: z.string().min(1),
  candidateAccessToken: candidateAccessTokenInputSchema,
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
  readinessDeltaSummary: z.string().min(1),
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
