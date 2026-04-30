import { z } from "zod";
import { nextActionSchema } from "./action";
import { evidenceStatusSchema } from "./evidence";
import { signalIdSchema } from "./signals";
import {
  documentsReadinessItemSchema,
  resultPayloadSchema
} from "./result";
import { verdictSchema } from "./verdict";

export const scenarioSafetyStatusSchema = z.enum([
  "safe_automatic",
  "degraded_usable",
  "evidence_blocked",
  "human_review_only"
]);
export type ScenarioSafetyStatus = z.infer<typeof scenarioSafetyStatusSchema>;

const scenarioFreshnessStatusSchema = z.enum(["fresh", "stale", "unknown"]);

const scenarioValueDeltaSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    before: schema,
    after: schema,
    changed: z.boolean()
  });

export const scenarioNumericDeltaSchema = z.object({
  before: z.number(),
  after: z.number(),
  delta: z.number()
});
export type ScenarioNumericDelta = z.infer<typeof scenarioNumericDeltaSchema>;

export const scenarioNextActionDeltaSchema = z.object({
  beforeType: nextActionSchema.shape.type,
  afterType: nextActionSchema.shape.type,
  beforeLabel: z.string().min(1),
  afterLabel: z.string().min(1),
  changed: z.boolean()
});
export type ScenarioNextActionDelta = z.infer<typeof scenarioNextActionDeltaSchema>;

export const scenarioRiskDeltaSchema = z.object({
  resolved: z.array(z.string().min(1)),
  added: z.array(z.string().min(1)),
  remaining: z.array(z.string().min(1))
});
export type ScenarioRiskDelta = z.infer<typeof scenarioRiskDeltaSchema>;

export const scenarioDocumentsReadinessDeltaSchema = z.object({
  readyCountBefore: z.number().int().min(0),
  readyCountAfter: z.number().int().min(0),
  readyCountDelta: z.number().int(),
  requiredCountBefore: z.number().int().min(0),
  requiredCountAfter: z.number().int().min(0),
  scoreBefore: z.number().min(0).max(1),
  scoreAfter: z.number().min(0).max(1),
  scoreDelta: z.number()
});
export type ScenarioDocumentsReadinessDelta = z.infer<
  typeof scenarioDocumentsReadinessDeltaSchema
>;

export const scenarioConciergeDeltaSchema = z.object({
  verdict: scenarioValueDeltaSchema(verdictSchema),
  confidence: scenarioNumericDeltaSchema,
  documents: scenarioDocumentsReadinessDeltaSchema,
  risks: scenarioRiskDeltaSchema,
  nextAction: scenarioNextActionDeltaSchema,
  evidenceStatus: scenarioValueDeltaSchema(evidenceStatusSchema),
  freshnessStatus: scenarioValueDeltaSchema(scenarioFreshnessStatusSchema),
  blockingReason: scenarioValueDeltaSchema(z.string().min(1).nullable()),
  humanReviewReason: scenarioValueDeltaSchema(z.string().min(1).nullable())
});
export type ScenarioConciergeDelta = z.infer<typeof scenarioConciergeDeltaSchema>;

export const scenarioIssueSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low"]),
  kind: z.enum(["blocking", "warning", "review"]),
  ruleId: z.string().min(1).nullable(),
  signalIds: z.array(signalIdSchema)
});
export type ScenarioIssue = z.infer<typeof scenarioIssueSchema>;

export const scenarioActionPlanSchema = z.object({
  headline: z.string().min(1),
  firstSteps: z.array(z.string().min(1)),
  criticalSteps: z.array(z.string().min(1)),
  canWait: z.array(z.string().min(1)),
  humanReviewRequired: z.boolean(),
  humanReviewReason: z.string().min(1).nullable()
});
export type ScenarioActionPlan = z.infer<typeof scenarioActionPlanSchema>;

export const scenarioPathSnapshotSchema = z.object({
  id: z.string().min(1).nullable(),
  label: z.string().min(1).nullable()
});
export type ScenarioPathSnapshot = z.infer<typeof scenarioPathSnapshotSchema>;

export const scenarioDocumentsDeltaSchema = z.object({
  readyCountBefore: z.number().int().min(0),
  readyCountAfter: z.number().int().min(0),
  requiredCount: z.number().int().min(0),
  itemsToCollect: z.array(documentsReadinessItemSchema)
});
export type ScenarioDocumentsDelta = z.infer<typeof scenarioDocumentsDeltaSchema>;

export const scenarioComparisonSchema = z.object({
  verdictBefore: verdictSchema,
  verdictAfter: verdictSchema,
  confidenceBefore: z.number().min(0).max(1),
  confidenceAfter: z.number().min(0).max(1),
  primaryPathBefore: scenarioPathSnapshotSchema,
  primaryPathAfter: scenarioPathSnapshotSchema,
  resolvedRisks: z.array(z.string().min(1)),
  remainingRisks: z.array(z.string().min(1)),
  documents: scenarioDocumentsDeltaSchema,
  whyChanged: z.array(z.string().min(1)).min(1).max(4)
});
export type ScenarioComparison = z.infer<typeof scenarioComparisonSchema>;

export const scenarioCandidateTypeSchema = z.enum([
  "documents",
  "signal_fix",
  "path_switch",
  "timing_shift",
  "human_review"
]);
export type ScenarioCandidateType = z.infer<typeof scenarioCandidateTypeSchema>;

export const scenarioCandidateSchema = z.object({
  id: z.string().min(1),
  type: scenarioCandidateTypeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  recommended: z.boolean(),
  safetyStatus: scenarioSafetyStatusSchema,
  evidenceStatus: evidenceStatusSchema,
  freshnessStatus: scenarioFreshnessStatusSchema,
  blockingReason: z.string().min(1).nullable(),
  humanReviewReason: z.string().min(1).nullable(),
  nextAction: nextActionSchema,
  comparison: scenarioComparisonSchema,
  delta: scenarioConciergeDeltaSchema,
  plan: scenarioActionPlanSchema
});
export type ScenarioCandidate = z.infer<typeof scenarioCandidateSchema>;

export const scenarioLabPayloadSchema = z.object({
  version: z.literal("scenario-lab.v1"),
  caseId: z.string().min(1),
  generatedAt: z.string().datetime(),
  baseResult: resultPayloadSchema,
  issues: z.array(scenarioIssueSchema),
  scenarios: z.array(scenarioCandidateSchema),
  recommendedScenarioId: z.string().min(1).nullable(),
  noHelpfulScenarios: z.boolean(),
  humanReviewEscalation: z.object({
    required: z.boolean(),
    title: z.string().min(1),
    detail: z.string().min(1),
    triggeredBy: z.array(z.string().min(1))
  })
});
export type ScenarioLabPayload = z.infer<typeof scenarioLabPayloadSchema>;
