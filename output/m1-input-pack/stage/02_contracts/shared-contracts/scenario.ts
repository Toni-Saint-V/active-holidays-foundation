import { z } from "zod";
import { nextActionSchema } from "./action";
import { signalIdSchema } from "./signals";
import {
  documentsReadinessItemSchema,
  resultPayloadSchema
} from "./result";
import { verdictSchema } from "./verdict";

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
  nextAction: nextActionSchema,
  comparison: scenarioComparisonSchema,
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
