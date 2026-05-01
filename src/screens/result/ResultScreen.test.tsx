import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ResultScreen } from "./ResultScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  layoutId: _layoutId,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
  layoutId?: string;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  ArrowLeft: iconStub,
  ArrowRight: iconStub,
  MoreHorizontal: iconStub,
  Sparkles: iconStub,
  X: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/instrumentation/events", () => ({
  track: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

vi.mock("./AiRecommendationPanel", () => ({
  AiRecommendationPanel: () => <div data-testid="ai-recommendation-panel">AI panel</div>
}));

vi.mock("./ResultCompareSurface", () => ({
  ResultCompareSurface: () => <div data-testid="compare-surface">Compare surface</div>
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  const activeResult = {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-17T10:00:00.000Z",
    verdict: "GO",
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить к следующему шагу.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
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
      lastCheckedAt: "2026-04-17T10:00:00.000Z"
    },
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
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    decisionSignals: [],
    ruleResults: [],
    assumptions: [],
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
    auditTrail: {
      totalMs: 14.2
    },
    preview: false
  };

  return {
    activeCase: {
      id: "s1-rf-italy",
      title: "S1 · Петербург → Италия",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-17T10:00:00.000Z",
      updatedAt: "2026-04-17T10:00:00.000Z"
    },
    activeCaseId: "s1-rf-italy",
    activeResult,
    activeScenarioLab: {
      version: "scenario-lab.v2",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-17T10:00:00.000Z",
      baseResult: activeResult,
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
    },
    scenarios: [],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    recompute: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(null),
    overrideSignal: vi.fn().mockResolvedValue(undefined),
    scenarioLabStatus: "ready",
    scenarioLabError: null,
    status: "ready",
    errorMessage: null,
    ...overrides
  } as any;
}

function renderScreen(screenNode: ReactNode, initialEntries = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{screenNode}</MemoryRouter>);
}

describe("ResultScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses the vertical default case when the active case belongs to another product", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("ignores a foreign case query param on product-specific routes", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        scenarios: [
          {
            caseId: "s1-rf-italy",
            productType: "travel",
            title: "Travel",
            subtitle: "",
            expectedVerdict: "GO",
            expectedActionType: "start_application",
            expectedPrimaryPath: "italy_c_tourism",
            note: ""
          },
          {
            caseId: "s5-rf-italy-insurance",
            productType: "insurance_adult",
            title: "Insurance",
            subtitle: "",
            expectedVerdict: "GO",
            expectedActionType: "start_application",
            expectedPrimaryPath: "ins_basic",
            note: ""
          }
        ],
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />, [
      "/insurance-adult?case=s1-rf-italy"
    ]);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("renders manual review state without a fake confirmed path", () => {
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          verdict: "HUMAN_REVIEW",
          primaryPath: null,
          nextAction: {
            type: "send_for_review",
            priority: "human_review",
            label: "Передать менеджеру",
            detail: "Автомат не может честно подтвердить маршрут.",
            targetScreen: "human-review",
            triggeredBy: ["human_review_trigger"]
          }
        }
      })
    );

    renderScreen(<ResultScreen />);

    expect(screen.getAllByText("Нужна ручная проверка").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Передать менеджеру").length).toBeGreaterThan(0);
    expect(screen.getByText("Автомат остановлен")).toBeInTheDocument();
    expect(screen.queryByText("Маршрут подтверждён")).not.toBeInTheDocument();
  });

  it("opens the basis sheet from the utility action", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Основание" }));

    await waitFor(() => {
      expect(screen.getByText("Основание решения")).toBeInTheDocument();
      expect(screen.getByText("Маршрут подтверждён по текущим сигналам.")).toBeInTheDocument();
    });
  });

  it("opens compare and AI sheets from secondary actions", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Сравнить" }));

    await waitFor(() => {
      expect(screen.getByTestId("compare-surface")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /AI: сначала/i }));
    fireEvent.click(screen.getByRole("button", { name: "Полный разбор" }));

    await waitFor(() => {
      expect(screen.getByTestId("ai-recommendation-panel")).toBeInTheDocument();
    });
  });
});
