import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AiRecommendationPanel } from "./AiRecommendationPanel";

const { apiClientMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string
    ) {
      super(message);
    }
  }
  return {
    apiClientMock: {
      recommendationShortlist: vi.fn(),
      recommendationDetail: vi.fn(),
      compareScenario: vi.fn()
    },
    ApiErrorMock
  };
});

vi.mock("@/lib/apiClient", () => ({
  apiClient: apiClientMock,
  ApiError: ApiErrorMock
}));

function renderPanel(overrides: Partial<ComponentProps<typeof AiRecommendationPanel>> = {}) {
  const onOpenScenario = vi.fn();
  render(
    <AiRecommendationPanel
      caseId="s1-rf-italy"
      computedAt="2026-04-19T09:55:00.000Z"
      preferences={[]}
      onOpenScenario={onOpenScenario}
      {...overrides}
    />
  );
  return { onOpenScenario };
}

describe("AiRecommendationPanel", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads shortlist and the default detail view", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Самый прямой путь по текущему кейсу.",
          fitReason: "Сейчас это главный match по движку.",
          caution: "Нужно добрать документы."
        }
      ],
      disclaimer: "Fallback shortlist."
    });
    apiClientMock.recommendationDetail.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      offerId: "italy_c_tourism",
      generatedAt: "2026-04-19T10:00:05.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      fit: "best_match",
      title: "Шенген C",
      summary: "Подходит лучше других по текущим сигналам.",
      whyThisFits: ["Есть рабочий путь.", "Сроки понятны."],
      watchouts: ["Нужно добрать документы."],
      nextSteps: ["Перейти к документам."],
      trustSignals: ["Уверенность 74%."],
      disclaimer: "Fallback detail."
    });

    renderPanel();

    expect(screen.getByText("AI-разбор рекомендаций")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClientMock.recommendationShortlist).toHaveBeenCalledWith("s1-rf-italy");
    });

    expect((await screen.findAllByText("Шенген C")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Подходит лучше других по текущим сигналам.")).toBeInTheDocument();
    expect(screen.getByText("уже основной вариант")).toBeInTheDocument();
    expect(screen.getByText("Fallback detail.")).toBeInTheDocument();
  });

  it("loads follow-up detail when the user switches shortlist item", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    expect(await screen.findByText("Главный путь.")).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);

    await waitFor(() => {
      expect(apiClientMock.recommendationDetail).toHaveBeenCalledWith(
        "s1-rf-italy",
        "italy_d_digital_nomad"
      );
    });

    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить движком" })).toBeInTheDocument();
    expect(screen.getByText("Detail 2.")).toBeInTheDocument();
  });

  it("shows non-primary pre-compare steps from detail payload", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Перейти к документам."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: [
          "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта.",
          "Сверьте вердикт, confidence и основной путь в compare с базовым результатом.",
          "Действуйте только по блоку «Что делать после compare», а не по baseline-шагам."
        ],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();

    expect(screen.getByText("Что проверить перед compare")).toBeInTheDocument();
    expect(screen.queryAllByText("Следующие шаги")).toHaveLength(0);
    expect(
      screen.queryAllByText("Заполнить baseline-форму по текущему next action.")
    ).toHaveLength(0);
    expect(
      screen.getByText(
        "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта."
      )
    ).toBeInTheDocument();
  });

  it("runs deterministic compare for an alternative and opens the fork scenario", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });
    apiClientMock.compareScenario.mockResolvedValue({
      rootCaseId: "s1-rf-italy",
      baseline: {
        outcome: {
          verdict: "GO",
          confidence: 0.74,
          primaryPathLabel: "Шенген C"
        }
      },
      candidateCase: {
        id: "s1-rf-italy-fork-1"
      },
      comparison: {
        baseline: {
          outcome: {
            verdict: "GO",
            confidence: 0.74,
            primaryPathLabel: "Шенген C"
          }
        },
        candidate: {
          actionPlan: {
            headline: "Нужна ручная сверка по доходу.",
            detail: "Сначала проверьте, проходит ли нижний порог по доходу."
          },
          outcome: {
            verdict: "HUMAN_REVIEW",
            confidence: 0.61,
            primaryPathLabel: "Digital Nomad"
          }
        },
        delta: {
          confidenceDelta: -0.13
        }
      }
    });

    const { onOpenScenario } = renderPanel({
      preferences: [{ id: "italy_c_tourism", weight: 0.4 }]
    });

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByRole("button", { name: "Проверить движком" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Проверить движком" }));

    await waitFor(() => {
      expect(apiClientMock.compareScenario).toHaveBeenCalledWith("s1-rf-italy", {
        title: "AI-проверка · Digital Nomad",
        signals: [],
        preferences: [
          { id: "italy_c_tourism", weight: 0.4 },
          { id: "italy_d_digital_nomad", weight: 1 }
        ]
      });
    });

    expect(await screen.findByText("Можно ехать → Нужна проверка менеджером")).toBeInTheDocument();
    expect(screen.getByText("Нужна ручная сверка по доходу.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Открыть полный сценарий" }));
    expect(onOpenScenario).toHaveBeenCalledWith("s1-rf-italy-fork-1");
  });
});
