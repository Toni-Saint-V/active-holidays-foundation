import { z } from "zod";
import { nextActionSchema } from "./action";
import { productTypeSchema } from "./product";
import { documentsReadinessItemSchema } from "./result";
import { evidenceStatusSchema } from "./evidence";
import { riskSchema } from "./risk";
import { resultPayloadSchema } from "./result";
import { scenarioSafetyStatusSchema } from "./scenario";
import { freshnessStatusSchema } from "./trust";
import { verdictSchema } from "./verdict";

export const humanReviewStatusSchema = z.enum([
  "submitted",
  "in_queue",
  "in_review",
  "resolved",
  "cancelled"
]);
export type HumanReviewStatus = z.infer<typeof humanReviewStatusSchema>;

export const humanReviewTerminalStatusSchema = z.enum(["resolved", "cancelled"]);
export type HumanReviewTerminalStatus = z.infer<typeof humanReviewTerminalStatusSchema>;

export const humanReviewChannelSchema = z.enum(["email", "telegram"]);
export type HumanReviewChannel = z.infer<typeof humanReviewChannelSchema>;

export const humanReviewActorSchema = z.enum(["traveler", "ops", "system"]);
export type HumanReviewActor = z.infer<typeof humanReviewActorSchema>;

export const humanReviewDurabilitySchema = z.enum(["volatile", "persisted"]);
export type HumanReviewDurability = z.infer<typeof humanReviewDurabilitySchema>;

export const humanReviewHandoffSafetyStatusSchema = z.enum([
  "evidence_blocked",
  "human_review_only"
]);
export type HumanReviewHandoffSafetyStatus = z.infer<
  typeof humanReviewHandoffSafetyStatusSchema
>;

export const humanReviewHandoffSchema = z.object({
  source: z.literal("scenario_lab"),
  scenarioId: z.string().min(1),
  scenarioTitle: z.string().min(1),
  safetyStatus: humanReviewHandoffSafetyStatusSchema,
  evidenceStatus: evidenceStatusSchema,
  freshnessStatus: freshnessStatusSchema,
  blockingReason: z.string().min(1).nullable(),
  humanReviewReason: z.string().min(1),
  operatorNextAction: z.string().min(1),
  userNextActionLabel: z.string().min(1),
  triggeredBy: z.array(z.string().min(1)),
  createdFromDecisionId: z.string().min(1).nullable()
});
export type HumanReviewHandoff = z.infer<typeof humanReviewHandoffSchema>;

export const humanReviewResolutionSchema = z.object({
  summary: z.string().min(1).max(2000),
  resolvedAt: z.string().datetime(),
  changedBy: humanReviewActorSchema
});
export type HumanReviewResolution = z.infer<typeof humanReviewResolutionSchema>;

export const humanReviewSnapshotSchema = z.object({
  decisionId: z.string().min(1).nullable(),
  verdict: verdictSchema,
  confidence: z.number().min(0).max(1),
  computedAt: z.string().datetime(),
  lastCheckedAt: z.string().datetime(),
  nextActionLabel: z.string().min(1),
  summary: z.string().min(1)
});
export type HumanReviewSnapshot = z.infer<typeof humanReviewSnapshotSchema>;

export const humanReviewEventTypeSchema = z.enum([
  "submitted",
  "handoff_created",
  "status_changed"
]);
export type HumanReviewEventType = z.infer<typeof humanReviewEventTypeSchema>;

export const humanReviewEventSchema = z.object({
  id: z.string().min(1),
  at: z.string().datetime(),
  type: humanReviewEventTypeSchema,
  status: humanReviewStatusSchema,
  changedBy: humanReviewActorSchema,
  note: z.string().min(1).nullable()
});
export type HumanReviewEvent = z.infer<typeof humanReviewEventSchema>;

export const humanReviewRequestSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  status: humanReviewStatusSchema,
  channel: humanReviewChannelSchema,
  contact: z.string().min(3),
  message: z.string().min(10),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  durability: humanReviewDurabilitySchema,
  snapshot: humanReviewSnapshotSchema,
  handoff: humanReviewHandoffSchema.nullable().default(null),
  resolution: humanReviewResolutionSchema.nullable().default(null),
  events: z.array(humanReviewEventSchema).min(1)
});
export type HumanReviewRequest = z.infer<typeof humanReviewRequestSchema>;

export const humanReviewRequestsSchema = z.array(humanReviewRequestSchema);
export type HumanReviewRequests = z.infer<typeof humanReviewRequestsSchema>;

