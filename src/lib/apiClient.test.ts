import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiClient,
  configureApiBase,
  createInternalCasesApiClient
} from "./apiClient";

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

const caseSummaryResponse = {
  id: caseResponse.id,
  title: caseResponse.title,
  productType: caseResponse.productType,
  createdAt: caseResponse.createdAt,
  updatedAt: caseResponse.updatedAt,
  signalCount: caseResponse.signals.length,
  forkedFrom: caseResponse.forkedFrom
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
    evidenceStatus: "valid",
    freshnessStatus: "fresh",
    blockingReason: null,
    humanReviewReason: null,
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
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
          version: "scenario-lab.v2",
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

  it("sends case access token via header and never puts it into URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson(caseResponse));
    vi.stubGlobal("fetch", fetchMock);

    await apiClient.getCase(caseResponse.id, "t".repeat(32));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/cases/s4-rf-residency-dnv");
    expect(url).not.toContain("accessToken=");
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers["x-active-holidays-case-access"]).toBe("t".repeat(32));
  });

  it("sends candidate access token in compareScenario body and keeps tokens out of URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        rootCaseId: caseResponse.id,
        baseline: scenarioSummary,
        candidateCase: caseResponse,
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
    );
    vi.stubGlobal("fetch", fetchMock);

    const baselineToken = "b".repeat(32);
    const candidateToken = "c".repeat(32);
    await apiClient.compareScenario(
      caseResponse.id,
      {
        compareToCaseId: "s4-rf-residency-dnv-fork-2",
        signals: [],
        candidateAccessToken: candidateToken
      },
      baselineToken
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/cases/s4-rf-residency-dnv/scenarios/compare");
    expect(url).not.toContain("accessToken=");
    expect(url).not.toContain(baselineToken);
    expect(url).not.toContain(candidateToken);
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers["x-active-holidays-case-access"]).toBe(baselineToken);
    const payload = JSON.parse(String(init.body)) as {
      compareToCaseId: string;
      candidateAccessToken?: string;
    };
    expect(payload.compareToCaseId).toBe("s4-rf-residency-dnv-fork-2");
    expect(payload.candidateAccessToken).toBe(candidateToken);
  });

  it("uses header transport for case-scoped API calls without leaking token to URL", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/result")) return okJson(resultResponse);
      if (url.endsWith("/human-review")) {
        if ((init?.method ?? "GET").toUpperCase() === "POST") {
          return okJson({
            request: {
              id: "hr_case_1",
              caseId: caseResponse.id,
              status: "submitted",
              channel: "telegram",
              contact: "@qa_case",
              message: "Нужна ручная проверка по безопасному каналу.",
              createdAt: "2026-04-17T10:00:00.000Z",
              updatedAt: "2026-04-17T10:00:00.000Z",
              closedAt: null,
              durability: "volatile",
              snapshot: {
                decisionId: null,
                verdict: "GO",
                confidence: 0.91,
                computedAt: "2026-04-17T10:00:00.000Z",
                lastCheckedAt: "2026-04-17T10:00:00.000Z",
                nextActionLabel: "Подготовить документы",
                summary: "Тестовый snapshot"
              },
              handoff: null,
              resolution: null,
              events: [
                {
                  id: "ev_1",
                  at: "2026-04-17T10:00:00.000Z",
                  type: "submitted",
                  status: "submitted",
                  changedBy: "traveler",
                  note: null
                }
              ]
            },
            reused: false
          });
        }
        return okJson({ request: null });
      }
      if (url.endsWith("/documents")) {
        return okJson({
          score: 1,
          readyCount: 1,
          requiredCount: 1,
          items: []
        });
      }
      if (url.endsWith("/scenarios")) {
        return okJson({
          rootCaseId: caseResponse.id,
          focusCaseId: caseResponse.id,
          baseline: scenarioSummary,
          scenarios: [scenarioSummary],
          comparisons: []
        });
      }
      if (url.endsWith("/scenarios/compare")) {
        return okJson({
          rootCaseId: caseResponse.id,
          baseline: scenarioSummary,
          candidateCase: caseResponse,
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
        });
      }
      if (url.endsWith("/scenario-lab")) {
        return okJson({
          version: "scenario-lab.v2",
          caseId: caseResponse.id,
          generatedAt: "2026-04-17T10:00:00.000Z",
          baseResult: resultResponse,
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
        });
      }
      if (url.endsWith("/fork")) {
        return okJson({
          case: caseResponse,
          result: resultResponse,
          access: {
            caseId: caseResponse.id,
            accessToken: "u".repeat(32),
            issuedAt: "2026-04-17T10:00:00.000Z",
            transport: "x-active-holidays-case-access"
          }
        });
      }
      if (url.endsWith("/recompute") || url.endsWith("/override-signal")) {
        return okJson({
          case: caseResponse,
          result: resultResponse
        });
      }
      return okJson(caseResponse);
    });
    vi.stubGlobal("fetch", fetchMock);
    const token = "u".repeat(32);
    const internalClient = createInternalCasesApiClient("internal-token");

    await apiClient.getResult(caseResponse.id, token);
    await apiClient.recompute(caseResponse.id, undefined, token);
    await internalClient.overrideSignal(
      caseResponse.id,
      {
        signalId: "timeline_weeks",
        value: 3,
        reason: "Тест",
        appliedAt: "2026-05-13T12:00:00.000Z"
      },
      token
    );
    await apiClient.humanReview(caseResponse.id, token);
    await apiClient.submitHumanReview(
      caseResponse.id,
      {
        channel: "telegram",
        contact: "@qa_case",
        message: "Нужна ручная проверка по безопасному каналу."
      },
      token
    );
    await apiClient.documents(caseResponse.id, token);
    await apiClient.fork(caseResponse.id, "Fork test", token);
    await apiClient.scenarioFamily(caseResponse.id, token);
    await apiClient.compareScenario(caseResponse.id, { title: "Сценарий", signals: [] }, token);
    await apiClient.decisionScenarioLab(caseResponse.id, token);

    expect(fetchMock).toHaveBeenCalled();
    for (const [url, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(url).not.toContain("accessToken=");
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers["x-active-holidays-case-access"]).toBe(token);
    }
  });

  it("keeps case access error code on rejected getResult", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({
          error: "case_access_forbidden",
          message: "Недостаточно прав для доступа к кейсу."
        })
      } as unknown as Response)
    );

    await expect(apiClient.getResult(resultResponse.caseId, "t".repeat(32))).rejects.toMatchObject(
      {
        status: 403,
        code: "case_access_forbidden"
      } satisfies Partial<ApiError>
    );
  });

  it("does not expose internal-only endpoints on public client", () => {
    expect("listCases" in apiClient).toBe(false);
    expect("decisions" in apiClient).toBe(false);
    expect("audit" in apiClient).toBe(false);
    expect("overrideSignal" in apiClient).toBe(false);
    expect("humanReviewCasePacket" in apiClient).toBe(false);
  });

  it("uses explicit internal client for packet route and keeps tokens out of URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({
        error: "internal_api_forbidden",
        message: "Internal token required."
      })
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const caseToken = "u".repeat(32);
    const internalToken = "internal-token";
    const internalClient = createInternalCasesApiClient(internalToken);

    await expect(
      internalClient.humanReviewCasePacket(caseResponse.id, caseToken)
    ).rejects.toMatchObject({
      status: 403,
      code: "internal_api_forbidden"
    } satisfies Partial<ApiError>);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/cases/s4-rf-residency-dnv/human-review/packet");
    expect(url).not.toContain("accessToken=");
    expect(url).not.toContain(caseToken);
    expect(url).not.toContain(internalToken);
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers["x-active-holidays-case-access"]).toBe(caseToken);
    expect(headers["x-active-holidays-internal-token"]).toBe(internalToken);
  });

  it("uses explicit internal client for listCases and decisions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ cases: [caseSummaryResponse] }))
      .mockResolvedValueOnce(okJson({ decisions: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const internalClient = createInternalCasesApiClient("internal-token");
    await expect(internalClient.listCases()).resolves.toHaveLength(1);
    await expect(internalClient.decisions()).resolves.toEqual([]);

    const [listUrl, listInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(listUrl).toBe("http://api.test/api/cases");
    expect((listInit.headers as Record<string, string>)["x-active-holidays-internal-token"]).toBe(
      "internal-token"
    );

    const [decisionsUrl, decisionsInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(decisionsUrl).toBe("http://api.test/api/decisions");
    expect(
      (decisionsInit.headers as Record<string, string>)["x-active-holidays-internal-token"]
    ).toBe("internal-token");
  });

  it("uses explicit internal client for audit and keeps tokens out of URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ trail: resultResponse.auditTrail, decisions: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const caseToken = "u".repeat(32);
    const internalClient = createInternalCasesApiClient("internal-token");
    await expect(internalClient.audit(caseResponse.id, caseToken)).resolves.toBeTruthy();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/cases/s4-rf-residency-dnv/audit");
    expect(url).not.toContain("accessToken=");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-active-holidays-internal-token"]).toBe("internal-token");
    expect(headers["x-active-holidays-case-access"]).toBe(caseToken);
  });

  it("uses explicit internal client for override-signal and keeps tokens out of URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ case: caseResponse, result: resultResponse }));
    vi.stubGlobal("fetch", fetchMock);

    const caseToken = "u".repeat(32);
    const internalClient = createInternalCasesApiClient("internal-token");
    await expect(
      internalClient.overrideSignal(
        caseResponse.id,
        {
          signalId: "timeline_weeks",
          value: 3,
          reason: "Тестовый override",
          appliedAt: "2026-05-13T12:00:00.000Z"
        },
        caseToken
      )
    ).resolves.toBeTruthy();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/cases/s4-rf-residency-dnv/override-signal");
    expect(url).not.toContain("accessToken=");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-active-holidays-internal-token"]).toBe("internal-token");
    expect(headers["x-active-holidays-case-access"]).toBe(caseToken);
  });
});
