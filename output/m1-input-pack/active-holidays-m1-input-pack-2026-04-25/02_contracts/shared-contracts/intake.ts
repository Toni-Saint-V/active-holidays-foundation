import { z } from "zod";
import { signalIdSchema, signalDefinitionSchema } from "./signals";
import { verdictSchema } from "./verdict";

export const intakeQuestionSchema = signalDefinitionSchema.extend({
  informationGain: z.number().min(0).max(1),
  unlocksRules: z.array(z.string().min(1)),
  answered: z.boolean()
});
export type IntakeQuestion = z.infer<typeof intakeQuestionSchema>;

export const intakeQueueSchema = z.object({
  nextQuestion: intakeQuestionSchema.nullable(),
  remaining: z.array(intakeQuestionSchema),
  completedSignalIds: z.array(signalIdSchema),
  progress: z.number().min(0).max(1)
});
export type IntakeQueue = z.infer<typeof intakeQueueSchema>;

export const intakePreviewSchema = z.object({
  caseId: z.string().min(1),
  tentativeVerdict: verdictSchema,
  tentativeConfidence: z.number().min(0).max(1),
  capsApplied: z.array(z.string().min(1)),
  resolvedSignalCount: z.number().int().min(0),
  requiredMandatoryCount: z.number().int().min(0),
  hasBlockingRule: z.boolean(),
  hasHumanReviewTrigger: z.boolean()
});
export type IntakePreview = z.infer<typeof intakePreviewSchema>;

export const intakeNextQuestionRequestSchema = z.object({
  caseId: z.string().min(1)
});
export type IntakeNextQuestionRequest = z.infer<
  typeof intakeNextQuestionRequestSchema
>;
