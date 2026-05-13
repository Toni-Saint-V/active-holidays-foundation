import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runDecision, type OrchestratorCatalogs } from "@shared/domain/engine";
import { aiResultPayloadSchema } from "@shared/contracts";
import { loadCatalogs } from "./catalogs";
import { buildAiResultPayload, resetAiResultWriterClientForTests } from "./aiResultWriter";

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

async function loadFixture(caseId = "s5-rf-italy-insurance") {
  const catalogs = await loadCatalogs();
  const caseData = catalogs.cases.find((entry) => entry.id === caseId);
  if (!caseData) throw new Error(`Fixture case ${caseId} not found.`);

  const engineCatalogs: OrchestratorCatalogs = {
    paths: catalogs.paths,
    visaRules: catalogs.visaRules,
    restrictions: catalogs.restrictions,
    sources: catalogs.sources,
    ruleEvidence: catalogs.ruleEvidence,
    residencyPrograms: catalogs.residencyPrograms,
    insuranceProducts: catalogs.insuranceProducts
  };
  const result = runDecision({ case: caseData, catalogs: engineCatalogs });
  return { caseData, result };
}

describe("ai result writer", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    createResponseMock.mockReset();
    resetAiResultWriterClientForTests();
  });

  afterAll(() => {
    if (previousApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousApiKey;
    }
    resetAiResultWriterClientForTests();
  });

  it("returns valid structured payload when model output is usable", async () => {
    const { caseData, result } = await loadFixture();
    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        statusSummary: "Маршрут можно продолжать, но сначала закройте пробелы в документах.",
        primaryNextStep: {
          label: "Соберите недостающие документы",
          reason: "Без полного пакета решение остается предварительным.",
          urgency: "now",
          actionType: "fix_missing_data"
        },
        actionPlan: {
          doNow: ["Проверьте список обязательных документов."],
          beforeDeparture: ["Уточните сроки подачи в консульстве."],
          ifUncertain: ["Передайте кейс на ручную проверку."]
        },
        safeRecommendationText:
          "На основе указанных данных сначала завершите обязательные проверки, затем переходите к следующему шагу."
      })
    });

    const payload = await buildAiResultPayload({ caseData, result });
    expect(aiResultPayloadSchema.safeParse(payload).success).toBe(true);
    expect(payload.uncertainty.source).toBe("ai_structured");
  });

  it.each([
    "75% approval chance",
    "100%",
    "70 %",
    "90/100",
    "без риска",
    "гарантировано одобрят",
    "high confidence"
  ])("sanitizes unsupported claim variant: %s", async (unsafeClaim) => {
    const { caseData, result } = await loadFixture();
    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        statusSummary: unsafeClaim,
        primaryNextStep: {
          label: unsafeClaim,
          reason: unsafeClaim,
          urgency: "now",
          actionType: "prepare"
        },
        actionPlan: {
          doNow: [unsafeClaim],
          beforeDeparture: [unsafeClaim],
          ifUncertain: [unsafeClaim]
        },
        safeRecommendationText: unsafeClaim
      })
    });

    const payload = await buildAiResultPayload({ caseData, result });
    const serialized = JSON.stringify(payload);

    expect(payload.claimGuard.sanitized).toBe(true);
    expect(payload.claimGuard.blockedClaims.length).toBeGreaterThan(0);
    expect(serialized).not.toMatch(/\b\d{1,3}\s?%\b|\b\d{1,3}\/100\b|без риска|гарант|approval chance|high confidence/i);
  });

  it("does not expose chain-of-thought-like content", async () => {
    const { caseData, result } = await loadFixture();
    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        statusSummary: "Покажу пошаговое внутреннее рассуждение перед рекомендацией.",
        primaryNextStep: {
          label: "Шаг",
          reason: "Мой thinking process показывает путь.",
          urgency: "optional",
          actionType: "prepare"
        },
        actionPlan: {
          doNow: ["Chain-of-thought: сначала это, потом то."],
          beforeDeparture: ["reasoning: подробные шаги."],
          ifUncertain: ["Передать эксперту."]
        },
        safeRecommendationText: "Вот внутреннее рассуждение модели step-by-step."
      })
    });

    const payload = await buildAiResultPayload({ caseData, result });
    expect(payload.uncertainty.source).toBe("rule_based");
    expect(payload.uncertainty.label).toBe("assistant_limited");
    expect(`${payload.statusSummary} ${payload.safeRecommendationText}`).not.toMatch(
      /chain[- ]of[- ]thought|reasoning|thinking process|пошагов|рассуждени/i
    );
  });

  it("marks uncertainty as needs_more_data or human_review_recommended when evidence is missing", async () => {
    const { caseData, result } = await loadFixture();
    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        statusSummary: "Нужно закрыть пробелы данных перед движением.",
        primaryNextStep: {
          label: "Уточните недостающие данные",
          reason: "Часть фактов по кейсу пока не подтверждена.",
          urgency: "now",
          actionType: "fix_missing_data"
        },
        actionPlan: {
          doNow: ["Проверьте недостающие поля анкеты."],
          beforeDeparture: ["Уточните пакет документов."],
          ifUncertain: ["Передайте кейс на ручную проверку."]
        },
        safeRecommendationText:
          "На основе указанных данных сначала нужно закрыть недостающую информацию."
      })
    });

    const payload = await buildAiResultPayload({
      caseData,
      result: {
        ...result,
        assumptions: [
          ...result.assumptions,
          {
            id: "extra-gap",
            label: "Не подтвержден источник",
            detail: "Нет свежего подтверждения по одному из критичных полей."
          }
        ],
        trust: {
          ...result.trust,
          evidenceStatus: "missing"
        }
      }
    });

    expect(["needs_more_data", "human_review_recommended"]).toContain(payload.uncertainty.label);
  });

  it("returns deterministic recovery when model client is unavailable", async () => {
    const { caseData, result } = await loadFixture();
    delete process.env.OPENAI_API_KEY;
    resetAiResultWriterClientForTests();

    const payload = await buildAiResultPayload({ caseData, result });
    expect(payload.uncertainty.source).toBe("rule_based");
    expect(payload.uncertainty.label).toBe("assistant_limited");
    expect(payload.uncertainty.reason).not.toMatch(/model_unavailable|fallback|AI-модель недоступна/i);
  });

  it("returns deterministic recovery when model output is unusable", async () => {
    const { caseData, result } = await loadFixture();
    createResponseMock.mockResolvedValue({
      output: [{ type: "message", content: [{ type: "refusal" }] }],
      output_text: ""
    });

    const payload = await buildAiResultPayload({ caseData, result });
    expect(payload.uncertainty.source).toBe("rule_based");
    expect(payload.uncertainty.label).toBe("assistant_limited");
    expect(payload.uncertainty.reason).not.toMatch(/model_response_unusable|fallback/i);
  });

  it("keeps hidden reasoning and diagnostics off the public payload surface", async () => {
    const { caseData, result } = await loadFixture();
    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        statusSummary: "Маршрут рабочий при выполнении текущих условий.",
        primaryNextStep: {
          label: "Подготовьте пакет документов",
          reason: "Действуйте в рамках подтвержденных данных.",
          urgency: "before_departure",
          actionType: "prepare"
        },
        actionPlan: {
          doNow: ["Проверьте обязательные документы."],
          beforeDeparture: ["Сверьте дедлайны подачи."],
          ifUncertain: ["Передайте кейс эксперту."]
        },
        safeRecommendationText:
          "На основе указанных данных можно продолжать подготовку без выхода за рамки проверенных фактов."
      })
    });

    const payload = await buildAiResultPayload({ caseData, result });
    const keys = Object.keys(payload);
    const serialized = JSON.stringify(payload);

    expect(keys).not.toContain("confidence");
    expect(keys).not.toContain("score");
    expect(serialized).not.toMatch(/internal|chain[- ]of[- ]thought|confidenceBreakdown|ruleResults/i);
  });

  it("does not leak forbidden internal/public tokens in serialized payload", async () => {
    const { caseData, result } = await loadFixture();
    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        statusSummary: "Рабочий статус.",
        primaryNextStep: {
          label: "Соберите документы",
          reason: "Закройте недостающие пункты.",
          urgency: "now",
          actionType: "fix_missing_data"
        },
        actionPlan: {
          doNow: ["Шаг 1"],
          beforeDeparture: ["Шаг 2"],
          ifUncertain: ["Шаг 3"]
        },
        safeRecommendationText: "На основе указанных данных продолжайте по шагам."
      })
    });

    const payload = await buildAiResultPayload({ caseData, result });
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toMatch(
      /confidence|score|\b\d{1,3}\s?%\b|\b\d{1,3}\/100\b|GO_WITH_CONDITIONS|HUMAN_REVIEW|not_ready_fixable|model_unavailable|model_response_unusable|OpenAI|AI-модель недоступна|fallback/i
    );
  });

  it("does not invent risk signals when there are no risk inputs", async () => {
    const { caseData, result } = await loadFixture();
    delete process.env.OPENAI_API_KEY;
    resetAiResultWriterClientForTests();

    const payload = await buildAiResultPayload({
      caseData,
      result: {
        ...result,
        risks: [],
        criticalRisk: null,
        trust: {
          ...result.trust,
          blockingReason: null,
          humanReviewReason: null,
          evidenceStatus: "valid"
        }
      }
    });

    expect(payload.evidenceFacts.riskSignals).toEqual([]);
  });
});
