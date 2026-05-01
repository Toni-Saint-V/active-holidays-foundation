import { describe, expect, it } from "vitest";
import { humanReviewLearningEventSchema, type HumanReviewLearningEvent } from "@shared/contracts";
import { buildHumanReviewTrustCalibrationCockpit } from "./humanReviewTrustCalibrationCockpit";

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

describe("buildHumanReviewTrustCalibrationCockpit", () => {
  it("builds proposal-only cockpit lanes for recurring trust blockers", () => {
    const response = buildHumanReviewTrustCalibrationCockpit({
      events: [
        event(),
        event({
          requestId: "hr_case_2",
          resolvedAt: "2026-05-01T08:30:00.000Z",
          eventId: "hrl_hr_case_2_2026-05-01T08:30:00.000Z",
          capturedAt: "2026-05-01T08:30:00.000Z",
          confidenceDelta: -0.2
        })
      ],
      minOccurrences: 2,
      now: new Date("2026-05-01T09:00:00.000Z")
    });

    expect(response.emptyState).toBeNull();
    expect(response.summary).toMatchObject({
      recommendationCount: 1,
      proposalOnlyCount: 1,
      sourceCatalogMutationsApplied: 0,
      severityCounts: {
        high: 1
      },
      actionCounts: {
        fail_closed_until_evidence_refresh: 1
      }
    });
    expect(response.lanes[0]).toMatchObject({
      id: "urgent",
      count: 1
    });
    expect(response.lanes[0]?.items[0]).toMatchObject({
      priorityRank: 1,
      recommendation: {
        blockerId: "EVIDENCE_GATE:visa_rule",
        occurrences: 2,
        action: "fail_closed_until_evidence_refresh",
        safety: {
          mode: "proposal_only",
          sourceCatalogMutation: {
            allowed: false,
            applied: false
          }
        }
      },
      operatorDecision: {
        mode: "proposal_only"
      }
    });
    expect(response.lanes[0]?.items[0]?.actionPlan.terminalFallback.label).toContain(
      "ручную"
    );
  });

  it("returns an honest empty cockpit until a blocker crosses the threshold", () => {
    const response = buildHumanReviewTrustCalibrationCockpit({
      events: [event()],
      minOccurrences: 2,
      now: new Date("2026-05-01T09:00:00.000Z")
    });

    expect(response.lanes).toEqual([]);
    expect(response.summary.recommendationCount).toBe(0);
    expect(response.emptyState?.title).toContain("Нет безопасных");
  });
});
