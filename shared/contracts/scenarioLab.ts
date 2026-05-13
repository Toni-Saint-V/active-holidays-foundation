import { z } from "zod";
import { caseSchema } from "./case";
import { nextActionSchema, actionTargetScreenSchema } from "./action";
import { productTypeSchema } from "./product";
import { signalIdSchema } from "./signals";
import { verdictSchema } from "./verdict";
import { caseAccessCredentialSchema } from "./caseAccess";

export const scenarioLabPlanStatusSchema = z.enum(["normal", "human_review"]);
export type ScenarioLabPlanStatus = z.infer<typeof scenarioLabPlanStatusSchema>;

export const scenarioLabPlanStepKindSchema = z.enum([
  "next_action",
  "documents",
  "trust",
  "review"
]);
export type ScenarioLabPlanStepKind = z.infer<typeof scenarioLabPlanStepKindSchema>;

export const scenarioLabPlanStepStateSchema = z.enum(["todo", "watch", "blocked"]);
export type ScenarioLabPlanStepState = z.infer<typeof scenarioLabPlanStepStateSchema>;

export const scenarioLabPlanStepSchema = z.object({
  id: z.string().min(1),
  kind: scenarioLabPlanStepKindSchema,
  state: scenarioLabPlanStepStateSchema,
  label: z.string().min(1),
  detail: z.string().min(1),
  targetScreen: actionTargetScreenSchema.nullable(),
  triggeredBy: z.array(z.string().min(1)).default([])
});
export type ScenarioLabPlanStep = z.infer<typeof scenarioLabPlanStepSchema>;

export const scenarioLabActionPlanSchema = z.object({
  status: scenarioLabPlanStatusSchema,
  headline: z.string().min(1),
  detail: z.string().min(1),
  escalationReason: z.string().min(1).nullable(),
  primaryAction: nextActionSchema,
  steps: z.array(scenarioLabPlanStepSchema)
});
export type ScenarioLabActionPlan = z.infer<typeof scenarioLabActionPlanSchema>;

export const scenarioLabOutcomeSchema = z.object({
  verdict: verdictSchema,
  confidence: z.number().min(0).max(1),
  primaryPathId: z.string().min(1).nullable(),
  primaryPathLabel: z.string().min(1).nullable(),
  alternativePathIds: z.array(z.string().min(1)),
  alternativePathLabels: z.array(z.string().min(1)),
  documentsScore: z.number().min(0).max(1),
  documentsReadyCount: z.number().int().min(0),
  documentsRequiredCount: z.number().int().min(0),
  nextActionType: nextActionSchema.shape.type,
  nextActionLabel: z.string().min(1),
  humanReview: z.boolean()
});
export type ScenarioLabOutcome = z.infer<typeof scenarioLabOutcomeSchema>;

export const scenarioLabSignalChangeSchema = z.object({
  signalId: signalIdSchema,
  before: z.string().nullable(),
  after: z.string().nullable()
});
export type ScenarioLabSignalChange = z.infer<typeof scenarioLabSignalChangeSchema>;

export const scenarioLabSummarySchema = z.object({
  caseId: z.string().min(1),
  title: z.string().min(1),
  productType: productTypeSchema,
  forkedFrom: z.string().min(1).nullable(),
  signalCount: z.number().int().min(0),
  changedSignalIds: z.array(signalIdSchema),
  changedPreferenceIds: z.array(z.string().min(1)),
  changedSignals: z.array(scenarioLabSignalChangeSchema),
  outcome: scenarioLabOutcomeSchema,
  actionPlan: scenarioLabActionPlanSchema
});
export type ScenarioLabSummary = z.infer<typeof scenarioLabSummarySchema>;

export const scenarioLabComparisonDeltaSchema = z.object({
  verdictChanged: z.boolean(),
  confidenceDelta: z.number(),
  primaryPathChanged: z.boolean(),
  documentsScoreDelta: z.number(),
  documentsReadyDelta: z.number().int(),
  nextActionChanged: z.boolean(),
  humanReviewChanged: z.boolean(),
  addedAlternativePathIds: z.array(z.string().min(1)),
  removedAlternativePathIds: z.array(z.string().min(1)),
  changedSignalIds: z.array(signalIdSchema),
  changedPreferenceIds: z.array(z.string().min(1)),
  changedSignals: z.array(scenarioLabSignalChangeSchema)
});
export type ScenarioLabComparisonDelta = z.infer<typeof scenarioLabComparisonDeltaSchema>;

export const scenarioLabComparisonSchema = z.object({
  baseline: scenarioLabSummarySchema,
  candidate: scenarioLabSummarySchema,
  delta: scenarioLabComparisonDeltaSchema
});
export type ScenarioLabComparison = z.infer<typeof scenarioLabComparisonSchema>;

export const scenarioLabFamilySchema = z.object({
  rootCaseId: z.string().min(1),
  focusCaseId: z.string().min(1),
  baseline: scenarioLabSummarySchema,
  scenarios: z.array(scenarioLabSummarySchema),
  comparisons: z.array(scenarioLabComparisonSchema)
});
export type ScenarioLabFamily = z.infer<typeof scenarioLabFamilySchema>;

export const scenarioLabCompareRequestSchema = z
  .object({
    compareToCaseId: z.string().min(1).optional(),
    candidateAccessToken: z.string().min(24).optional(),
    title: z.string().min(1).optional(),
    signals: caseSchema.shape.signals.default([]),
    preferences: caseSchema.shape.preferences.optional()
  })
  .refine(
    (value) =>
      !value.compareToCaseId ||
      (!value.title &&
        value.signals.length === 0 &&
        ((value.preferences?.length ?? 0) === 0)),
    {
      message: "Нельзя одновременно сравнивать существующий кейс и создавать новый fork.",
      path: ["compareToCaseId"]
    }
  )
  .refine(
    (value) =>
      Boolean(value.compareToCaseId) ||
      Boolean(value.title) ||
      value.signals.length > 0 ||
      (value.preferences?.length ?? 0) > 0,
    {
      message: "Для нового fork нужен хотя бы один сценарный сдвиг: title, signals или preferences.",
      path: ["signals"]
    }
  );
export type ScenarioLabCompareRequest = z.infer<typeof scenarioLabCompareRequestSchema>;

export const scenarioLabCompareResponseSchema = z.object({
  rootCaseId: z.string().min(1),
  baseline: scenarioLabSummarySchema,
  candidateCase: caseSchema,
  comparison: scenarioLabComparisonSchema,
  candidateDecisionRecordId: z.string().min(1).nullable(),
  access: caseAccessCredentialSchema.optional()
});
export type ScenarioLabCompareResponse = z.infer<typeof scenarioLabCompareResponseSchema>;
