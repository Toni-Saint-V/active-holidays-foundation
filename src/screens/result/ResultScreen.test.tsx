import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
  ArrowRight: iconStub,
  GitBranch: iconStub,
  Sparkles: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/ui/ConfidenceGauge", () => ({
  ConfidenceGauge: () => <div data-testid="confidence-gauge" />
}));

vi.mock("@/ui/RiskPulse", () => ({
  RiskPulse: ({ risk }: { risk: { label: string } }) => (
    <div data-testid="risk-pulse">{risk.label}</div>
  )
}));

vi.mock("@/ui/OfferCard", () => ({
  OfferCard: ({ offer }: { offer: { id: string } }) => (
    <div data-testid="offer-card">{offer.id}</div>
  )
}));

vi.mock("@/ui/SwipeDeck", () => ({
  SwipeDeck: () => <div data-testid="swipe-deck" />,
  insuranceDismissReasons: [],
  residencyDismissReasons: []
}));

vi.mock("@/ui/TemporalWhatIf", () => ({
  TemporalWhatIf: () => <div data-testid="what-if" />
}));

vi.mock("@/ui/ReplayTimeline", () => ({
  ReplayTimeline: () => <div data-testid="replay-timeline" />
}));

vi.mock("@/ui/ForkDivider", () => ({
  ForkDivider: () => <div data-testid="fork-divider" />
}));

vi.mock("@/ui/SignalRow", () => ({
  SignalRow: ({ signal }: { signal: { id: string } }) => <div>{signal.id}</div>
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

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    activeCase: {
      id: "s1-rf-italy",
      title: "S1 · Петербург → Италия",
      productType: "travel",
      signals: [],
      updatedAt: "2026-04-17T10:00:00.000Z"
    },
    activeCaseId: "s1-rf-italy",
    activeResult: {
      verdict: "GO",
      productType: "travel",
      computedAt: "2026-04-17T10:00:00.000Z",
      nextAction: {
        type: "start_application",
        label: "Начать заявку",
        detail: "Можно переходить к следующему шагу.",
        targetScreen: "result"
      },
      trust: {
        confidence: 0.74,
        confidenceBreakdown: {
          value: 0.74,
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
      auditTrail: {
        totalMs: 14.2
      }
    },
    paths: [],
    scenarios: [],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    recompute: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(null),
    setPreferences: vi.fn().mockResolvedValue(undefined),
    overrideSignal: vi.fn().mockResolvedValue(undefined),
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

  it("hides deterministic surfaces when the verdict is HUMAN_REVIEW", () => {
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCase: {
          id: "s3-us-spb-business",
          title: "S3 · Нью-Йорк → Санкт-Петербург",
          productType: "travel",
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeCaseId: "s3-us-spb-business",
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          verdict: "HUMAN_REVIEW",
          computedAt: "2026-04-17T10:00:00.000Z",
          nextAction: {
            type: "send_for_review",
            label: "Передать менеджеру",
            detail: "Нужна ручная проверка.",
            targetScreen: "human-review"
          },
          primaryPath: {
            id: "italy_c_tourism",
            productType: "travel",
            title: "Шенген C"
          },
          alternativePaths: [
            {
              id: "alt_path",
              productType: "travel",
              title: "Альтернатива"
            }
          ],
          criticalRisk: {
            id: "risk_critical",
            label: "Критический риск"
          },
          risks: [
            {
              id: "risk_warning",
              label: "Риск в работе"
            }
          ],
          ruleResults: [
            {
              ruleId: "r06_sanctions_review",
              explanation: "Санкционный контекст требует ручной проверки.",
              fired: true,
              output: {
                type: "human_review_trigger"
              }
            }
          ]
        }
      })
    );

    renderScreen(<ResultScreen />);

    expect(screen.getByText("Ручная проверка в работе")).toBeInTheDocument();
    expect(
      screen.getByText("Маршрут, уверенность и риски подтвердит оператор после ручной проверки.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Уверенность движка")).not.toBeInTheDocument();
    expect(screen.queryByText("Риски в работе")).not.toBeInTheDocument();
    expect(screen.queryByText("Основной маршрут")).not.toBeInTheDocument();
    expect(screen.queryByText("Почему такое решение")).not.toBeInTheDocument();
    expect(screen.queryByText("Реплей шагов движка")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confidence-gauge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("offer-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("risk-pulse")).not.toBeInTheDocument();
    expect(screen.queryByTestId("swipe-deck")).not.toBeInTheDocument();
  });
});
