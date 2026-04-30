import { z } from "zod";
import { evidenceStatusSchema } from "./evidence";
import {
  humanReviewRequestSchema,
  humanReviewStatusSchema,
  allowedHumanReviewTransitions,
  isHumanReviewTerminalStatus,
  type HumanReviewStatus
} from "./humanReview";
import { productTypeSchema } from "./product";
import { resultPayloadSchema } from "./result";
import { verdictSchema } from "./verdict";

export const humanReviewOpsCapabilitiesSchema = z.object({
  terminalResolve: z.literal("transition_only"),
  learningFeedback: z.literal("available")
});
export type HumanReviewOpsCapabilities = z.infer<typeof humanReviewOpsCapabilitiesSchema>;

export const humanReviewOpsBlockerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["evidence_gate", "human_review_trigger", "warning", "trust"]),
  ruleId: z.string().min(1).nullable(),
  label: z.string().min(1),
  detail: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low"]),
  triggeredBy: z.array(z.string().min(1))
});
export type HumanReviewOpsBlocker = z.infer<typeof humanReviewOpsBlockerSchema>;

export const humanReviewOpsQueueItemSchema = z.object({
  itemStatus: z.literal("ready").default("ready"),
  requestId: z.string().min(1),
  caseId: z.string().min(1),
  caseTitle: z.string().min(1),
  status: humanReviewStatusSchema,
  submittedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  channel: humanReviewRequestSchema.shape.channel,
  contact: z.string().min(3),
  snapshot: humanReviewRequestSchema.shape.snapshot,
  currentVerdict: verdictSchema,
  currentNextActionLabel: z.string().min(1),
  currentEvidenceStatus: evidenceStatusSchema,
  blockerCount: z.number().int().min(0),
  primaryBlockerLabel: z.string().min(1).nullable(),
  ageMinutes: z.number().int().min(0)
});
export type HumanReviewOpsQueueItem = z.infer<typeof humanReviewOpsQueueItemSchema>;

export const humanReviewOpsOrphanQueueItemSchema = z.object({
  itemStatus: z.literal("orphaned_case"),
  requestId: z.string().min(1),
  caseId: z.string().min(1),
  status: humanReviewStatusSchema,
  submittedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  channel: humanReviewRequestSchema.shape.channel,
  contact: z.string().min(3),
  snapshot: humanReviewRequestSchema.shape.snapshot,
  ageMinutes: z.number().int().min(0),
  recoveryLabel: z.string().min(1)
});
export type HumanReviewOpsOrphanQueueItem = z.infer<
  typeof humanReviewOpsOrphanQueueItemSchema
>;

export const humanReviewOpsQueueEntrySchema = z.union([
  humanReviewOpsQueueItemSchema,
  humanReviewOpsOrphanQueueItemSchema
]);
export type HumanReviewOpsQueueEntry = z.infer<typeof humanReviewOpsQueueEntrySchema>;

export const humanReviewOpsCaseSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  productType: productTypeSchema,
  updatedAt: z.string().datetime()
});
export type HumanReviewOpsCaseSummary = z.infer<typeof humanReviewOpsCaseSummarySchema>;

export const humanReviewOpsAuditEventSchema = z.object({
  id: z.string().min(1),
  at: z.string().datetime(),
  label: z.string().min(1),
  actor: humanReviewRequestSchema.shape.events.element.shape.changedBy,
  note: z.string().min(1).nullable()
});
export type HumanReviewOpsAuditEvent = z.infer<typeof humanReviewOpsAuditEventSchema>;

export const humanReviewOpsResolutionSchema = z
  .object({
    status: z.enum(["resolved", "cancelled"]),
    closedAt: z.string().datetime(),
    note: z.string().min(1).nullable(),
    mode: z.literal("transition_only"),
    recompute: z.null()
  })
  .nullable();
export type HumanReviewOpsResolution = z.infer<typeof humanReviewOpsResolutionSchema>;

export const humanReviewOpsLearningSummarySchema = z.object({
  source: z.literal("learning_api"),
  summary: z.string().min(1)
});
export type HumanReviewOpsLearningSummary = z.infer<
  typeof humanReviewOpsLearningSummarySchema
>;

export const humanReviewOpsActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  transitionStatus: z.enum(["in_review", "resolved", "cancelled"]),
  internalOnly: z.literal(true)
});
export type HumanReviewOpsAction = z.infer<typeof humanReviewOpsActionSchema>;

const allowedOpsActionStatusesByRequestStatus: Record<
  HumanReviewStatus,
  readonly HumanReviewStatus[]
> = allowedHumanReviewTransitions;

export const humanReviewOpsDetailSchema = z
  .object({
    request: humanReviewRequestSchema,
    caseSummary: humanReviewOpsCaseSummarySchema,
    currentResult: resultPayloadSchema,
    blockingReasons: z.array(humanReviewOpsBlockerSchema),
    auditTrail: z.array(humanReviewOpsAuditEventSchema),
    resolution: humanReviewOpsResolutionSchema,
    learning: humanReviewOpsLearningSummarySchema,
    operatorNextActions: z.array(humanReviewOpsActionSchema)
  })
  .superRefine((detail, ctx) => {
    const terminal = isHumanReviewTerminalStatus(detail.request.status);
    if (terminal && detail.resolution === null) {
      ctx.addIssue({
        code: "custom",
        path: ["resolution"],
        message: "Terminal human review detail must include a resolution summary."
      });
    }
    if (!terminal && detail.resolution !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["resolution"],
        message: "Active human review detail must not include a terminal resolution."
      });
    }
    if (terminal && detail.operatorNextActions.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["operatorNextActions"],
        message: "Terminal human review detail must be read-only."
      });
      return;
    }

    const allowedStatuses = allowedOpsActionStatusesByRequestStatus[detail.request.status];
    detail.operatorNextActions.forEach((action, index) => {
      if (allowedStatuses.includes(action.transitionStatus)) return;
      ctx.addIssue({
        code: "custom",
        path: ["operatorNextActions", index, "transitionStatus"],
        message: `Action ${action.transitionStatus} is not allowed from ${detail.request.status}.`
      });
    });
  });
export type HumanReviewOpsDetail = z.infer<typeof humanReviewOpsDetailSchema>;

export const humanReviewOpsQueueResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  capabilities: humanReviewOpsCapabilitiesSchema,
  queue: z.array(humanReviewOpsQueueEntrySchema)
});
export type HumanReviewOpsQueueResponse = z.infer<
  typeof humanReviewOpsQueueResponseSchema
>;

export const humanReviewOpsDetailResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  capabilities: humanReviewOpsCapabilitiesSchema,
  detail: humanReviewOpsDetailSchema
});
export type HumanReviewOpsDetailResponse = z.infer<
  typeof humanReviewOpsDetailResponseSchema
>;
