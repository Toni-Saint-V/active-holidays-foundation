import { describe, expect, it } from "vitest";
import { humanReviewLearningEventSchema, type HumanReviewLearningEvent } from "@shared/contracts";
import { buildHumanReviewTrustCalibration } from "./humanReviewTrustCalibration";

function event(overrides: Partial<HumanReviewLearningEvent> = {}): HumanReviewLearningEvent {
  const requestId = overrides.requestId ?? "hr_case_1";
  const resolvedAt = overrides.resolvedAt ?? "2026-05-01T08:00:00.000Z";
  return humanReviewLearningEventSchema.parse({
    version: "human-review-learning.v1",
    ingestedVia: "terminal_resolution",
    ingestReason: "Captured automatically when operator resolved human review.",
    ingestedAt: resolvedAt,
    eventId: `hrl_${requestId}_${resolvedAt}`,
    requestId,
    caseId: "case_1",
    capturedAt: resolvedAt,
    resolvedAt,
    resolutionSummary: "Оператор закрыл проверку.",
    rootCause: "stale_evidence",
    rootCauseLabel: "Источники устарели",
    fixedSignals: [],
    evidenceGaps: [
      {
        id: "EVIDENCE_GATE:visa_rule",
        label: "Evidence gate заблокировал visa_rule.",
        detail: "Источник устарел.",
        severity: "high",
        ruleId: "visa_rule"
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
    confidenceDelta: -0.1,
    postDecisionRecordId: "dec_case_1_1",
    sourceCatalogMutation: {
      allowed: false,
      applied: false
    },
    ...overrides
  });
}

describe("buildHumanReviewTrustCalibration", () => {
  it("turns repeated learning blockers into proposal-only calibration recommendations", () => {
    const response = buildHumanReviewTrustCalibration({
      events: [
        event(),
        event({
          requestId: "hr_case_2",
          resolvedAt: "2026-05-01T08:30:00.000Z",
          eventId: "hrl_hr_case_2_2026-05-01T08:30:00.000Z",
          capturedAt: "2026-05-01T08:30:00.000Z",
          confidenceDelta: -0.2
        }),
        event({
          requestId: "hr_case_3",
          resolvedAt: "2026-05-01T08:45:00.000Z",
          eventId: "hrl_hr_case_3_2026-05-01T08:45:00.000Z",
          capturedAt: "2026-05-01T08:45:00.000Z",
          rootCause: "missing_signal",
          rootCauseLabel: "Не хватает входного сигнала",
          fixedSignals: ["income"],
          evidenceGaps: []
        })
      ],
      minOccurrences: 2,
      now: new Date("2026-05-01T09:00:00.000Z")
    });

    expect(response.emptyState).toBeNull();
    expect(response.recommendations).toHaveLength(1);
    expect(response.recommendations[0]).toMatchObject({
      blockerId: "EVIDENCE_GATE:visa_rule",
      rootCause: "stale_evidence",
      occurrences: 2,
      action: "fail_closed_until_evidence_refresh",
      confidenceImpact: {
        averageDelta: -0.15,
        negativeEvents: 2
      },
      safety: {
        mode: "proposal_only",
        sourceCatalogMutation: {
          allowed: false,
          applied: false
        }
      }
    });
  });

  it("returns an honest empty state until blockers repeat above threshold", () => {
    const response = buildHumanReviewTrustCalibration({
      events: [event()],
      minOccurrences: 2,
      now: new Date("2026-05-01T09:00:00.000Z")
    });

    expect(response.recommendations).toEqual([]);
    expect(response.emptyState?.title).toContain("Недостаточно");
  });
});
