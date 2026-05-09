import { z } from "zod";

export const aiResultWriterUrgencySchema = z.enum([
  "now",
  "before_departure",
  "optional",
  "human_review"
]);
export type AiResultWriterUrgency = z.infer<typeof aiResultWriterUrgencySchema>;

export const aiResultWriterActionTypeSchema = z.enum([
  "prepare",
  "fix_missing_data",
  "verify_risk",
  "human_review"
]);
export type AiResultWriterActionType = z.infer<typeof aiResultWriterActionTypeSchema>;

export const aiResultWriterUncertaintyLabelSchema = z.enum([
  "within_confirmed_data",
  "needs_more_data",
  "human_review_recommended",
  "deterministic_recovery"
]);
export type AiResultWriterUncertaintyLabel = z.infer<
  typeof aiResultWriterUncertaintyLabelSchema
>;

export const aiResultWriterUncertaintySourceSchema = z.enum([
  "deterministic",
  "ai_structured",
  "deterministic_recovery"
]);
export type AiResultWriterUncertaintySource = z.infer<
  typeof aiResultWriterUncertaintySourceSchema
>;

export const aiResultWriterPrimaryNextStepSchema = z
  .object({
    label: z.string().min(1).max(160),
    reason: z.string().min(1).max(280),
    urgency: aiResultWriterUrgencySchema,
    actionType: aiResultWriterActionTypeSchema
  })
  .strict();
export type AiResultWriterPrimaryNextStep = z.infer<
  typeof aiResultWriterPrimaryNextStepSchema
>;

export const aiResultWriterActionPlanSchema = z
  .object({
    doNow: z.array(z.string().min(1).max(180)).min(1).max(3),
    beforeDeparture: z.array(z.string().min(1).max(180)).min(1).max(3),
    ifUncertain: z.array(z.string().min(1).max(180)).min(1).max(2)
  })
  .strict();
export type AiResultWriterActionPlan = z.infer<typeof aiResultWriterActionPlanSchema>;

export const aiResultWriterEvidenceFactsSchema = z
  .object({
    known: z.array(z.string().min(1).max(220)).min(1).max(5),
    missing: z.array(z.string().min(1).max(220)).max(5),
    riskSignals: z.array(z.string().min(1).max(220)).max(5)
  })
  .strict();
export type AiResultWriterEvidenceFacts = z.infer<
  typeof aiResultWriterEvidenceFactsSchema
>;

export const aiResultWriterUncertaintySchema = z
  .object({
    label: aiResultWriterUncertaintyLabelSchema,
    reason: z.string().min(1).max(280),
    source: aiResultWriterUncertaintySourceSchema
  })
  .strict();
export type AiResultWriterUncertainty = z.infer<typeof aiResultWriterUncertaintySchema>;

export const aiResultWriterClaimGuardSchema = z
  .object({
    blockedClaims: z.array(z.string().min(1)).max(20),
    sanitized: z.boolean()
  })
  .strict();
export type AiResultWriterClaimGuard = z.infer<typeof aiResultWriterClaimGuardSchema>;

export const aiResultPayloadSchema = z
  .object({
    version: z.literal("ai-result-writer.v1"),
    caseId: z.string().min(1),
    generatedAt: z.string().datetime(),
    basedOnComputedAt: z.string().datetime(),
    statusSummary: z.string().min(1).max(220),
    primaryNextStep: aiResultWriterPrimaryNextStepSchema,
    actionPlan: aiResultWriterActionPlanSchema,
    evidenceFacts: aiResultWriterEvidenceFactsSchema,
    uncertainty: aiResultWriterUncertaintySchema,
    safeRecommendationText: z.string().min(1).max(560),
    claimGuard: aiResultWriterClaimGuardSchema
  })
  .strict();
export type AiResultPayload = z.infer<typeof aiResultPayloadSchema>;