export const humanReviewCreateRequestSchema = z
  .object({
    channel: humanReviewChannelSchema,
    contact: z.string().min(3),
    message: z.string().min(10),
    scenarioId: z.string().min(1).optional()
  })
  .strict();
export type HumanReviewCreateRequest = z.infer<typeof humanReviewCreateRequestSchema>;

export const humanReviewCreateResponseSchema = z.object({
  request: humanReviewRequestSchema,
  reused: z.boolean()
});
export type HumanReviewCreateResponse = z.infer<typeof humanReviewCreateResponseSchema>;

export const humanReviewTransitionRequestSchema = z
  .object({
    requestId: z.string().min(1),
    status: humanReviewStatusSchema,
    note: z.string().min(1).max(2000).optional(),
    resolution: z
      .object({
        summary: z.string().min(1).max(2000)
      })
      .strict()
      .optional()
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.status === "resolved" && !payload.resolution) {
      ctx.addIssue({
        code: "custom",
        path: ["resolution"],
        message: "resolution is required when resolving a human review request"
      });
    }
    if (payload.status !== "resolved" && payload.resolution) {
      ctx.addIssue({
        code: "custom",
        path: ["resolution"],
        message: "resolution is only allowed for resolved human review requests"
      });
    }
  });
export type HumanReviewTransitionRequest = z.infer<typeof humanReviewTransitionRequestSchema>;

export const humanReviewTransitionResponseSchema = z.object({
  request: humanReviewRequestSchema,
  result: resultPayloadSchema.nullable().optional(),
  decisionRecordId: z.string().min(1).nullable().optional()
});
export type HumanReviewTransitionResponse = z.infer<typeof humanReviewTransitionResponseSchema>;

export const humanReviewResponseSchema = z.object({
  request: humanReviewRequestSchema.nullable()
});
export type HumanReviewResponse = z.infer<typeof humanReviewResponseSchema>;

export const humanReviewCasePacketChecklistPrioritySchema = z.enum([
  "critical",
  "high",
  "medium"
]);
export type HumanReviewCasePacketChecklistPriority = z.infer<
  typeof humanReviewCasePacketChecklistPrioritySchema
>;

export const humanReviewCasePacketSchema = z.object({
  version: z.literal("human-review-packet.v1"),
  generatedAt: z.string().datetime(),
  case: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    productType: productTypeSchema,
    updatedAt: z.string().datetime()
  }),
  request: humanReviewRequestSchema,
  submittedSnapshot: humanReviewSnapshotSchema,
  currentResult: z.object({
    verdict: verdictSchema,
    confidence: z.number().min(0).max(1),
    computedAt: z.string().datetime(),
    nextAction: nextActionSchema
  }),
  resultDrift: z.object({
    changed: z.boolean(),
    verdictChanged: z.boolean(),
    confidenceDelta: z.number(),
    computedAtChanged: z.boolean(),
    lastCheckedAtChanged: z.boolean(),
    nextActionChanged: z.boolean()
  }),
  reviewReason: z.string().min(1),
  evidence: z.object({
    evidenceStatus: evidenceStatusSchema,
    freshnessStatus: freshnessStatusSchema,
    blockingReason: z.string().min(1).nullable(),
    humanReviewReason: z.string().min(1).nullable(),
    lastCheckedAt: z.string().datetime()
  }),
  scenario: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
      safetyStatus: scenarioSafetyStatusSchema,
      evidenceStatus: evidenceStatusSchema,
      freshnessStatus: freshnessStatusSchema,
      blockingReason: z.string().min(1).nullable(),
      humanReviewReason: z.string().min(1),
      operatorNextAction: z.string().min(1),
      nextActionLabel: z.string().min(1)
    })
    .nullable(),
  operatorChecklist: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      detail: z.string().min(1),
      priority: humanReviewCasePacketChecklistPrioritySchema,
      source: z.enum(["evidence", "documents", "risk", "scenario", "request"])
    })
  ),
  documentsToInspect: z.array(documentsReadinessItemSchema),
  riskSummary: z.object({
    criticalRisk: riskSchema.nullable(),
    risks: z.array(riskSchema)
  }),
  doNotAutoDecideNotes: z.array(z.string().min(1))
});
export type HumanReviewCasePacket = z.infer<typeof humanReviewCasePacketSchema>;

export const humanReviewCasePacketResponseSchema = z.object({
  packet: humanReviewCasePacketSchema
});
export type HumanReviewCasePacketResponse = z.infer<
  typeof humanReviewCasePacketResponseSchema
>;

export function isHumanReviewTerminalStatus(status: HumanReviewStatus): status is HumanReviewTerminalStatus {
  return status === "resolved" || status === "cancelled";
}
