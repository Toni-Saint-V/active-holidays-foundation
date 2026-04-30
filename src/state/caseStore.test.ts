import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCaseStore } from "./caseStore";
import { apiClient } from "@/lib/apiClient";
import type { HumanReviewRequest } from "@shared/contracts";

vi.mock("@/lib/apiClient", () => ({
  apiClient: {
    recompute: vi.fn(),
    paths: vi.fn(),
    decisionScenarioLab: vi.fn(),
    humanReview: vi.fn(),
    submitHumanReview: vi.fn()
  }
}));

const apiClientMock = vi.mocked(apiClient);
const initialState = useCaseStore.getState();

const CASE_ID = "s1-rf-italy";

const caseStub = {
  id: CASE_ID,
  title: "Тестовый кейс",
  productType: "travel",
  createdAt: "2026-04-17T10:00:00.000Z",
  updatedAt: "2026-04-17T10:00:00.000Z",
  signals: [],
  overrides: [],
  preferences: [],
  forkedFrom: null
} as const;

const resultStub = {
  verdict: "GO",
  productType: "travel",
  computedAt: "2026-04-17T10:00:00.000Z",
  nextAction: {
    type: "start_application",
    priority: "path",
    label: "Начать заявку",
    detail: "Можно переходить дальше.",
    targetScreen: "result",
    triggeredBy: []
  },
  trust: {
    confidence: 0.77,
    confidenceBreakdown: {
      value: 0.77,
      capsApplied: [],
      factors: []
    }
  },
  primaryPath: {
    id: "italy_c_tourism",
    productType: "travel",
    title: "Шенген C"
  },
  alternativePaths: [],
  criticalRisk: null,
  risks: [],
  whyBullets: [],
  decisionSignals: [],
  ruleResults: [],
  assumptions: [],
  version: "rdc.v1",
  documents: {
    score: 0.8,
    readyCount: 6,
    requiredCount: 7,
    items: []
  },
  auditTrail: {
    totalMs: 10
  }
} as const;

const scenarioLabStub = {
  version: "scenario-lab.v2",
  caseId: CASE_ID,
  generatedAt: "2026-04-17T10:00:00.000Z",
  baseResult: resultStub,
  issues: [],
  scenarios: [],
  recommendedScenarioId: null,
  noHelpfulScenarios: false,
  humanReviewEscalation: {
    required: false,
    title: "Ручная проверка не нужна",
    detail: "Есть рабочий автоматический сценарий.",
    triggeredBy: []
  }
} as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createHumanReviewRequest(
  overrides: Partial<HumanReviewRequest> = {}
): HumanReviewRequest {
  return {
    id: "hr-1",
    caseId: CASE_ID,
    status: "submitted",
    channel: "email",
    contact: "traveler@example.com",
    message: "Прошу проверить кейс вручную.",
    createdAt: "2026-04-17T10:00:00.000Z",
    updatedAt: "2026-04-17T10:00:00.000Z",
    closedAt: null,
    durability: "volatile",
    snapshot: {
      decisionId: null,
      verdict: "HUMAN_REVIEW",
      confidence: 0.42,
      computedAt: "2026-04-17T10:00:00.000Z",
      lastCheckedAt: "2026-04-17T10:00:00.000Z",
      nextActionLabel: "Передать кейс менеджеру",
      summary: "Автомат не может честно закрыть неоднозначность."
    },
    events: [
      {
        id: "event-1",
        at: "2026-04-17T10:00:00.000Z",
        type: "submitted",
        status: "submitted",
        changedBy: "traveler",
        note: null
      }
    ],
    ...overrides
  };
}

describe("useCaseStore scenario lab refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCaseStore.setState(initialState, true);
  });

  it("keeps the last successful scenario lab when refresh fails after recompute", async () => {
    apiClientMock.recompute.mockResolvedValue({
      case: caseStub,
      result: resultStub
    } as any);
    apiClientMock.paths.mockResolvedValue([]);
    apiClientMock.decisionScenarioLab.mockRejectedValue(new Error("timeout"));

    useCaseStore.setState(
      {
        ...useCaseStore.getState(),
        activeCaseId: CASE_ID,
        activeCase: caseStub as any,
        activeResult: resultStub as any,
        activeScenarioLab: scenarioLabStub as any,
        scenarioLabStatus: "ready",
        scenarioLabError: null
      },
      true
    );

    await useCaseStore.getState().setPreferences(CASE_ID, []);

    const state = useCaseStore.getState();
    expect(state.activeScenarioLab).toEqual(scenarioLabStub);
    expect(state.scenarioLabStatus).toBe("error");
    expect(state.scenarioLabError).toBe("timeout");
  });

  it("ignores stale human review responses after the active case token changes", async () => {
    const pendingReview = deferred<HumanReviewRequest | null>();
    apiClientMock.humanReview.mockReturnValueOnce(pendingReview.promise as Promise<any>);

    const loadPromise = useCaseStore.getState().loadHumanReview(CASE_ID);

    useCaseStore.setState({
      humanReviewCaseId: "case-b",
      humanReviewRequestToken: useCaseStore.getState().humanReviewRequestToken + 1,
      humanReviewStatus: "loading",
      activeHumanReview: null
    });

    pendingReview.resolve(createHumanReviewRequest());
    await loadPromise;

    const state = useCaseStore.getState();
    expect(state.humanReviewCaseId).toBe("case-b");
    expect(state.activeHumanReview).toBeNull();
    expect(state.humanReviewStatus).toBe("loading");
  });

  it("keeps the newer submit result when an older human review load resolves later", async () => {
    const pendingLoad = deferred<HumanReviewRequest | null>();
    const pendingSubmit = deferred<{ reused: boolean; request: HumanReviewRequest }>();
    const olderRequest = createHumanReviewRequest({
      id: "hr-load",
      status: "submitted",
      message: "Старый ответ"
    });
    const newerRequest = createHumanReviewRequest({
      id: "hr-submit",
      status: "in_review",
      message: "Новый запрос",
      channel: "telegram",
      contact: "@traveler"
    });

    apiClientMock.humanReview.mockReturnValueOnce(pendingLoad.promise as Promise<any>);
    apiClientMock.submitHumanReview.mockReturnValueOnce(pendingSubmit.promise as Promise<any>);

    const loadPromise = useCaseStore.getState().loadHumanReview(CASE_ID);
    const submitPromise = useCaseStore.getState().submitHumanReview(CASE_ID, {
      channel: "telegram",
      contact: "@traveler",
      message: "Новый запрос"
    });

    pendingLoad.resolve(olderRequest);
    pendingSubmit.resolve({ reused: false, request: newerRequest });

    await Promise.all([loadPromise, submitPromise]);

    const state = useCaseStore.getState();
    expect(state.activeHumanReview?.id).toBe("hr-submit");
    expect(state.activeHumanReview?.message).toBe("Новый запрос");
    expect(state.humanReviewStatus).toBe("ready");
    await expect(submitPromise).resolves.toEqual({ reused: false });
  });
});
