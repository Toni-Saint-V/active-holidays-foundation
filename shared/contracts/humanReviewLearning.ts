import { z } from "zod";
import { actionTypeSchema } from "./action";
import { verdictSchema } from "./verdict";

export const humanReviewLearningRootCauseSchema = z.enum([
  "missing_evidence",
  "stale_evidence",
  "conflicting_evidence",
  "missing_signal",
  "policy_ambiguity",
  "operator_override_only"
]);
export type HumanReviewLearningRootCause = z.infer<
  typeof humanReviewLearningRootCauseSchema
>;

export const humanReviewLearningBlockerSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low"
]);
export type HumanReviewLearningBlockerSeverity = z.infer<
  typeof humanReviewLearningBlockerSeveritySchema
>;

export const humanReviewLearningEvidenceGapSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().min(1),
    severity: humanReviewLearningBlockerSeveritySchema,
    ruleId: z.string().min(1).nullable()
  })
  .strict();
export type HumanReviewLearningEvidenceGap = z.infer<
  typeof humanReviewLearningEvidenceGapSchema
>;

export const humanReviewLearningVerdictDeltaSchema = z
  .object({
    before: verdictSchema,
    after: verdictSchema,
    changed: z.boolean()
  })
  .strict()
  .superRefine((delta, ctx) => {
    if ((delta.before !== delta.after) !== delta.changed) {
      ctx.addIssue({
        code: "custom",
        path: ["changed"],
        message: "Verdict delta changed flag must match before/after values."
      });
    }
  });
export type HumanReviewLearningVerdictDelta = z.infer<
  typeof humanReviewLearningVerdictDeltaSchema
>;

export const humanReviewLearningActionDeltaSchema = z
  .object({
    beforeLabel: z.string().min(1),
    afterLabel: z.string().min(1),
    beforeType: actionTypeSchema,
    afterType: actionTypeSchema,
    changed: z.boolean()
  })
  .strict()
  .superRefine((delta, ctx) => {
    const changed =
      delta.beforeLabel !== delta.afterLabel || delta.beforeType !== delta.afterType;
    if (changed !== delta.changed) {
      ctx.addIssue({
        code: "custom",
        path: ["changed"],
        message: "Action delta changed flag must match before/after values."
      });
    }
  });
export type HumanReviewLearningActionDelta = z.infer<
  typeof humanReviewLearningActionDeltaSchema
>;

export const humanReviewLearningSourceCatalogMutationSchema = z
  .object({
    allowed: z.literal(false),
    applied: z.literal(false)
  })
  .strict();
export type HumanReviewLearningSourceCatalogMutation = z.infer<
  typeof humanReviewLearningSourceCatalogMutationSchema
>;

export const humanReviewLearningEventSchema = z
  .object({
    version: z.literal("human-review-learning.v1"),
    ingestedVia: z.enum(["terminal_resolution", "admin_import"]),
    ingestReason: z.string().min(1).max(500),
    ingestedAt: z.string().datetime(),
    eventId: z.string().min(1),
    requestId: z.string().min(1),
    caseId: z.string().min(1),
    capturedAt: z.string().datetime(),
    resolvedAt: z.string().datetime(),
    resolutionSummary: z.string().min(1).max(2000),
    rootCause: humanReviewLearningRootCauseSchema,
    rootCauseLabel: z.string().min(1),
    fixedSignals: z.array(z.string().min(1)),
    evidenceGaps: z.array(humanReviewLearningEvidenceGapSchema),
    verdictDelta: humanReviewLearningVerdictDeltaSchema,
    actionDelta: humanReviewLearningActionDeltaSchema,
    confidenceDelta: z.number(),
    postDecisionRecordId: z.string().min(1).nullable(),
    sourceCatalogMutation: humanReviewLearningSourceCatalogMutationSchema
  })
  .strict()
  .superRefine((event, ctx) => {
    const expectedEventId = `hrl_${event.requestId}_${event.resolvedAt}`;
    if (event.eventId !== expectedEventId) {
      ctx.addIssue({
        code: "custom",
        path: ["eventId"],
        message: "Learning eventId must be deterministic for requestId and resolvedAt."
      });
    }
  });
export type HumanReviewLearningEvent = z.infer<typeof humanReviewLearningEventSchema>;

export const humanReviewLearningEventsSchema = z.array(humanReviewLearningEventSchema);
export type HumanReviewLearningEvents = z.infer<typeof humanReviewLearningEventsSchema>;

export const humanReviewLearningIngestRequestSchema = z
  .object({
    mode: z.literal("admin_import"),
    reason: z.string().min(1).max(500),
    event: humanReviewLearningEventSchema
  })
  .strict()
  .superRefine((request, ctx) => {
    if (request.event.ingestedVia !== request.mode) {
      ctx.addIssue({
        code: "custom",
        path: ["event", "ingestedVia"],
        message: "Admin import event provenance must match ingest mode."
      });
    }
    if (request.event.ingestReason !== request.reason) {
      ctx.addIssue({
        code: "custom",
        path: ["event", "ingestReason"],
        message: "Admin import event reason must match ingest reason."
      });
    }
  });
export type HumanReviewLearningIngestRequest = z.infer<
  typeof humanReviewLearningIngestRequestSchema
>;

export const humanReviewLearningIngestResponseSchema = z.object({
  event: humanReviewLearningEventSchema,
  inserted: z.boolean()
});
export type HumanReviewLearningIngestResponse = z.infer<
  typeof humanReviewLearningIngestResponseSchema
>;

const rootCauseCountsShape = {
  missing_evidence: z.number().int().min(0),
  stale_evidence: z.number().int().min(0),
  conflicting_evidence: z.number().int().min(0),
  missing_signal: z.number().int().min(0),
  policy_ambiguity: z.number().int().min(0),
  operator_override_only: z.number().int().min(0)
} satisfies Record<HumanReviewLearningRootCause, z.ZodNumber>;

export const humanReviewLearningSummaryResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  totalEvents: z.number().int().min(0),
  rootCauseCounts: z.object(rootCauseCountsShape),
  verdictDeltaCounts: z.object({
    changed: z.number().int().min(0),
    unchanged: z.number().int().min(0)
  }),
  actionDeltaCounts: z.object({
    changed: z.number().int().min(0),
    unchanged: z.number().int().min(0)
  }),
  sourceCatalogMutationsApplied: z.literal(0)
});
export type HumanReviewLearningSummaryResponse = z.infer<
  typeof humanReviewLearningSummaryResponseSchema
>;

export const humanReviewLearningEventsResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  totalEvents: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  events: z.array(humanReviewLearningEventSchema)
});
export type HumanReviewLearningEventsResponse = z.infer<
  typeof humanReviewLearningEventsResponseSchema
>;

export const humanReviewLearningTopBlockerSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    rootCause: humanReviewLearningRootCauseSchema,
    dominantRootCause: humanReviewLearningRootCauseSchema,
    rootCauseCounts: z.object(rootCauseCountsShape),
    count: z.number().int().min(1),
    severity: humanReviewLearningBlockerSeveritySchema,
    lastSeenAt: z.string().datetime()
  })
  .strict();
export type HumanReviewLearningTopBlocker = z.infer<
  typeof humanReviewLearningTopBlockerSchema
>;

export const humanReviewLearningTopBlockersResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  blockers: z.array(humanReviewLearningTopBlockerSchema)
});
export type HumanReviewLearningTopBlockersResponse = z.infer<
  typeof humanReviewLearningTopBlockersResponseSchema
>;
