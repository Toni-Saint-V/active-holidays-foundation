import { describe, expect, it } from "vitest";
import type {
  HumanReviewOpsBlocker,
  HumanReviewRequest,
  ResultPayload,
  Trust
} from "@shared/contracts";
import { buildHumanReviewLearningEvent } from "./humanReviewLearning";

const requestBefore: HumanReviewRequest = {
  id: "hr_case_1",
  caseId: "case_1",
  status: "submitted",
  channel: "email",
  contact: "ops@example.com",
  message: "Нужна ручная проверка кейса.",
  createdAt: "2026-04-30T09:00:00.000Z",
  updatedAt: "2026-04-30T09:00:00.000Z",
  closedAt: null,
  durability: "persisted",
  handoff: null,
  resolution: null,
  snapshot: {
    decisionId: null,
    verdict: "HUMAN_REVIEW",
    confidence: 0.2,
    computedAt: "2026-04-30T09:00:00.000Z",
    lastCheckedAt: "2026-04-30T09:00:00.000Z",
    nextActionLabel: "Передать кейс менеджеру",
    summary: "Нужна ручная проверка."
  },
  events: [
    {
      id: "hr_case_1_submitted",
      at: "2026-04-30T09:00:00.000Z",
      type: "submitted",
      status: "submitted",
      changedBy: "traveler",
      note: null
    }
  ]
};

const requestAfter: HumanReviewRequest = {
  ...requestBefore,
  status: "resolved",
  updatedAt: "2026-04-30T10:00:00.000Z",
  closedAt: "2026-04-30T10:00:00.000Z",
  resolution: {
    summary: "Оператор закрыл проверку.",
    resolvedAt: "2026-04-30T10:00:00.000Z",
    changedBy: "ops",
    postDecisionRecordId: "dec_case_1_1"
  }
};

function trust(overrides: Partial<Trust> = {}): Trust {
  return {
    confidence: 0.4,
    confidenceBreakdown: {
      value: 0.4,
      base: 0.4,
      capsApplied: [],
      factors: []
    },
    evidenceStatus: "valid",
    freshnessStatus: "fresh",
    blockingReason: null,
    humanReviewReason: null,
    volatilityScore: 0.1,
    sources: [],
    lastCheckedAt: "2026-04-30T10:00:00.000Z",
    ...overrides
  };
}

function result(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "case_1",
    computedAt: "2026-04-30T10:00:00.000Z",
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "human_review",
      label: "Передать кейс менеджеру",
      detail: "Нужна ручная проверка.",
      targetScreen: "human-review",
      triggeredBy: []
    },
    decisionSignals: [
      {
        id: "insurance_ok",
        label: "Страховка",
        displayValue: "есть",
        importance: 0.4,
        present: true
      }
    ],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 0,
      readyCount: 0,
      requiredCount: 0,
      items: []
    },
    trust: trust(),
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "case_1",
      startedAt: "2026-04-30T10:00:00.000Z",
      finishedAt: "2026-04-30T10:00:01.000Z",
      totalMs: 1000,
      steps: [],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

const policyBlocker: HumanReviewOpsBlocker = {
  id: "manual_policy",
  type: "human_review_trigger",
  ruleId: "manual_policy",
  label: "Правило требует ручной проверки.",
  detail: "Policy requires manual interpretation.",
  severity: "high",
  triggeredBy: []
};

function eventRootCause(input: {
  result?: ResultPayload;
  blockers?: HumanReviewOpsBlocker[];
}) {
  return buildHumanReviewLearningEvent({
    requestBefore,
    requestAfter,
    postResult: input.result ?? result(),
    blockers: input.blockers ?? [],
    postDecisionRecordId: "dec_case_1_1"
  }).rootCause;
}

