import { z } from "zod";
import { actionTypeSchema } from "./action";
import { evidenceStatusSchema } from "./evidence";
import { freshnessStatusSchema } from "./trust";
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

export const humanReviewTrustCalibrationActionSchema = z.enum([
  "fail_closed_until_evidence_refresh",
  "fail_closed_until_signal_capture",
  "manual_policy_review_only",
  "informational_operator_note"
]);
export type HumanReviewTrustCalibrationAction = z.infer<
  typeof humanReviewTrustCalibrationActionSchema
>;

export const humanReviewTrustCalibrationTargetSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("evidence_gap"),
      gapIds: z.array(z.string().min(1)).min(1),
      ruleIds: z.array(z.string().min(1)).default([])
    })
    .strict(),
  z
    .object({
      type: z.literal("trust_state"),
      blockerId: z.string().min(1),
      evidenceStatus: evidenceStatusSchema,
      freshnessStatus: freshnessStatusSchema
    })
    .strict(),
  z
    .object({
      type: z.literal("signal"),
      signalIds: z.array(z.string().min(1)).min(1)
    })
    .strict(),
  z
    .object({
      type: z.literal("policy_rule"),
      ruleIds: z.array(z.string().min(1)).min(1)
    })
    .strict(),
  z
    .object({
      type: z.literal("legacy_event"),
      note: z.string().min(1)
    })
    .strict(),
  z
    .object({
      type: z.literal("operator_note")
    })
    .strict()
]);
export type HumanReviewTrustCalibrationTarget = z.infer<
  typeof humanReviewTrustCalibrationTargetSchema
>;

export const humanReviewTrustCalibrationSchema = z
  .object({
    version: z.literal("human-review-trust-calibration.v1"),
    calibrationId: z.string().min(1),
    eventId: z.string().min(1),
    requestId: z.string().min(1),
    caseId: z.string().min(1),
    rootCause: humanReviewLearningRootCauseSchema,
    action: humanReviewTrustCalibrationActionSchema,
    status: z.enum(["active", "informational"]),
    evidenceStatus: evidenceStatusSchema,
    freshnessStatus: freshnessStatusSchema,
    target: humanReviewTrustCalibrationTargetSchema,
    confidenceDelta: z.number(),
    applyToFutureAutomation: z.boolean(),
    reason: z.string().min(1).max(1000),
    createdAt: z.string().datetime(),
    sourceCatalogMutation: humanReviewLearningSourceCatalogMutationSchema
  })
  .strict()
  .superRefine((calibration, ctx) => {
    const expectedAction = calibrationActionForRootCause(calibration.rootCause);
    if (calibration.action !== expectedAction) {
      ctx.addIssue({
        code: "custom",
        path: ["action"],
        message: "Trust calibration action must match the root cause."
      });
    }
    if (
      calibration.applyToFutureAutomation &&
      (calibration.target.type === "legacy_event" || calibration.target.type === "operator_note")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["target"],
        message: "Active trust calibration must target a concrete blocker or signal."
      });
    }
    if (calibration.applyToFutureAutomation && calibration.status !== "active") {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Future automation calibration must be active."
      });
    }
    if (!calibration.applyToFutureAutomation && calibration.status !== "informational") {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Non-applicable calibration must be informational."
      });
    }
  });
export type HumanReviewTrustCalibration = z.infer<
  typeof humanReviewTrustCalibrationSchema
>;

function calibrationActionForRootCause(
  rootCause: HumanReviewLearningRootCause
): HumanReviewTrustCalibrationAction {
  switch (rootCause) {
    case "missing_evidence":
    case "stale_evidence":
    case "conflicting_evidence":
      return "fail_closed_until_evidence_refresh";
    case "missing_signal":
      return "fail_closed_until_signal_capture";
    case "policy_ambiguity":
      return "manual_policy_review_only";
    case "operator_override_only":
      return "informational_operator_note";
  }
}

function defaultCalibrationEvidenceStatus(
  rootCause: HumanReviewLearningRootCause
): z.infer<typeof evidenceStatusSchema> {
  switch (rootCause) {
    case "conflicting_evidence":
      return "conflicting";
    case "stale_evidence":
      return "stale";
    case "missing_evidence":
    case "missing_signal":
      return "missing";
    case "policy_ambiguity":
      return "manual_only";
    case "operator_override_only":
      return "valid";
  }
}

function defaultCalibrationFreshnessStatus(
  rootCause: HumanReviewLearningRootCause
): z.infer<typeof freshnessStatusSchema> {
  if (rootCause === "stale_evidence") return "stale";
  if (rootCause === "operator_override_only" || rootCause === "policy_ambiguity") {
    return "fresh";
  }
  return "unknown";
}

