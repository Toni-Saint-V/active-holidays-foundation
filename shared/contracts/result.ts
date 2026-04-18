import { z } from "zod";
import { verdictSchema } from "./verdict";
import { nextActionSchema } from "./action";
import { criticalRiskSchema, risksSchema } from "./risk";
import { ruleResultsSchema } from "./rules";
import { trustSchema } from "./trust";
import { auditTrailSchema } from "./audit";
import { signalIdSchema } from "./signals";
import { productTypeSchema } from "./product";
import { offerSchema } from "./offers";

export const whyBulletSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  ruleId: z.string().min(1),
  signalIds: z.array(signalIdSchema).min(1),
  tone: z.enum(["positive", "warning", "negative", "review", "neutral"])
});
export type WhyBullet = z.infer<typeof whyBulletSchema>;

export const decisionSignalSchema = z.object({
  id: signalIdSchema,
  label: z.string().min(1),
  displayValue: z.string().min(1),
  importance: z.number().min(0).max(1),
  present: z.boolean()
});
export type DecisionSignal = z.infer<typeof decisionSignalSchema>;

export const documentsReadinessItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["ready", "attention_needed", "blocked"]),
  detail: z.string().min(1),
  pathId: z.string().min(1).nullable()
});
export type DocumentsReadinessItem = z.infer<typeof documentsReadinessItemSchema>;

export const documentsReadinessSchema = z.object({
  score: z.number().min(0).max(1),
  readyCount: z.number().int().min(0),
  requiredCount: z.number().int().min(0),
  items: z.array(documentsReadinessItemSchema)
});
export type DocumentsReadiness = z.infer<typeof documentsReadinessSchema>;

export const assumptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1)
});
export type Assumption = z.infer<typeof assumptionSchema>;

export const resultPayloadSchema = z.object({
  version: z.literal("rdc.v1"),
  productType: productTypeSchema.default("travel"),
  caseId: z.string().min(1),
  computedAt: z.string().datetime(),
  verdict: verdictSchema,
  primaryPath: offerSchema.nullable(),
  alternativePaths: z.array(offerSchema),
  criticalRisk: criticalRiskSchema,
  risks: risksSchema,
  nextAction: nextActionSchema,
  decisionSignals: z.array(decisionSignalSchema),
  whyBullets: z.array(whyBulletSchema),
  ruleResults: ruleResultsSchema,
  documents: documentsReadinessSchema,
  trust: trustSchema,
  assumptions: z.array(assumptionSchema),
  auditTrail: auditTrailSchema,
  preview: z.boolean().default(false)
});
export type ResultPayload = z.infer<typeof resultPayloadSchema>;
