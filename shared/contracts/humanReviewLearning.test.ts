import { describe, expect, it } from "vitest";
import {
  humanReviewLearningEventSchema,
  humanReviewLearningEventsResponseSchema,
  humanReviewLearningIngestRequestSchema,
  humanReviewLearningIngestResponseSchema,
  humanReviewLearningRootCauseSchema,
  humanReviewLearningSummaryResponseSchema,
  humanReviewLearningTopBlockersResponseSchema
} from "./humanReviewLearning";

const baseEvent = {
  version: "human-review-learning.v1",
  ingestedVia: "terminal_resolution",
  ingestReason: "Captured automatically when operator resolved human review.",
  ingestedAt: "2026-04-30T10:00:00.000Z",
  eventId: "hrl_hr_case_1_2026-04-30T10:00:00.000Z",
  requestId: "hr_case_1",
  caseId: "case_1",
  capturedAt: "2026-04-30T10:01:00.000Z",
  resolvedAt: "2026-04-30T10:00:00.000Z",
  resolutionSummary: "Оператор закрыл проверку без автоматического совета.",
  rootCause: "stale_evidence",
  rootCauseLabel: "Источники устарели",
  fixedSignals: [],
  evidenceGaps: [
    {
      id: "EVIDENCE_GATE:rule_1",
      label: "Evidence gate заблокировал rule_1.",
      detail: "Источник устарел.",
      severity: "high",
      ruleId: "rule_1"
    }
  ],
  verdictDelta: {
    before: "HUMAN_REVIEW",
    after: "HUMAN_REVIEW",
    changed: false
  },
  actionDelta: {
    beforeLabel: "Передать кейс менеджеру",
    afterLabel: "Передать кейс менеджеру",
    beforeType: "send_for_review",
    afterType: "send_for_review",
    changed: false
  },
  confidenceDelta: 0,
  postDecisionRecordId: "dec_case_1_1",
  sourceCatalogMutation: {
    allowed: false,
    applied: false
  }
};

describe("human review learning contracts", () => {
  it("accepts the required normalized root-cause categories", () => {
    expect(humanReviewLearningRootCauseSchema.options).toEqual([
      "missing_evidence",
      "stale_evidence",
      "conflicting_evidence",
      "missing_signal",
      "policy_ambiguity",
      "operator_override_only"
    ]);
  });

  it("accepts a normalized feedback event and rejects catalog mutation claims", () => {
    expect(humanReviewLearningEventSchema.parse(baseEvent).eventId).toBe(
      "hrl_hr_case_1_2026-04-30T10:00:00.000Z"
    );

    const mutated = {
      ...baseEvent,
      sourceCatalogMutation: {
        allowed: true,
        applied: true
      }
    };

    expect(humanReviewLearningEventSchema.safeParse(mutated).success).toBe(false);
  });

  it("defines replay-safe ingest and aggregate response shapes", () => {
    const adminEvent = {
      ...baseEvent,
      ingestedVia: "admin_import",
      ingestReason: "Backfill verified historical learning event."
    };

    expect(
      humanReviewLearningIngestRequestSchema.parse({
        mode: "admin_import",
        reason: "Backfill verified historical learning event.",
        event: adminEvent
      }).mode
    ).toBe("admin_import");

    expect(
      humanReviewLearningIngestResponseSchema.parse({
        event: baseEvent,
        inserted: false
      }).inserted
    ).toBe(false);

    expect(
      humanReviewLearningSummaryResponseSchema.parse({
        generatedAt: "2026-04-30T10:02:00.000Z",
        totalEvents: 1,
        rootCauseCounts: {
          missing_evidence: 0,
          stale_evidence: 1,
          conflicting_evidence: 0,
          missing_signal: 0,
          policy_ambiguity: 0,
          operator_override_only: 0
        },
        verdictDeltaCounts: {
          changed: 0,
          unchanged: 1
        },
        actionDeltaCounts: {
          changed: 0,
          unchanged: 1
        },
        sourceCatalogMutationsApplied: 0
      }).totalEvents
    ).toBe(1);

    expect(
      humanReviewLearningEventsResponseSchema.parse({
        generatedAt: "2026-04-30T10:02:00.000Z",
        totalEvents: 1,
        limit: 50,
        offset: 0,
        events: [baseEvent]
      }).events
    ).toHaveLength(1);

    expect(
      humanReviewLearningTopBlockersResponseSchema.parse({
        generatedAt: "2026-04-30T10:02:00.000Z",
        blockers: [
          {
            id: "EVIDENCE_GATE:rule_1",
            label: "Evidence gate заблокировал rule_1.",
            rootCause: "stale_evidence",
            dominantRootCause: "stale_evidence",
            rootCauseCounts: {
              missing_evidence: 0,
              stale_evidence: 1,
              conflicting_evidence: 0,
              missing_signal: 0,
              policy_ambiguity: 0,
              operator_override_only: 0
            },
            count: 1,
            severity: "high",
            lastSeenAt: "2026-04-30T10:01:00.000Z"
          }
        ]
      }).blockers[0].count
    ).toBe(1);
  });
});