describe("buildHumanReviewLearningEvent", () => {
  it("classifies every root-cause branch with deterministic priority", () => {
    expect(
      eventRootCause({
        result: result({
          trust: trust({
            evidenceStatus: "conflicting",
            freshnessStatus: "stale"
          })
        }),
        blockers: [policyBlocker]
      })
    ).toBe("conflicting_evidence");

    expect(
      eventRootCause({
        result: result({
          trust: trust({
            evidenceStatus: "stale",
            freshnessStatus: "stale"
          })
        })
      })
    ).toBe("stale_evidence");

    expect(
      eventRootCause({
        result: result({
          trust: trust({
            evidenceStatus: "missing",
            freshnessStatus: "unknown"
          })
        })
      })
    ).toBe("missing_evidence");

    expect(
      eventRootCause({
        result: result({
          decisionSignals: [
            {
              id: "insurance_ok",
              label: "Страховка",
              displayValue: "нет данных",
              importance: 0.4,
              present: false
            }
          ]
        })
      })
    ).toBe("missing_signal");

    expect(eventRootCause({ blockers: [policyBlocker] })).toBe("policy_ambiguity");
    expect(eventRootCause({})).toBe("operator_override_only");
  });

  it("derives verdict, action and confidence deltas without mutating catalogs", () => {
    const event = buildHumanReviewLearningEvent({
      requestBefore,
      requestAfter,
      postResult: result({
        verdict: "GO_WITH_CONDITIONS",
        nextAction: {
          type: "upload_missing_docs",
          priority: "blocking",
          label: "Обновить документы",
          detail: "Нужно загрузить недостающие документы.",
          targetScreen: "documents",
          triggeredBy: ["documents_ready_count"]
        },
        trust: trust({
          confidence: 0.55
        })
      }),
      blockers: [policyBlocker],
      postDecisionRecordId: "dec_case_1_1"
    });

    expect(event.eventId).toBe("hrl_hr_case_1_2026-04-30T10:00:00.000Z");
    expect(event.verdictDelta).toEqual({
      before: "HUMAN_REVIEW",
      after: "GO_WITH_CONDITIONS",
      changed: true
    });
    expect(event.actionDelta.changed).toBe(true);
    expect(event.confidenceDelta).toBe(0.35);
    expect(event.trustCalibration).toMatchObject({
      calibrationId: "hrc_hr_case_1_2026-04-30T10:00:00.000Z",
      action: "manual_policy_review_only",
      status: "active",
      target: {
        type: "policy_rule",
        ruleIds: ["manual_policy"]
      },
      confidenceDelta: 0.35,
      applyToFutureAutomation: true,
      evidenceStatus: "valid",
      freshnessStatus: "fresh"
    });
    expect(event.trustCalibration.reason).toContain("ручной интерпретации");
    expect(event.sourceCatalogMutation).toEqual({
      allowed: false,
      applied: false
    });
  });

  it("scopes trust calibration to the blocker or signal that caused review", () => {
    const evidenceEvent = buildHumanReviewLearningEvent({
      requestBefore,
      requestAfter,
      postResult: result({
        trust: trust({
          evidenceStatus: "conflicting",
          freshnessStatus: "unknown"
        })
      }),
      blockers: [
        {
          id: "EVIDENCE_GATE:visa_rule",
          type: "evidence_gate",
          ruleId: "visa_rule",
          label: "Evidence gate заблокировал visa_rule.",
          detail: "Источники конфликтуют.",
          severity: "high",
          triggeredBy: []
        }
      ],
      postDecisionRecordId: "dec_case_1_1"
    });

    expect(evidenceEvent.trustCalibration.target).toEqual({
      type: "evidence_gap",
      gapIds: ["EVIDENCE_GATE:visa_rule"],
      ruleIds: ["visa_rule"]
    });

    const signalEvent = buildHumanReviewLearningEvent({
      requestBefore,
      requestAfter,
      postResult: result({
        decisionSignals: [
          {
            id: "insurance_ok",
            label: "Доход",
            displayValue: "нет данных",
            importance: 0.5,
            present: false
          }
        ]
      }),
      blockers: [],
      postDecisionRecordId: "dec_case_1_1"
    });

    expect(signalEvent.trustCalibration.target).toEqual({
      type: "signal",
      signalIds: ["insurance_ok"]
    });

    const trustOnlyEvent = buildHumanReviewLearningEvent({
      requestBefore,
      requestAfter,
      postResult: result({
        trust: trust({
          evidenceStatus: "stale",
          freshnessStatus: "stale",
          blockingReason: "Trust state requires a human review.",
          humanReviewReason: "Trust state requires a human review."
        })
      }),
      blockers: [
        {
          id: "trust:case_1:stale:trust-state",
          type: "trust",
          ruleId: null,
          label: "Доверие к автоматическому решению недостаточно.",
          detail: "Trust state requires a human review.",
          severity: "high",
          triggeredBy: []
        }
      ],
      postDecisionRecordId: "dec_case_1_1"
    });

    expect(trustOnlyEvent.trustCalibration.target).toEqual({
      type: "trust_state",
      blockerId: "trust:case_1:stale:trust-state",
      evidenceStatus: "stale",
      freshnessStatus: "stale"
    });
  });
});
