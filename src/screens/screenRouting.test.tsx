import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { DocumentsScreen } from "./documents/DocumentsScreen";
import { HumanReviewScreen } from "./human-review/HumanReviewScreen";
import { TrustScreen } from "./trust/TrustScreen";
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

vi.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get: () => iconStub
    }
  )
);

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

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(loadCase: ReturnType<typeof vi.fn>) {
  return {
    activeCase: null,
    activeCaseId: null,
    activeResult: null,
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
        caseId: "s3-us-spb-business",
        productType: "travel",
        title: "Human review",
        subtitle: "",
        expectedVerdict: "HUMAN_REVIEW",
        expectedActionType: "send_for_review",
        expectedPrimaryPath: null,
        note: ""
      }
    ],
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase,
    patchSignal: vi.fn().mockResolvedValue(undefined),
    status: "ready",
    errorMessage: null,
    audit: null
  } as any;
}

function renderScreen(node: ReactNode, initialEntries = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{node}</MemoryRouter>);
}

describe("screen routing fallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the travel default case for trust and documents when no case is provided", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    useCaseStoreMock.mockReturnValue(createStore(loadCase));

    renderScreen(<TrustScreen />);
    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s1-rf-italy");
    });

    vi.clearAllMocks();
    useCaseStoreMock.mockReturnValue(createStore(loadCase));
    renderScreen(<DocumentsScreen />);
    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s1-rf-italy");
    });
  });

  it("opens the seeded human-review case for human-review screen when no case is provided", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    useCaseStoreMock.mockReturnValue(createStore(loadCase));

    renderScreen(<HumanReviewScreen />);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s3-us-spb-business");
    });
  });
});
