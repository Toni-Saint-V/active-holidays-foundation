import { describe, expect, it } from "vitest";
import {
  humanReviewLearningEventSchema,
  humanReviewLearningEventsResponseSchema,
  humanReviewLearningIngestRequestSchema,
  humanReviewLearningIngestResponseSchema,
  humanReviewLearningRootCauseSchema,
  humanReviewLearningSummaryResponseSchema,
  humanReviewTrustCalibrationSchema,
  humanReviewTrustCalibrationCockpitResponseSchema,
  humanReviewTrustCalibrationResponseSchema,
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
    const parsed = humanReviewLearningEventSchema.parse(baseEvent);
    expect(parsed.eventId).toBe(
      "hrl_hr_case_1_2026-04-30T10:00:00.000Z"
    );
    expect(parsed.trustCalibration).toMatchObject({
      version: "human-review-trust-calibration.v1",
      calibrationId: "hrc_hr_case_1_2026-04-30T10:00:00.000Z",
      action: "fail_closed_until_evidence_refresh",
      status: "informational",
      target: {
        type: "legacy_event"
      },
      applyToFutureAutomation: false,
      sourceCatalogMutation: {
        allowed: false,
        applied: false
      }
    });

    expect(
      humanReviewTrustCalibrationSchema.safeParse({
        ...parsed.trustCalibration,
        applyToFutureAutomation: true,
        status: "active"
      }).success
    ).toBe(false);
    expect(
      humanReviewTrustCalibrationSchema.safeParse({
        ...parsed.trustCalibration,
        status: "active",
        target: {
          type: "evidence_gap",
          gapIds: ["EVIDENCE_GATE:rule_1"],
          ruleIds: ["rule_1"]
        },
        applyToFutureAutomation: true
      }).success
    ).toBe(true);
    expect(
      humanReviewTrustCalibrationSchema.safeParse({
        ...parsed.trustCalibration,
        action: "informational_operator_note"
      }).success
    ).toBe(false);

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
        calibrationActionCounts: {
          fail_closed_until_evidence_refresh: 1,
          fail_closed_until_signal_capture: 0,
          manual_policy_review_only: 0,
          informational_operator_note: 0
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

    expect(
      humanReviewTrustCalibrationResponseSchema.parse({
        generatedAt: "2026-05-01T09:00:00.000Z",
        totalEvents: 2,
        minOccurrences: 2,
        recommendations: [
          {
            id: "cal_EVIDENCE_GATE:rule_1",
            blockerId: "EVIDENCE_GATE:rule_1",
            label: "Evidence gate заблокировал rule_1.",
            rootCause: "stale_evidence",
            rootCauseCounts: {
              missing_evidence: 0,
              stale_evidence: 2,
              conflicting_evidence: 0,
              missing_signal: 0,
              policy_ambiguity: 0,
              operator_override_only: 0
            },
            occurrences: 2,
            severity: "high",
            lastSeenAt: "2026-05-01T08:30:00.000Z",
            confidenceImpact: {
              averageDelta: -0.1,
              negativeEvents: 2
            },
            action: "fail_closed_until_evidence_refresh",
            actionLabel: "Оставить закрытым до обновления источников",
            rationale:
              "2 повторных закрытия ручной проверки: источники устарели. Рекомендация только для операционного разбора, без автоматической правки каталогов.",
            sourceEventIds: [
              "hrl_hr_1_2026-05-01T08:00:00.000Z",
              "hrl_hr_2_2026-05-01T08:30:00.000Z"
            ],
            safety: {
              mode: "proposal_only",
              sourceCatalogMutation: {
                allowed: false,
                applied: false
              }
            }
          }
        ],
        emptyState: null
      }).recommendations[0].safety.sourceCatalogMutation.applied
    ).toBe(false);

    expect(
      humanReviewTrustCalibrationCockpitResponseSchema.parse({
        generatedAt: "2026-05-01T09:00:00.000Z",
        totalEvents: 2,
        thresholds: {
          minOccurrences: 2,
          limit: 10
        },
        summary: {
          recommendationCount: 1,
          sourceCatalogMutationsApplied: 0,
          proposalOnlyCount: 1,
          severityCounts: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0
          },
          actionCounts: {
            fail_closed_until_evidence_refresh: 1,
            fail_closed_until_signal_capture: 0,
            manual_policy_review_only: 0,
            informational_operator_note: 0
          }
        },
        lanes: [
          {
            id: "urgent",
            title: "Срочные блокеры",
            description: "Высокий риск.",
            count: 1,
            items: [
              {
                priorityRank: 1,
                recommendation: {
                  id: "cal_EVIDENCE_GATE:rule_1",
                  blockerId: "EVIDENCE_GATE:rule_1",
                  label: "Evidence gate заблокировал rule_1.",
                  rootCause: "stale_evidence",
                  rootCauseCounts: {
                    missing_evidence: 0,
                    stale_evidence: 2,
                    conflicting_evidence: 0,
                    missing_signal: 0,
                    policy_ambiguity: 0,
                    operator_override_only: 0
                  },
                  occurrences: 2,
                  severity: "high",
                  lastSeenAt: "2026-05-01T08:30:00.000Z",
                  confidenceImpact: {
                    averageDelta: -0.1,
                    negativeEvents: 2
                  },
                  action: "fail_closed_until_evidence_refresh",
                  actionLabel: "Оставить закрытым до обновления источников",
                  rationale:
                    "2 повторных закрытия ручной проверки: источники устарели. Рекомендация только для операционного разбора, без автоматической правки каталогов.",
                  sourceEventIds: [
                    "hrl_hr_1_2026-05-01T08:00:00.000Z",
                    "hrl_hr_2_2026-05-01T08:30:00.000Z"
                  ],
                  safety: {
                    mode: "proposal_only",
                    sourceCatalogMutation: {
                      allowed: false,
                      applied: false
                    }
                  }
                },
                actionPlan: {
                  title: "Разобрать доказательную базу",
                  steps: ["Проверить источники."],
                  terminalFallback: {
                    label: "Оставить ручную проверку",
                    detail: "Без свежего источника автоматический совет не выдаётся."
                  }
                },
                operatorDecision: {
                  mode: "proposal_only",
                  primaryLabel: "Подготовить разбор",
                  disabledReason: "Автоматическое применение отключено."
                }
              }
            ]
          }
        ],
        emptyState: null,
        safety: {
          title: "Только предложение",
          detail: "Каталоги источников не меняются.",
          sourceCatalogMutation: {
            allowed: false,
            applied: false
          }
        }
      }).summary.sourceCatalogMutationsApplied
    ).toBe(0);

    expect(
      humanReviewTrustCalibrationCockpitResponseSchema.safeParse({
        generatedAt: "2026-05-01T09:00:00.000Z",
        totalEvents: 0,
        thresholds: {
          minOccurrences: 2,
          limit: 10
        },
        summary: {
          recommendationCount: 0,
          sourceCatalogMutationsApplied: 0,
          proposalOnlyCount: 0,
          severityCounts: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0
          },
          actionCounts: {
            fail_closed_until_evidence_refresh: 0,
            fail_closed_until_signal_capture: 0,
            manual_policy_review_only: 0,
            informational_operator_note: 0
          }
        },
        lanes: [],
        emptyState: {
          title: "Нет безопасных действий",
          detail: "Повторов пока недостаточно.",
          nextCheckLabel: "Продолжать сбор решений"
        },
        safety: {
          title: "Только предложение",
          detail: "Каталоги источников не меняются.",
          sourceCatalogMutation: {
            allowed: false,
            applied: false
          }
        }
      }).success
    ).toBe(false);
  });
});
