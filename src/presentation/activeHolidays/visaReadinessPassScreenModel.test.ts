import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ResultPayload, ScenarioLabPayload } from "@shared/contracts";
import { buildVisaReadinessPassScreenModel } from "./visaReadinessPassScreenModel";

function createBaseResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO_WITH_CONDITIONS",
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
      requirements: [
        { id: "passport", label: "Паспорт", mandatory: true },
        { id: "insurance", label: "Страховка", mandatory: true },
        { id: "booking", label: "Бронь проживания", mandatory: true }
      ],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [
      {
        id: "spain_c_tourism",
        productType: "travel",
        title: "Испания C",
        kind: "consular_visa",
        citizenship: "RU",
        destination: "ES",
        processingWeeks: 5,
        estCostRub: 16000,
        description: "Запасной маршрут",
        requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
        score: 0.71,
        baseScore: 0.68,
        ruleBoosts: [],
        blockers: [],
        eligible: true
      }
    ],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист перед следующим шагом.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут найден, но пакет документов ещё неполный.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "warning"
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
      evidenceStatus: "valid",
      freshnessStatus: "fresh",
      blockingReason: null,
      humanReviewReason: null,
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

function createScenarioLab(result: ResultPayload = createBaseResult()): ScenarioLabPayload {
  return {
    version: "scenario-lab.v2",
    caseId: result.caseId,
    generatedAt: "2026-04-21T00:00:00.000Z",
    baseResult: result,
    issues: [],
    scenarios: [
      {
        id: "documents-ready",
        type: "documents",
        title: "Добрать документы",
        summary: "Сценарий показывает влияние полного пакета.",
        recommended: true,
        safetyStatus: "safe_automatic",
        evidenceStatus: "valid",
        freshnessStatus: "fresh",
        blockingReason: null,
        humanReviewReason: null,
        nextAction: result.nextAction,
        comparison: {
          verdictBefore: result.verdict,
          verdictAfter: result.verdict,
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
          whyChanged: ["Полный пакет снимает документный блокер."]
        },
        delta: {
          verdict: { before: result.verdict, after: result.verdict, changed: false },
          confidence: { before: 0.74, after: 0.82, delta: 0.08 },
          documents: {
            readyCountBefore: 5,
            readyCountAfter: 7,
            readyCountDelta: 2,
            requiredCountBefore: 7,
            requiredCountAfter: 7,
            scoreBefore: 0.71,
            scoreAfter: 1,
            scoreDelta: 0.29
          },
          risks: { resolved: [], added: [], remaining: [] },
          nextAction: {
            beforeType: result.nextAction.type,
            afterType: result.nextAction.type,
            beforeLabel: result.nextAction.label,
            afterLabel: result.nextAction.label,
            changed: false
          },
          evidenceStatus: { before: "valid", after: "valid", changed: false },
          freshnessStatus: { before: "fresh", after: "fresh", changed: false },
          blockingReason: { before: null, after: null, changed: false },
          humanReviewReason: { before: null, after: null, changed: false }
        },
        plan: {
          headline: "Добрать документы перед следующим шагом.",
          firstSteps: ["Подготовить страховку.", "Загрузить выписку."],
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
      detail: "Есть автоматический сценарий.",
      triggeredBy: []
    }
  };
}

describe("buildVisaReadinessPassScreenModel", () => {
  it("keeps the contract to exactly five component groups and at most three actions", () => {
    const result = createBaseResult();
    const model = buildVisaReadinessPassScreenModel({
      result,
      scenarioLab: createScenarioLab(result)
    });

    expect(model.componentOrder).toEqual([
      "headerTripSummary",
      "readinessStatus",
      "routeRiskMap",
      "documentsImpact",
      "alternativesCta"
    ]);
    expect(model.componentOrder).toHaveLength(5);
    expect([model.alternativesCta.primaryCta, ...model.alternativesCta.secondaryActions])
      .toHaveLength(3);
    expect(model.viewport).toEqual({ target: "iphone_14", width: 390, height: 844 });
  });

  it("models route risk map with selectable 3-5 route points", () => {
    const result = createBaseResult();
    const model = buildVisaReadinessPassScreenModel({
      result,
      scenarioLab: createScenarioLab(result),
      selectedRoutePointId: "evidence"
    });

    expect(model.routeRiskMap.points.length).toBeGreaterThanOrEqual(3);
    expect(model.routeRiskMap.points.length).toBeLessThanOrEqual(5);
    expect(model.routeRiskMap.selectedPointId).toBe("evidence");
    expect(model.routeRiskMap.selectedPoint.label).toBe("Источники");
    expect(model.routeRiskMap.selectedPoint.requirements.length).toBeGreaterThan(0);
    expect(model.routeRiskMap.selectedPoint.why).toContain("AI объясняет");
  });

  it("uses document impact instead of approval prediction", () => {
    const model = buildVisaReadinessPassScreenModel({
      result: createBaseResult(),
      scenarioLab: null
    });

    expect(model.documentsImpact.completionLabel).toBe("71%");
    expect(model.documentsImpact.impactLabel).toContain("влияет на следующий шаг");
    expect(model.aiBoundary.forbiddenClaims).toContain("visa_approval_prediction");
    expect(JSON.stringify(model).toLowerCase()).not.toContain("probability");
  });

  it("represents stale evidence honestly", () => {
    const model = buildVisaReadinessPassScreenModel({
      result: createBaseResult({
        trust: {
          ...createBaseResult().trust,
          evidenceStatus: "stale",
          freshnessStatus: "stale",
          blockingReason: "Источник устарел."
        }
      }),
      scenarioLab: null
    });

    expect(model.state).toBe("stale_evidence");
    expect(model.readinessStatus.evidenceLabel).toBe("Есть устаревшие источники");
    expect(model.routeRiskMap.points.find((point) => point.id === "evidence")?.risk).toBe(
      "medium"
    );
  });

  it("represents conflicting evidence honestly", () => {
    const model = buildVisaReadinessPassScreenModel({
      result: createBaseResult({
        trust: {
          ...createBaseResult().trust,
          evidenceStatus: "conflicting",
          blockingReason: "Источники дают разные требования."
        }
      }),
      scenarioLab: null
    });

    expect(model.state).toBe("conflicting_evidence");
    expect(model.readinessStatus.evidenceLabel).toBe("Есть конфликт источников");
    expect(model.routeRiskMap.points.find((point) => point.id === "evidence")?.risk).toBe(
      "high"
    );
  });

  it("keeps human review as the safe bad path", () => {
    const model = buildVisaReadinessPassScreenModel({
      result: createBaseResult({
        verdict: "HUMAN_REVIEW",
        nextAction: {
          type: "send_for_review",
          priority: "human_review",
          label: "Передать кейс менеджеру",
          detail: "Автомат не может честно подтвердить маршрут.",
          targetScreen: "human-review",
          triggeredBy: ["evidence"]
        },
        trust: {
          ...createBaseResult().trust,
          evidenceStatus: "manual_only",
          humanReviewReason: "Нужна проверка человеком."
        }
      }),
      scenarioLab: null
    });

    expect(model.state).toBe("human_review_required");
    expect(model.readinessStatus.verdict).toBe("HUMAN_REVIEW");
    expect(model.alternativesCta.primaryCta.targetScreen).toBe("human-review");
    expect(model.aiBoundary.summary).toContain("не предлагает продолжать автоматически");
  });

  it("models resolved-after-review and long-text states without changing verdicts", () => {
    const resolved = buildVisaReadinessPassScreenModel({
      result: createBaseResult({ verdict: "GO" }),
      scenarioLab: null,
      humanReviewResolved: true
    });
    const longText = buildVisaReadinessPassScreenModel({
      result: createBaseResult({
        nextAction: {
          ...createBaseResult().nextAction,
          detail:
            "Очень длинное объяснение следующего шага, которое нужно хранить как контент для переносимой строки, а не как повод ломать структуру экрана или добавлять шестой компонент в мобильный layout."
        }
      }),
      scenarioLab: null
    });

    expect(resolved.state).toBe("resolved_after_review");
    expect(longText.state).toBe("long_text");
    expect(new Set([resolved.readinessStatus.verdict, longText.readinessStatus.verdict])).toEqual(
      new Set(["GO", "GO_WITH_CONDITIONS"])
    );
  });

  it("does not hide stale evidence behind resolved-after-review state", () => {
    const model = buildVisaReadinessPassScreenModel({
      result: createBaseResult({
        verdict: "GO",
        trust: {
          ...createBaseResult().trust,
          evidenceStatus: "stale",
          freshnessStatus: "stale",
          blockingReason: "Источник устарел после проверки."
        }
      }),
      scenarioLab: null,
      humanReviewResolved: true
    });

    expect(model.state).toBe("stale_evidence");
    expect(model.readinessStatus.evidenceLabel).toBe("Есть устаревшие источники");
  });

  it("keeps new source free from parallel result models", () => {
    const modelPath = path.resolve(
      process.cwd(),
      "src/presentation/activeHolidays/visaReadinessPassScreenModel.ts"
    );
    const source = readFileSync(modelPath, "utf8");
    const forbiddenModel = ["Decision", "Result"].join("");

    expect(source).not.toContain(forbiddenModel);
    expect(source).not.toContain("readinessScore");
  });
});
