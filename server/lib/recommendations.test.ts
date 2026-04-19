import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runDecision, type OrchestratorCatalogs } from "@shared/domain/engine";
import { loadCatalogs } from "./catalogs";
import {
  buildRecommendationDetail,
  buildRecommendationShortlist,
  resetRecommendationClientForTests
} from "./recommendations";

const { createResponseMock } = vi.hoisted(() => ({
  createResponseMock: vi.fn()
}));

vi.mock("openai", () => {
  class OpenAIMock {
    readonly responses = {
      create: createResponseMock
    };
  }

  return { default: OpenAIMock };
});

const previousApiKey = process.env.OPENAI_API_KEY;

describe("recommendation boundary ownership", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    createResponseMock.mockReset();
    resetRecommendationClientForTests();
  });

  afterAll(() => {
    if (previousApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
      return;
    }
    process.env.OPENAI_API_KEY = previousApiKey;
    resetRecommendationClientForTests();
  });

  async function loadFixture() {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s5-rf-italy-insurance");
    if (!caseData) {
      throw new Error("Fixture case s5-rf-italy-insurance not found.");
    }
    const engineCatalogs: OrchestratorCatalogs = {
      paths: catalogs.paths,
      visaRules: catalogs.visaRules,
      restrictions: catalogs.restrictions,
      sources: catalogs.sources,
      residencyPrograms: catalogs.residencyPrograms,
      insuranceProducts: catalogs.insuranceProducts
    };
    const result = runDecision({ case: caseData, catalogs: engineCatalogs });
    if (!result.primaryPath) {
      throw new Error("Fixture result does not contain a primary path.");
    }
    const primaryOfferId = result.primaryPath.id;
    const alternativeOfferId = result.alternativePaths.find(
      (offer) => offer && offer.id !== primaryOfferId
    )?.id;
    if (!alternativeOfferId) {
      throw new Error("Fixture result does not contain an alternative path.");
    }
    return { caseData, result, primaryOfferId, alternativeOfferId };
  }

  it("keeps primary deterministic recommendation even when model selects a non-primary offer", async () => {
    const { caseData, result, primaryOfferId, alternativeOfferId } = await loadFixture();

    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        recommendedOfferId: alternativeOfferId,
        items: [
          {
            offerId: alternativeOfferId,
            title: "Модель пытается продвинуть альтернативу",
            summary: "Искусственно ставим альтернативу первой.",
            fitReason: "Модель считает этот вариант лучшим.",
            caution: "Проверьте детали."
          },
          {
            offerId: primaryOfferId,
            title: "Основной путь",
            summary: "Вторым в ответе модели.",
            fitReason: "Модель занижает приоритет.",
            caution: "Нет."
          }
        ]
      })
    });

    const shortlist = await buildRecommendationShortlist(caseData, result);
    expect(shortlist).not.toBeNull();
    if (!shortlist) return;

    expect(shortlist.source).toBe("openai");
    expect(shortlist.recommendedOfferId).toBe(primaryOfferId);
    expect(shortlist.items[0]).toMatchObject({
      offerId: primaryOfferId,
      rank: 1,
      fit: "best_match"
    });

    const alternative = shortlist.items.find((item) => item.offerId === alternativeOfferId);
    expect(alternative).toBeTruthy();
    expect(alternative?.rank).toBeGreaterThan(1);
    expect(alternative?.fit).not.toBe("best_match");
  });

  it("keeps non-primary detail steps deterministic even if model returns baseline-like actions", async () => {
    const { caseData, result, alternativeOfferId } = await loadFixture();
    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        title: "Детальный разбор альтернативы",
        summary: "Текст от модели.",
        whyThisFits: ["Есть альтернативный путь."],
        watchouts: ["Нужна проверка условий."],
        nextSteps: [result.nextAction.label, result.nextAction.detail],
        trustSignals: ["Сигнал доверия от модели."]
      })
    });

    const detail = await buildRecommendationDetail(caseData, result, alternativeOfferId);

    expect(detail.source).toBe("openai");
    expect(detail.fit).not.toBe("best_match");
    expect(detail.nextSteps).not.toContain(result.nextAction.label);
    expect(detail.nextSteps).not.toContain(result.nextAction.detail);
    expect(detail.nextSteps[0]).toContain("Проверить движком");
  });
});
