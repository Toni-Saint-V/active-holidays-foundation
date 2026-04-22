import { z } from "zod";
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

export const humanReviewEventTypeSchema = z.enum(["submitted", "status_changed"]);
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
  events: z.array(humanReviewEventSchema).min(1)
});
export type HumanReviewRequest = z.infer<typeof humanReviewRequestSchema>;

export const humanReviewRequestsSchema = z.array(humanReviewRequestSchema);
export type HumanReviewRequests = z.infer<typeof humanReviewRequestsSchema>;

export const humanReviewCreateRequestSchema = z
  .object({
    channel: humanReviewChannelSchema,
    contact: z.string().min(3),
    message: z.string().min(10)
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
    note: z.string().min(1).max(2000).optional()
  })
  .strict();
export type HumanReviewTransitionRequest = z.infer<typeof humanReviewTransitionRequestSchema>;

export const humanReviewTransitionResponseSchema = z.object({
  request: humanReviewRequestSchema
});
export type HumanReviewTransitionResponse = z.infer<typeof humanReviewTransitionResponseSchema>;

export const humanReviewResponseSchema = z.object({
  request: humanReviewRequestSchema.nullable()
});
export type HumanReviewResponse = z.infer<typeof humanReviewResponseSchema>;

export function isHumanReviewTerminalStatus(status: HumanReviewStatus): status is HumanReviewTerminalStatus {
  return status === "resolved" || status === "cancelled";
}
