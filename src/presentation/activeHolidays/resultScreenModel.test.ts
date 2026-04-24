import { describe, expect, it } from "vitest";
import type { ResultPayload, ScenarioLabPayload } from "@shared/contracts";
import { buildResultScreenModel } from "./resultScreenModel";

function createBaseResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    ruleResults: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 14.2,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 14.2,
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

function createScenarioLab(): ScenarioLabPayload {
  const baseResult = createBaseResult();

  return {
    version: "scenario-lab.v1",
    caseId: "s1-rf-italy",
    generatedAt: "2026-04-21T00:00:00.000Z",
    baseResult,
    issues: [],
    scenarios: [
      {
        id: "documents-ready",
        type: "documents",
        title: "Добрать обязательные документы",
        summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
        recommended: true,
        nextAction: {
          type: "upload_missing_docs",
          priority: "blocking",
          label: "Перейти к документам",
          detail: "Закройте недостающий чеклист.",
          targetScreen: "documents",
          triggeredBy: ["documents_ready_count"]
        },
        comparison: {
          verdictBefore: "GO",
          verdictAfter: "GO",
          confidenceBefore: 0.74,
          confidenceAfter: 0.82,
          primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
          primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
          resolvedRisks: [],
          remainingRisks: [],
          documents: {
            readyCountBefore: 5,
            readyCountAfter: 7,
            requiredCount: 7,
            itemsToCollect: []
          },
          whyChanged: ["Чеклист становится полным."]
        },
        plan: {
          headline: "После этого сценария следующий шаг — перейти к документам.",
          firstSteps: ["Подготовить страховку."],
          criticalSteps: ["Не отправлять заявку с неполным пакетом."],
          canWait: [],
          humanReviewRequired: false,
          humanReviewReason: null
        }
      }
    ],
    recommendedScenarioId: "documents-ready",
    noHelpfulScenarios: false,
    humanReviewEscalation: {
      required: false,
      title: "Ручная проверка не нужна",
      detail: "По текущему кейсу есть автоматический сценарий.",
      triggeredBy: []
    }
  };
}

describe("buildResultScreenModel", () => {
  it("keeps missing-docs cases anchored on the documents node", () => {
    const model = buildResultScreenModel({
      result: createBaseResult(),
      scenarioLab: createScenarioLab()
    });

    expect(model.heading).toBe("Подача возможна");
    expect(model.bridge.activeNodeId).toBe("docs");
    expect(model.workSection.rows[0]?.title).toBe("Страховка");
    expect(model.compareCard?.title).toBe("Добрать обязательные документы");
  });

  it("switches to honest review mode for human review verdicts", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        verdict: "HUMAN_REVIEW",
        nextAction: {
          type: "send_for_review",
          priority: "blocking",
          label: "Передать кейс менеджеру",
          detail: "Автомат не может честно подтвердить маршрут.",
          targetScreen: "human-review",
          triggeredBy: ["confidence"]
        }
      }),
      scenarioLab: null
    });

    expect(model.eyebrow).toBe("ручная проверка");
    expect(model.bridge.activeNodeId).toBe("review");
    expect(model.ai.summary).toContain("менеджера");
    expect(model.cta.targetScreen).toBe("human-review");
  });

  it("uses the next action as the work row when documents are already ready", () => {
    const result = createBaseResult({
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить к следующему шагу.",
        targetScreen: "documents",
        triggeredBy: ["primary_path"]
      },
      documents: {
        score: 1,
        readyCount: 7,
        requiredCount: 7,
        items: [
          {
            id: "insurance",
            label: "Страховка",
            status: "ready",
            detail: "Документ готов.",
            pathId: "italy_c_tourism"
          }
        ]
      }
    });

    const model = buildResultScreenModel({
      result,
      scenarioLab: null
    });

    expect(model.bridge.activeNodeId).toBe("step");
    expect(model.workSection.rows).toEqual([
      {
        id: "next-action",
        title: "Начать заявку",
        meta: "Можно переходить к следующему шагу.",
        status: "дальше",
        tone: "result"
      }
    ]);
  });

  it("falls back to product label when the primary path is absent", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        primaryPath: null,
        productType: "insurance_adult"
      }),
      scenarioLab: null
    });

    expect(model.meta).toBe("Страховой сценарий");
    expect(model.bridge.rightChip).toBe("Шенген 🇪🇺");
  });

  it("uses the canonical recommended scenario across compare, work section, and ai copy", () => {
    const scenarioLab = createScenarioLab();
    scenarioLab.scenarios = [
      {
        ...scenarioLab.scenarios[0],
        id: "fallback",
        title: "Первый, но не рекомендованный",
        summary: "Это просто запасной сценарий.",
        recommended: false
      },
      {
        ...scenarioLab.scenarios[0],
        id: "recommended-second",
        title: "Рекомендованный сценарий",
        summary: "Этот сценарий должен стать единым owner-ом на экране.",
        recommended: true
      }
    ];
    scenarioLab.recommendedScenarioId = "recommended-second";

    const model = buildResultScreenModel({
      result: createBaseResult({
        documents: {
          score: 1,
          readyCount: 7,
          requiredCount: 7,
          items: []
        }
      }),
      scenarioLab
    });

    expect(model.compareCard?.title).toBe("Рекомендованный сценарий");
    expect(model.workSection.rows[0]?.title).toBe("Рекомендованный сценарий");
    expect(model.ai.summary).toContain("Рекомендованный сценарий");
  });
});
