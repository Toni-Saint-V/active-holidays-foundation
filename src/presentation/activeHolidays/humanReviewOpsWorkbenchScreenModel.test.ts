import { describe, expect, it } from "vitest";
import type {
  HumanReviewOpsDetailResponse,
  HumanReviewOpsQueueResponse
} from "@shared/contracts";
import { buildHumanReviewOpsWorkbenchScreenModel } from "./humanReviewOpsWorkbenchScreenModel";

const queueBase: HumanReviewOpsQueueResponse = {
  generatedAt: "2026-04-30T09:01:00.000Z",
  capabilities: {
    terminalResolve: "transition_only",
    learningFeedback: "unavailable"
  },
  queue: []
};

const detailBase: HumanReviewOpsDetailResponse["detail"] = {
  request: {
    id: "hr_case_1",
    caseId: "case-1",
    status: "submitted",
    channel: "email",
    contact: "traveler@example.com",
    message: "Прошу проверить кейс вручную.",
    createdAt: "2026-04-30T09:00:00.000Z",
    updatedAt: "2026-04-30T09:00:00.000Z",
    closedAt: null,
    durability: "persisted",
    handoff: null,
    resolution: null,
    snapshot: {
      decisionId: null,
      verdict: "HUMAN_REVIEW",
      confidence: 0.31,
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
  },
  caseSummary: {
    id: "case-1",
    title: "Case 1",
    productType: "travel",
    updatedAt: "2026-04-30T09:00:00.000Z"
  },
  currentResult: {
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
    ruleResults: [],
    documents: {
      score: 0.4,
      readyCount: 2,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.31,
      confidenceBreakdown: {
        value: 0.31,
        base: 0.31,
        capsApplied: ["manual_review"],
        factors: []
      },
      evidenceStatus: "stale",
      freshnessStatus: "stale",
      blockingReason: "Evidence stale.",
      humanReviewReason: "Нужна ручная проверка.",
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
      steps: [],
      preview: false
    },
    preview: false
  },
  blockingReasons: [
    {
      id: "EVIDENCE_GATE:rule-1",
      type: "evidence_gate",
      ruleId: "rule-1",
      label: "Evidence gate blocked rule-1.",
      detail: "Evidence gate blocked rule-1: stale.",
      severity: "high",
      triggeredBy: ["insurance_ok"]
    }
  ],
  auditTrail: [
    {
      id: "hr_case_1_submitted",
      at: "2026-04-30T09:00:00.000Z",
      label: "Запрос отправлен",
      actor: "traveler",
      note: null
    }
  ],
  resolution: null,
  learning: {
    source: "unavailable",
    summary: null
  },
  operatorNextActions: [
    {
      id: "move_in_review",
      label: "Взять в работу",
      transitionStatus: "in_review",
      internalOnly: true
    }
  ]
};

describe("buildHumanReviewOpsWorkbenchScreenModel", () => {
  it("shows a precise empty state without implying automation learning is available", () => {
    const model = buildHumanReviewOpsWorkbenchScreenModel({
      queue: queueBase,
      detail: null
    });

    expect(model.mode).toBe("empty");
    expect(model.emptyState?.title).toContain("Нет активных");
    expect(model.capabilityNotes).toContain(
      "Автоматическое обучение по решениям оператора пока не подключено."
    );
  });

  it("builds active queue and selected case detail for operators", () => {
    const model = buildHumanReviewOpsWorkbenchScreenModel({
      queue: {
        ...queueBase,
        queue: [
          {
            itemStatus: "ready",
            requestId: "hr_case_1",
            caseId: "case-1",
            caseTitle: "Case 1",
            status: "submitted",
            submittedAt: "2026-04-30T09:00:00.000Z",
            updatedAt: "2026-04-30T09:00:00.000Z",
            channel: "email",
            contact: "traveler@example.com",
            snapshot: detailBase.request.snapshot,
            currentVerdict: "HUMAN_REVIEW",
            currentNextActionLabel: "Передать кейс менеджеру",
            currentEvidenceStatus: "stale",
            blockerCount: 1,
            primaryBlockerLabel: "Evidence gate blocked rule-1.",
            ageMinutes: 1
          }
        ]
      },
      detail: {
        ...queueBase,
        detail: detailBase
      }
    });

    expect(model.mode).toBe("active_detail");
    expect(model.queue.items[0]?.statusLabel).toBe("Новый");
    expect(model.detailPanel?.blockers[0]?.severity).toBe("high");
    expect(model.detailPanel?.primaryAction?.id).toBe("move_in_review");
    expect(model.detailPanel?.primaryAction?.transitionStatus).toBe("in_review");
    expect(model.detailPanel?.learningNote).toBe(
      "Автоматическое обучение по этому закрытию пока не подключено."
    );
  });

  it("shows terminal detail as read-only when only transition-only resolution exists", () => {
    const model = buildHumanReviewOpsWorkbenchScreenModel({
      queue: queueBase,
      detail: {
        ...queueBase,
        detail: {
          ...detailBase,
          request: {
            ...detailBase.request,
            status: "resolved",
            closedAt: "2026-04-30T09:10:00.000Z",
            resolution: {
              summary: "Проверка завершена.",
              resolvedAt: "2026-04-30T09:10:00.000Z",
              changedBy: "ops"
            }
          },
          resolution: {
            status: "resolved",
            closedAt: "2026-04-30T09:10:00.000Z",
            note: "Проверка завершена.",
            mode: "transition_only",
            recompute: null
          },
          operatorNextActions: []
        }
      }
    });

    expect(model.mode).toBe("terminal_detail");
    expect(model.detailPanel?.resolution?.summary).toContain("закрыта");
    expect(model.detailPanel?.primaryAction).toBeNull();
  });

  it("keeps terminal detail read-only even if a malformed payload includes actions", () => {
    const model = buildHumanReviewOpsWorkbenchScreenModel({
      queue: queueBase,
      detail: {
        ...queueBase,
        detail: {
          ...detailBase,
          request: {
            ...detailBase.request,
            status: "resolved",
            closedAt: "2026-04-30T09:10:00.000Z",
            resolution: {
              summary: "Проверка завершена.",
              resolvedAt: "2026-04-30T09:10:00.000Z",
              changedBy: "ops"
            }
          },
          resolution: {
            status: "resolved",
            closedAt: "2026-04-30T09:10:00.000Z",
            note: "Проверка завершена.",
            mode: "transition_only",
            recompute: null
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
      }
    });

    expect(model.mode).toBe("terminal_detail");
    expect(model.detailPanel?.primaryAction).toBeNull();
    expect(model.detailPanel?.secondaryActions).toEqual([]);
  });

  it("renders orphaned queue rows without requiring a case detail", () => {
    const model = buildHumanReviewOpsWorkbenchScreenModel({
      queue: {
        ...queueBase,
        queue: [
          {
            itemStatus: "orphaned_case",
            requestId: "hr_missing_1",
            caseId: "missing-case",
            status: "submitted",
            submittedAt: "2026-04-30T09:00:00.000Z",
            updatedAt: "2026-04-30T09:00:00.000Z",
            channel: "email",
            contact: "ops@example.com",
            snapshot: detailBase.request.snapshot,
            ageMinutes: 2,
            recoveryLabel: "Связанный кейс не найден."
          }
        ]
      },
      detail: null
    });

    expect(model.mode).toBe("queue");
    expect(model.queue.items[0]?.caseTitle).toBe("Кейс missing-case");
    expect(model.queue.items[0]?.blockerLabel).toBe("Связанный кейс не найден.");
  });
});
