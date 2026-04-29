import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient, configureApiBase } from "./apiClient";

const caseResponse = {
  id: "s4-rf-residency-dnv",
  title: "S4 - Residency",
  productType: "residency_es",
  createdAt: "2026-04-17T10:00:00.000Z",
  updatedAt: "2026-04-17T10:00:00.000Z",
  signals: [],
  overrides: [],
  preferences: [],
  forkedFrom: null
};

const resultResponse = {
  version: "rdc.v1",
  productType: "residency_es",
  caseId: "s4-rf-residency-dnv",
  computedAt: "2026-04-17T10:00:00.000Z",
  verdict: "GO",
  primaryPath: null,
  alternativePaths: [],
  criticalRisk: null,
  risks: [],
  nextAction: {
    type: "collect_financial_docs",
    priority: "path",
    label: "Подготовить документы",
    detail: "Соберите финансовые подтверждения.",
    targetScreen: "documents",
    triggeredBy: []
  },
  decisionSignals: [],
  whyBullets: [],
  ruleResults: [],
  documents: {
    score: 1,
    readyCount: 1,
    requiredCount: 1,
    items: []
  },
  trust: {
    confidence: 0.91,
    confidenceBreakdown: {
      value: 0.91,
      base: 0.91,
      capsApplied: [],
      factors: []
    },
    volatilityScore: 0.1,
    sources: [],
    lastCheckedAt: "2026-04-17T10:00:00.000Z"
  },
  assumptions: [],
  auditTrail: {
    version: "rdc.v1",
    caseId: "s4-rf-residency-dnv",
    startedAt: "2026-04-17T10:00:00.000Z",
    finishedAt: "2026-04-17T10:00:00.010Z",
    totalMs: 10,
    steps: [
      {
        index: 0,
        name: "collectSignals",
        tookMs: 1,
        inputsSummary: "case",
        outputSummary: "signals",
        firedRuleIds: [],
        notes: []
      }
    ],
    preview: false
  },
  preview: false
};

const ruleResult = {
  ruleId: "R1",
  fired: true,
  category: "document",
  priority: 10,
  productType: "residency_es",
  output: {
    type: "advisory"
  },
  consumedSignals: [],
  explanation: "Проверено."
};

const ruleMetadata = {
  id: "R1",
  priority: 10,
  category: "document",
  productType: "residency_es",
  consumes_signal_ids: [],
  output_type: "advisory",
  output_value: {
    type: "advisory"
  },
  explanation_template: "Проверено.",
  title: "Проверка"
};

const scenarioSummary = {
  caseId: "s4-rf-residency-dnv",
  title: "S4 - Residency",
  productType: "residency_es",
  forkedFrom: null,
  signalCount: 0,
  changedSignalIds: [],
  changedPreferenceIds: [],
  changedSignals: [],
  outcome: {
    verdict: "GO",
    confidence: 0.91,
    primaryPathId: null,
    primaryPathLabel: null,
    alternativePathIds: [],
    alternativePathLabels: [],
    documentsScore: 1,
    documentsReadyCount: 1,
    documentsRequiredCount: 1,
    nextActionType: "collect_financial_docs",
    nextActionLabel: "Подготовить документы",
    humanReview: false
  },
  actionPlan: {
    status: "normal",
    headline: "Подготовить документы",
    detail: "Соберите финансовые подтверждения.",
    escalationReason: null,
    primaryAction: resultResponse.nextAction,
    steps: []
  }
};

function okJson(body: unknown): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

describe("apiClient strict productType parsing", () => {
  beforeEach(() => {
    configureApiBase("http://api.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects full case responses that omit productType", async () => {
    const { productType: _productType, ...withoutProductType } = caseResponse;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okJson(withoutProductType)));

    await expect(apiClient.getCase(caseResponse.id)).rejects.toMatchObject({
      status: 200,
      code: "schema_mismatch"
    } satisfies Partial<ApiError>);
  });

  it("rejects full result responses that omit productType", async () => {
    const { productType: _productType, ...withoutProductType } = resultResponse;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okJson(withoutProductType)));

    await expect(apiClient.getResult(resultResponse.caseId)).rejects.toMatchObject({
      status: 200,
      code: "schema_mismatch"
    } satisfies Partial<ApiError>);
  });

  it("rejects result rule rows that omit productType", async () => {
    const { productType: _productType, ...ruleWithoutProductType } = ruleResult;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okJson({
          ...resultResponse,
          ruleResults: [ruleWithoutProductType]
        })
      )
    );

    await expect(apiClient.getResult(resultResponse.caseId)).rejects.toMatchObject({
      status: 200,
      code: "schema_mismatch"
    } satisfies Partial<ApiError>);
  });

  it("rejects recompute responses that omit nested case or result productType", async () => {
    const { productType: _caseProductType, ...caseWithoutProductType } = caseResponse;
    const { productType: _resultProductType, ...resultWithoutProductType } = resultResponse;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okJson({
          case: caseWithoutProductType,
          result: resultWithoutProductType
        })
      )
    );

    await expect(apiClient.recompute(caseResponse.id)).rejects.toMatchObject({
      status: 200,
      code: "schema_mismatch"
    } satisfies Partial<ApiError>);
  });

  it("rejects scenario lab payloads that omit base result productType", async () => {
    const { productType: _productType, ...resultWithoutProductType } = resultResponse;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okJson({
          version: "scenario-lab.v1",
          caseId: caseResponse.id,
          generatedAt: "2026-04-17T10:00:00.000Z",
          baseResult: resultWithoutProductType,
          issues: [],
          scenarios: [],
          recommendedScenarioId: null,
          noHelpfulScenarios: false,
          humanReviewEscalation: {
            required: false,
            title: "Ручная проверка не нужна",
            detail: "Автоматический сценарий остаётся рабочим.",
            triggeredBy: []
          }
        })
      )
    );

    await expect(apiClient.decisionScenarioLab(caseResponse.id)).rejects.toMatchObject({
      status: 200,
      code: "schema_mismatch"
    } satisfies Partial<ApiError>);
  });

  it("rejects scenario compare responses that omit candidate case productType", async () => {
    const { productType: _productType, ...caseWithoutProductType } = caseResponse;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okJson({
          rootCaseId: caseResponse.id,
          baseline: scenarioSummary,
          candidateCase: caseWithoutProductType,
          comparison: {
            baseline: scenarioSummary,
            candidate: scenarioSummary,
            delta: {
              verdictChanged: false,
              confidenceDelta: 0,
              primaryPathChanged: false,
              documentsScoreDelta: 0,
              documentsReadyDelta: 0,
              nextActionChanged: false,
              humanReviewChanged: false,
              addedAlternativePathIds: [],
              removedAlternativePathIds: [],
              changedSignalIds: [],
              changedPreferenceIds: [],
              changedSignals: []
            }
          },
          candidateDecisionRecordId: null
        })
      )
    );

    await expect(
      apiClient.compareScenario(caseResponse.id, { title: "Сценарий", signals: [] })
    ).rejects.toMatchObject({
      status: 200,
      code: "schema_mismatch"
    } satisfies Partial<ApiError>);
  });

  it("rejects rules responses that omit productType", async () => {
    const { productType: _productType, ...ruleWithoutProductType } = ruleMetadata;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okJson({
          rules: [ruleWithoutProductType]
        })
      )
    );

    await expect(apiClient.rules()).rejects.toMatchObject({
      status: 200,
      code: "schema_mismatch"
    } satisfies Partial<ApiError>);
  });
});
