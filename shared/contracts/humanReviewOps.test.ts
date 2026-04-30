import { describe, expect, it } from "vitest";
import {
  humanReviewRequestSchema,
  humanReviewOpsDetailResponseSchema,
  humanReviewOpsQueueResponseSchema,
  type ResultPayload
} from "./index";

function resultFixture(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "case-1",
    computedAt: "2026-04-30T09:00:00.000Z",
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "human_review",
      label: "Передать кейс менеджеру",
      detail: "Автомат не может честно подтвердить маршрут.",
      targetScreen: "human-review",
      triggeredBy: ["EVIDENCE_GATE:rule-1"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [
      {
        ruleId: "EVIDENCE_GATE:rule-1",
        fired: true,
        category: "document",
        priority: 100,
        productType: "travel",
        output: { type: "human_review_trigger" },
        consumedSignals: ["insurance_ok"],
        explanation:
          "Evidence gate blocked rule-1: stale; automation=safe_auto; scope=travel."
      }
    ],
    documents: {
      score: 0.4,
      readyCount: 2,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.32,
      confidenceBreakdown: {
        value: 0.32,
        base: 0.32,
        capsApplied: ["manual_review"],
        factors: []
      },
      evidenceStatus: "stale",
      freshnessStatus: "stale",
      blockingReason: "Evidence is stale.",
      humanReviewReason: "Нужна ручная проверка evidence.",
      volatilityScore: 0.7,
      sources: [],
      lastCheckedAt: "2026-04-30T09:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "case-1",
      startedAt: "2026-04-30T09:00:00.000Z",
      finishedAt: "2026-04-30T09:00:01.000Z",
      totalMs: 1000,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 1000,
          inputsSummary: "case-1",
          outputSummary: "human review result",
          firedRuleIds: ["EVIDENCE_GATE:rule-1"],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("human review ops workbench contracts", () => {
  it("keeps queue responses compact while preserving current decision fields", () => {
    const parsed = humanReviewOpsQueueResponseSchema.parse({
      generatedAt: "2026-04-30T09:01:00.000Z",
      capabilities: {
        terminalResolve: "transition_only",
        learningFeedback: "available"
      },
      queue: [
        {
          requestId: "hr_case-1_1",
          caseId: "case-1",
          caseTitle: "Case 1",
          status: "submitted",
          submittedAt: "2026-04-30T09:00:00.000Z",
          updatedAt: "2026-04-30T09:00:00.000Z",
          channel: "email",
          contact: "traveler@example.com",
          snapshot: {
            decisionId: null,
            verdict: "HUMAN_REVIEW",
            confidence: 0.32,
            computedAt: "2026-04-30T09:00:00.000Z",
            lastCheckedAt: "2026-04-30T09:00:00.000Z",
            nextActionLabel: "Передать кейс менеджеру",
            summary: "Нужна ручная проверка."
          },
          currentVerdict: "HUMAN_REVIEW",
          currentNextActionLabel: "Передать кейс менеджеру",
          currentEvidenceStatus: "stale",
          blockerCount: 2,
          primaryBlockerLabel: "Evidence gate blocked rule-1.",
          ageMinutes: 1
        }
      ]
    });

    const first = parsed.queue[0];
    expect(first?.itemStatus).toBe("ready");
    if (first?.itemStatus !== "ready") {
      throw new Error("Expected a ready queue entry.");
    }
    expect(first.currentVerdict).toBe("HUMAN_REVIEW");
    expect(parsed.capabilities.learningFeedback).toBe("available");
  });

  it("accepts orphaned queue entries without forcing the whole queue to fail", () => {
    const parsed = humanReviewOpsQueueResponseSchema.parse({
      generatedAt: "2026-04-30T09:01:00.000Z",
      capabilities: {
        terminalResolve: "transition_only",
        learningFeedback: "available"
      },
      queue: [
        {
          itemStatus: "orphaned_case",
          requestId: "hr_missing-case_1",
          caseId: "missing-case",
          status: "submitted",
          submittedAt: "2026-04-30T09:00:00.000Z",
          updatedAt: "2026-04-30T09:00:00.000Z",
          channel: "email",
          contact: "traveler@example.com",
          snapshot: {
            decisionId: null,
            verdict: "HUMAN_REVIEW",
            confidence: 0,
            computedAt: "2026-04-30T09:00:00.000Z",
            lastCheckedAt: "2026-04-30T09:00:00.000Z",
            nextActionLabel: "Передать кейс менеджеру",
            summary: "Нужна ручная проверка."
          },
          ageMinutes: 1,
          recoveryLabel: "Связанный кейс не найден."
        }
      ]
    });

    expect(parsed.queue[0]?.itemStatus).toBe("orphaned_case");
  });

  it("models detail without DecisionResult or catalog-mutation learning claims", () => {
    const parsed = humanReviewOpsDetailResponseSchema.parse({
      generatedAt: "2026-04-30T09:01:00.000Z",
      capabilities: {
        terminalResolve: "transition_only",
        learningFeedback: "available"
      },
      detail: {
        request: {
          id: "hr_case-1_1",
          caseId: "case-1",
          status: "resolved",
          channel: "email",
          contact: "traveler@example.com",
          message: "Прошу проверить кейс вручную.",
          createdAt: "2026-04-30T09:00:00.000Z",
          updatedAt: "2026-04-30T09:05:00.000Z",
          closedAt: "2026-04-30T09:05:00.000Z",
          durability: "persisted",
          resolution: {
            summary: "Проверка завершена.",
            resolvedAt: "2026-04-30T09:05:00.000Z",
            changedBy: "ops"
          },
          snapshot: {
            decisionId: null,
            verdict: "HUMAN_REVIEW",
            confidence: 0.32,
            computedAt: "2026-04-30T09:00:00.000Z",
            lastCheckedAt: "2026-04-30T09:00:00.000Z",
            nextActionLabel: "Передать кейс менеджеру",
            summary: "Нужна ручная проверка."
          },
          events: [
            {
              id: "hr_case-1_1_submitted",
              at: "2026-04-30T09:00:00.000Z",
              type: "submitted",
              status: "submitted",
              changedBy: "traveler",
              note: null
            }
          ]
        },
        caseSummary: {
          id: "case-1",
          title: "Case 1",
          productType: "travel",
          updatedAt: "2026-04-30T09:00:00.000Z"
        },
        currentResult: resultFixture(),
        blockingReasons: [],
        auditTrail: [],
        resolution: {
          status: "resolved",
          closedAt: "2026-04-30T09:05:00.000Z",
          note: "Проверка завершена.",
          mode: "transition_only",
          recompute: null
        },
        learning: {
          source: "learning_api",
          summary: "Learning feedback is captured after terminal operator resolution."
        },
        operatorNextActions: []
      }
    });

    expect("decisionResult" in parsed.detail).toBe(false);
    expect(parsed.detail.learning.source).toBe("learning_api");
    expect(parsed.detail.resolution).not.toBeNull();
    expect(parsed.detail.resolution?.recompute).toBeNull();
    expect(parsed.detail.operatorNextActions).toEqual([]);
  });

  it("rejects terminal detail with active operator actions", () => {
    const response = {
      generatedAt: "2026-04-30T09:01:00.000Z",
      capabilities: {
        terminalResolve: "transition_only",
        learningFeedback: "available"
      },
      detail: {
        request: {
          id: "hr_case-1_1",
          caseId: "case-1",
          status: "resolved",
          channel: "email",
          contact: "traveler@example.com",
          message: "Прошу проверить кейс вручную.",
          createdAt: "2026-04-30T09:00:00.000Z",
          updatedAt: "2026-04-30T09:05:00.000Z",
          closedAt: "2026-04-30T09:05:00.000Z",
          durability: "persisted",
          resolution: {
            summary: "Проверка завершена.",
            resolvedAt: "2026-04-30T09:05:00.000Z",
            changedBy: "ops"
          },
          snapshot: {
            decisionId: null,
            verdict: "HUMAN_REVIEW",
            confidence: 0.32,
            computedAt: "2026-04-30T09:00:00.000Z",
            lastCheckedAt: "2026-04-30T09:00:00.000Z",
            nextActionLabel: "Передать кейс менеджеру",
            summary: "Нужна ручная проверка."
          },
          events: [
            {
              id: "hr_case-1_1_submitted",
              at: "2026-04-30T09:00:00.000Z",
              type: "submitted",
              status: "submitted",
              changedBy: "traveler",
              note: null
            }
          ]
        },
        caseSummary: {
          id: "case-1",
          title: "Case 1",
          productType: "travel",
          updatedAt: "2026-04-30T09:00:00.000Z"
        },
        currentResult: resultFixture(),
        blockingReasons: [],
        auditTrail: [],
        resolution: {
          status: "resolved",
          closedAt: "2026-04-30T09:05:00.000Z",
          note: "Проверка завершена.",
          mode: "transition_only",
          recompute: null
        },
        learning: {
          source: "learning_api",
          summary: "Learning feedback is captured after terminal operator resolution."
        },
        operatorNextActions: [
          {
            id: "move_in_review",
            label: "Взять в работу",
            transitionStatus: "in_review",
            internalOnly: true
          }
        ]
      }
    };

    const parsed = humanReviewOpsDetailResponseSchema.safeParse(response);

    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("Terminal detail with actions should be rejected.");
    expect(parsed.error.issues[0]?.path).toEqual(["detail", "operatorNextActions"]);
  });

  it("rejects inconsistent human review closedAt lifecycle", () => {
    const base = {
      id: "hr_case-1_1",
      caseId: "case-1",
      status: "resolved",
      channel: "email",
      contact: "traveler@example.com",
      message: "Прошу проверить кейс вручную.",
      createdAt: "2026-04-30T09:00:00.000Z",
      updatedAt: "2026-04-30T09:05:00.000Z",
      closedAt: null,
      durability: "persisted",
      snapshot: {
        decisionId: null,
        verdict: "HUMAN_REVIEW",
        confidence: 0.32,
        computedAt: "2026-04-30T09:00:00.000Z",
        lastCheckedAt: "2026-04-30T09:00:00.000Z",
        nextActionLabel: "Передать кейс менеджеру",
        summary: "Нужна ручная проверка."
      },
      events: [
        {
          id: "hr_case-1_1_submitted",
          at: "2026-04-30T09:00:00.000Z",
          type: "submitted",
          status: "submitted",
          changedBy: "traveler",
          note: null
        }
      ]
    };

    const terminal = humanReviewRequestSchema.safeParse(base);
    const active = humanReviewRequestSchema.safeParse({
      ...base,
      status: "submitted",
      closedAt: "2026-04-30T09:05:00.000Z"
    });

    expect(terminal.success).toBe(false);
    expect(active.success).toBe(false);
  });
});