function legacyCalibration(value: Record<string, unknown>): HumanReviewTrustCalibration {
  const rootCause = humanReviewLearningRootCauseSchema.parse(value.rootCause);
  const requestId = String(value.requestId ?? "");
  const caseId = String(value.caseId ?? "");
  const resolvedAt = String(value.resolvedAt ?? value.capturedAt ?? value.ingestedAt ?? "");
  const eventId = String(value.eventId ?? `hrl_${requestId}_${resolvedAt}`);
  const action = calibrationActionForRootCause(rootCause);
  return {
    version: "human-review-trust-calibration.v1",
    calibrationId: `hrc_${requestId}_${resolvedAt}`,
    eventId,
    requestId,
    caseId,
    rootCause,
    action,
    status: "informational",
    evidenceStatus: defaultCalibrationEvidenceStatus(rootCause),
    freshnessStatus: defaultCalibrationFreshnessStatus(rootCause),
    target: {
      type: "legacy_event",
      note: "Legacy event imported before scoped trust calibration existed."
    },
    confidenceDelta: typeof value.confidenceDelta === "number" ? value.confidenceDelta : 0,
    applyToFutureAutomation: false,
    reason:
      typeof value.resolutionSummary === "string" && value.resolutionSummary.length > 0
        ? value.resolutionSummary
        : "Legacy learning event imported without explicit trust calibration.",
    createdAt: resolvedAt,
    sourceCatalogMutation: {
      allowed: false,
      applied: false
    }
  };
}

const rawHumanReviewLearningEventSchema = z
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
    trustCalibration: humanReviewTrustCalibrationSchema,
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
    if (event.trustCalibration.eventId !== event.eventId) {
      ctx.addIssue({
        code: "custom",
        path: ["trustCalibration", "eventId"],
        message: "Trust calibration must reference its learning event."
      });
    }
    if (event.trustCalibration.requestId !== event.requestId) {
      ctx.addIssue({
        code: "custom",
        path: ["trustCalibration", "requestId"],
        message: "Trust calibration requestId must match the learning event."
      });
    }
    if (event.trustCalibration.caseId !== event.caseId) {
      ctx.addIssue({
        code: "custom",
        path: ["trustCalibration", "caseId"],
        message: "Trust calibration caseId must match the learning event."
      });
    }
    if (event.trustCalibration.rootCause !== event.rootCause) {
      ctx.addIssue({
        code: "custom",
        path: ["trustCalibration", "rootCause"],
        message: "Trust calibration rootCause must match the learning event."
      });
    }
    if (event.trustCalibration.confidenceDelta !== event.confidenceDelta) {
      ctx.addIssue({
        code: "custom",
        path: ["trustCalibration", "confidenceDelta"],
        message: "Trust calibration confidenceDelta must match the learning event."
      });
    }
  });

export const humanReviewLearningEventSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const event = value as Record<string, unknown>;
  if (event.trustCalibration) return value;
  return {
    ...event,
    trustCalibration: legacyCalibration(event)
  };
}, rawHumanReviewLearningEventSchema);
export type HumanReviewLearningEvent = z.output<typeof rawHumanReviewLearningEventSchema>;

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

const calibrationActionCountsShape = {
  fail_closed_until_evidence_refresh: z.number().int().min(0),
  fail_closed_until_signal_capture: z.number().int().min(0),
  manual_policy_review_only: z.number().int().min(0),
  informational_operator_note: z.number().int().min(0)
} satisfies Record<HumanReviewTrustCalibrationAction, z.ZodNumber>;

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
  calibrationActionCounts: z.object(calibrationActionCountsShape),
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

export const humanReviewTrustCalibrationRecommendationSchema = z
  .object({
    id: z.string().min(1),
    blockerId: z.string().min(1),
    label: z.string().min(1),
    rootCause: humanReviewLearningRootCauseSchema,
    rootCauseCounts: z.object(rootCauseCountsShape),
    occurrences: z.number().int().min(1),
    severity: humanReviewLearningBlockerSeveritySchema,
    lastSeenAt: z.string().datetime(),
    confidenceImpact: z
      .object({
        averageDelta: z.number(),
        negativeEvents: z.number().int().min(0)
      })
      .strict(),
    action: humanReviewTrustCalibrationActionSchema,
    actionLabel: z.string().min(1),
    rationale: z.string().min(1),
    sourceEventIds: z.array(z.string().min(1)).min(1),
    safety: z
      .object({
        mode: z.literal("proposal_only"),
        sourceCatalogMutation: humanReviewLearningSourceCatalogMutationSchema
      })
      .strict()
  })
  .strict()
  .superRefine((recommendation, ctx) => {
    if (recommendation.occurrences !== recommendation.sourceEventIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["occurrences"],
        message: "Occurrences must match sourceEventIds length."
      });
    }
  });
export type HumanReviewTrustCalibrationRecommendation = z.infer<
  typeof humanReviewTrustCalibrationRecommendationSchema
>;

export const humanReviewTrustCalibrationResponseSchema = z
  .object({
    generatedAt: z.string().datetime(),
    totalEvents: z.number().int().min(0),
    minOccurrences: z.number().int().min(1),
    recommendations: z.array(humanReviewTrustCalibrationRecommendationSchema),
    emptyState: z
      .object({
        title: z.string().min(1),
        detail: z.string().min(1)
      })
      .strict()
      .nullable()
  })
  .strict()
  .superRefine((response, ctx) => {
    if (response.recommendations.length === 0 && response.emptyState === null) {
      ctx.addIssue({
        code: "custom",
        path: ["emptyState"],
        message: "Empty calibration responses must explain why no recommendation is available."
      });
    }
    if (response.recommendations.length > 0 && response.emptyState !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["emptyState"],
        message: "Non-empty calibration responses must not include an empty state."
      });
    }
  });
export type HumanReviewTrustCalibrationResponse = z.infer<
  typeof humanReviewTrustCalibrationResponseSchema
>;
