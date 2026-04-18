import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCaseStore } from "./caseStore";
import { apiClient } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({
  apiClient: {
    recompute: vi.fn(),
    paths: vi.fn(),
    decisionScenarioLab: vi.fn()
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
  version: "scenario-lab.v1",
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
});
