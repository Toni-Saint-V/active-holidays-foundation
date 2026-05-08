import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { HumanReviewScreen } from "./HumanReviewScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
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
  Briefcase: iconStub,
  Phone: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

const useCaseStoreMock = vi.mocked(useCaseStore);
const routerFuture = {
  v7_relativeSplatPath: true,
  v7_startTransition: true
} as const;

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    activeCase: {
      id: "case-a",
      title: "Case A",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    },
    activeCaseId: "case-a",
    activeResult: {
      version: "rdc.v1",
      productType: "travel",
      caseId: "case-a",
      computedAt: "2026-04-21T00:00:00.000Z",
      verdict: "GO",
      primaryPath: null,
      alternativePaths: [],
      criticalRisk: null,
      risks: [],
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить дальше.",
        targetScreen: "result",
        triggeredBy: ["primary_path"]
      },
      decisionSignals: [],
      whyBullets: [],
      ruleResults: [],
      documents: {
        score: 1,
        readyCount: 5,
        requiredCount: 5,
        items: []
      },
      trust: {
        confidence: 0.8,
        confidenceBreakdown: {
          value: 0.8,
          base: 0.8,
          capsApplied: [],
          factors: []
        },
	        volatilityScore: 0.1,
	        evidenceStatus: "valid",
	        freshnessStatus: "fresh",
	        blockingReason: null,
	        humanReviewReason: null,
	        sources: [],
	        lastCheckedAt: "2026-04-21T00:00:00.000Z"
	      },
      assumptions: [],
      auditTrail: {
        version: "rdc.v1",
        caseId: "case-a",
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
      preview: false
	    },
	    activeHumanReview: null,
	    activeHumanReviewPacket: null,
	    scenarios: [
      {
        caseId: "case-a",
        productType: "travel",
        title: "A",
        subtitle: "",
        expectedVerdict: "GO",
        expectedActionType: "start_application",
        expectedPrimaryPath: null,
        note: ""
      }
    ],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
	    loadAudit: vi.fn().mockResolvedValue(undefined),
	    loadHumanReview: vi.fn().mockResolvedValue(undefined),
	    loadHumanReviewPacket: vi.fn().mockResolvedValue(undefined),
	    submitHumanReview: vi.fn().mockResolvedValue({ reused: false }),
    status: "ready",
    errorMessage: null,
    humanReviewStatus: "ready",
    humanReviewError: null,
    ...overrides
  } as any;
}

function renderScreen(node: ReactNode) {
  return render(<MemoryRouter future={routerFuture}>{node}</MemoryRouter>);
}

describe("HumanReviewScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading block while current-case review state is still loading", () => {
    useCaseStoreMock.mockReturnValue(
      createStore({
        humanReviewStatus: "loading"
      })
    );

    renderScreen(<HumanReviewScreen />);

    expect(screen.getByText("Проверяем, есть ли активный запрос")).toBeInTheDocument();
  });

  it("resets draft fields when the case id changes", async () => {
    useCaseStoreMock.mockReturnValue(createStore());
    const view = renderScreen(<HumanReviewScreen />);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
      ),
      { target: { value: "Черновик для первого кейса" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Телеграм" }));
    fireEvent.change(screen.getByPlaceholderText("@username"), {
      target: { value: "@draft_case_a" }
    });

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCase: {
          id: "case-b",
          title: "Case B",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-21T01:00:00.000Z",
          updatedAt: "2026-04-21T01:00:00.000Z"
        },
        activeCaseId: "case-b",
        activeResult: {
          ...createStore().activeResult,
          caseId: "case-b",
          auditTrail: {
            ...createStore().activeResult.auditTrail,
            caseId: "case-b"
          }
        }
      })
    );
    view.rerender(
      <MemoryRouter future={routerFuture}>
        <HumanReviewScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
        )
      ).toHaveValue("");
      expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("");
    });
  });
});
