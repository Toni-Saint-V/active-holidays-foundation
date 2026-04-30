import { z } from "zod";

export const auditStepNameSchema = z.enum([
  "collectSignals",
  "validateSignals",
  "resolveVisaRules",
  "evaluateRules",
  "evaluateEvidence",
  "evaluateHumanReviewCalibration",
  "rankPaths",
  "computeRisks",
  "computeVerdict",
  "resolveAction",
  "computeConfidence",
  "generateWhy",
  "assemblePayload"
]);
export type AuditStepName = z.infer<typeof auditStepNameSchema>;

export const auditStepSchema = z.object({
  index: z.number().int().min(0),
  name: auditStepNameSchema,
  tookMs: z.number().min(0),
  inputsSummary: z.string().min(1),
  outputSummary: z.string().min(1),
  firedRuleIds: z.array(z.string().min(1)).default([]),
  notes: z.array(z.string()).default([])
});
export type AuditStep = z.infer<typeof auditStepSchema>;

export const auditTrailSchema = z.object({
  version: z.literal("rdc.v1"),
  caseId: z.string().min(1),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  totalMs: z.number().min(0),
  steps: z.array(auditStepSchema).min(1),
  preview: z.boolean().default(false)
});
export type AuditTrail = z.infer<typeof auditTrailSchema>;
