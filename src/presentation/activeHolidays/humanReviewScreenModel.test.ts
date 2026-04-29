import { describe, expect, it } from "vitest";
import type {
  AuditTrail,
  DecisionLogEntry,
  HumanReviewRequest,
  ResultPayload
} from "@shared/contracts";
import { buildHumanReviewScreenModel } from "./humanReviewScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s5-rf-italy-insurance",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "blocking",
      label: "Передать кейс менеджеру",
      detail: "Автомат не может честно подтвердить маршрут.",
      targetScreen: "human-review",
      triggeredBy: ["confidence"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [
      {
        ruleId: "HR-1",
        fired: true,
        category: "timeline",
        priority: 90,
        productType: "travel",
        output: { type: "human_review_trigger" },
        consumedSignals: [],
        explanation: "Нужна ручная проверка по истории отказов."
      },
      {
        ruleId: "WARN-1",
        fired: true,
        category: "document",
        priority: 80,
        productType: "travel",
        output: { type: "warning", severity: "high" },
        consumedSignals: [],
        explanation: "Не хватает страховки. Нужна допроверка пакета."
      }
    ],
    documents: {
      score: 0.4,
      readyCount: 2,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.42,
      confidenceBreakdown: {
        value: 0.42,
        base: 0.42,
        capsApplied: ["manual_review"],
        factors: []
      },
      evidenceStatus: "valid",
      freshnessStatus: "fresh",
      blockingReason: null,
      humanReviewReason: null,
      volatilityScore: 0.2,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s5-rf-italy-insurance",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 10,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 10,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createRequest(overrides: Partial<HumanReviewRequest> = {}): HumanReviewRequest {
  return {
    id: "hr-1",
    caseId: "s5-rf-italy-insurance",
    status: "in_review",
    channel: "telegram",
    contact: "@traveler",
    message: "Есть прошлый отказ и спорная страховка, прошу проверить кейс вручную.",
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:30:00.000Z",
    closedAt: null,
    durability: "persisted",
    snapshot: {
      decisionId: null,
      verdict: "HUMAN_REVIEW",
      confidence: 0.42,
      computedAt: "2026-04-21T00:00:00.000Z",
      lastCheckedAt: "2026-04-21T00:00:00.000Z",
      nextActionLabel: "Передать кейс менеджеру",
      summary: "Автомат не может честно подтвердить маршрут."
    },
    events: [
      {
        id: "event-1",
        at: "2026-04-21T00:00:00.000Z",
        type: "submitted",
        status: "submitted",
        changedBy: "traveler",
        note: null
      }
    ],
    ...overrides
  };
}

function createAudit(): { trail: AuditTrail; decisions: DecisionLogEntry[] } {
  return {
    trail: createResult().auditTrail,
    decisions: [
      {
        id: "decision-1",
        caseId: "s5-rf-italy-insurance",
        verdict: "HUMAN_REVIEW",
        confidence: 0.42,
        summary: "Ушли в ручную проверку.",
        kind: "recompute",
        changedSignalIds: [],
        recordedAt: "2026-04-21T00:40:00.000Z"
      }
    ]
  };
}

describe("buildHumanReviewScreenModel", () => {
  it("builds an honest pipeline view for active requests", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: createRequest(),
      audit: null,
      humanReviewStatus: "ready"
    });

    expect(model.header.heading).toBe("Запрос уже в работе");
    expect(model.openReview?.pipeline[2]).toEqual({
      id: "in_review",
      label: "У человека",
      state: "current"
    });
    expect(model.openReview?.verdictLabel).toBe("Нужна ручная проверка");
    expect(model.overview.rows[2]?.text).toContain("хранится на сервере");
    expect(model.submitForm).toBeNull();
  });

  it("keeps submit flow and warning or audit sections ready for future UI", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult({ verdict: "GO" }),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: createAudit(),
      humanReviewStatus: "ready"
    });

    expect(model.submitForm?.channels).toHaveLength(2);
    expect(model.warningsSection?.items[0]?.pulseAmplitude).toBe(0.75);
    expect(model.auditSection?.history[0]?.label).toContain("Ушли в ручную проверку");
  });

  it("exposes a loading mode before the current case review state is known", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: null,
      humanReviewStatus: "loading"
    });

    expect(model.mode).toBe("loading");
    expect(model.loadingState?.title).toContain("Проверяем");
    expect(model.submitForm).toBeNull();
  });
});
