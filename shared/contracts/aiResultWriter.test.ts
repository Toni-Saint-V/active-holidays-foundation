import { describe, expect, it } from "vitest";
import { aiResultPayloadSchema } from "./aiResultWriter";

describe("ai result writer contract", () => {
  it("accepts a valid public payload shape", () => {
    const parsed = aiResultPayloadSchema.parse({
      version: "ai-result-writer.v1",
      caseId: "case-1",
      generatedAt: "2026-05-09T10:00:00.000Z",
      basedOnComputedAt: "2026-05-09T09:58:00.000Z",
      statusSummary: "Маршрут можно продолжать, но пакет документов пока неполный.",
      primaryNextStep: {
        label: "Соберите недостающие документы",
        reason: "Без закрытия блокирующих пунктов подача останется рискованной.",
        urgency: "now",
        actionType: "fix_missing_data"
      },
      actionPlan: {
        doNow: ["Проверьте статус обязательных документов.", "Обновите сроки поездки в анкете."],
        beforeDeparture: ["Перепроверьте страховку и бронь."],
        ifUncertain: ["Передайте кейс на ручную проверку."]
      },
      evidenceFacts: {
        known: ["Статус маршрута: Маршрут можно продолжить после исправлений."],
        missing: ["Не хватает подтверждения дохода."],
        riskSignals: ["Есть предупреждение по срокам подачи."]
      },
      uncertainty: {
        label: "needs_more_data",
        reason: "Данные по документам неполные.",
        source: "deterministic"
      },
      safeRecommendationText:
        "На основе указанных данных маршрут рабочий, но перед подачей нужно закрыть недостающие проверки и документы.",
      claimGuard: {
        blockedClaims: [],
        sanitized: false
      }
    });

    expect(parsed.version).toBe("ai-result-writer.v1");
    expect(parsed.actionPlan.doNow.length).toBeGreaterThan(0);
  });

  it("rejects hidden/internal fields on the public surface", () => {
    const attempted = aiResultPayloadSchema.safeParse({
      version: "ai-result-writer.v1",
      caseId: "case-2",
      generatedAt: "2026-05-09T10:00:00.000Z",
      basedOnComputedAt: "2026-05-09T09:58:00.000Z",
      statusSummary: "Тестовый статус.",
      primaryNextStep: {
        label: "Шаг",
        reason: "Причина",
        urgency: "optional",
        actionType: "prepare",
        score: 92
      },
      actionPlan: {
        doNow: ["A"],
        beforeDeparture: ["B"],
        ifUncertain: ["C"]
      },
      evidenceFacts: {
        known: ["Факт"],
        missing: [],
        riskSignals: []
      },
      uncertainty: {
        label: "within_confirmed_data",
        reason: "Риск",
        source: "deterministic"
      },
      safeRecommendationText: "Текст",
      claimGuard: {
        blockedClaims: [],
        sanitized: false
      },
      confidence: 0.91
    });

    expect(attempted.success).toBe(false);
  });
});
