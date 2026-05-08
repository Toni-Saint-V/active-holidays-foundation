import { describe, expect, it } from "vitest";
import type { HumanReviewTrustCalibrationCockpitResponse } from "@shared/contracts";
import { buildTrustCalibrationCockpitScreenModel } from "./trustCalibrationCockpitScreenModel";

const payload: HumanReviewTrustCalibrationCockpitResponse = {
  generatedAt: "2026-05-01T09:00:00.000Z",
  totalEvents: 2,
  thresholds: {
    minOccurrences: 2,
    limit: 10
  },
  summary: {
    recommendationCount: 1,
    sourceCatalogMutationsApplied: 0,
    proposalOnlyCount: 1,
    severityCounts: {
      critical: 0,
      high: 1,
      medium: 0,
      low: 0
    },
    actionCounts: {
      fail_closed_until_evidence_refresh: 1,
      fail_closed_until_signal_capture: 0,
      manual_policy_review_only: 0,
      informational_operator_note: 0
    }
  },
  lanes: [
    {
      id: "urgent",
      title: "Срочные блокеры",
      description: "Высокий риск.",
      count: 1,
      items: [
        {
          priorityRank: 1,
          recommendation: {
            id: "cal_EVIDENCE_GATE:visa_rule",
            blockerId: "EVIDENCE_GATE:visa_rule",
            label: "Evidence gate заблокировал visa_rule.",
            rootCause: "stale_evidence",
            rootCauseCounts: {
              missing_evidence: 0,
              stale_evidence: 2,
              conflicting_evidence: 0,
              missing_signal: 0,
              policy_ambiguity: 0,
              operator_override_only: 0
            },
            occurrences: 2,
            severity: "high",
            lastSeenAt: "2026-05-01T08:30:00.000Z",
            confidenceImpact: {
              averageDelta: -0.15,
              negativeEvents: 2
            },
            action: "fail_closed_until_evidence_refresh",
            actionLabel: "Оставить закрытым до обновления источников",
            rationale:
              "2 повторных закрытия ручной проверки: источники устарели. Рекомендация только для операционного разбора, без автоматической правки каталогов.",
            sourceEventIds: [
              "hrl_hr_case_1_2026-05-01T08:00:00.000Z",
              "hrl_hr_case_2_2026-05-01T08:30:00.000Z"
            ],
            safety: {
              mode: "proposal_only",
              sourceCatalogMutation: {
                allowed: false,
                applied: false
              }
            }
          },
          actionPlan: {
            title: "Разобрать доказательную базу перед любым автоматическим советом",
            steps: ["Проверить источники."],
            terminalFallback: {
              label: "Оставить ручную проверку",
              detail: "Без свежего источника автоматический совет не выдаётся."
            }
          },
          operatorDecision: {
            mode: "proposal_only",
            primaryLabel: "Подготовить разбор",
            disabledReason: "Автоматическое применение отключено."
          }
        }
      ]
    }
  ],
  emptyState: null,
  safety: {
    title: "Только предложение",
    detail: "Каталоги источников не меняются.",
    sourceCatalogMutation: {
      allowed: false,
      applied: false
    }
  }
};

describe("buildTrustCalibrationCockpitScreenModel", () => {
  it("adapts cockpit payload for a future UI without redefining trust logic", () => {
    const model = buildTrustCalibrationCockpitScreenModel(payload);

    expect(model.mode).toBe("recommendations");
    expect(model.summary.recommendationsLabel).toBe("1 рекомендация");
    expect(model.summary.urgentLabel).toBe("1 срочный блокер");
    expect(model.summary.safetyLabel).toBe("Каталоги источников не изменялись");
    expect(model.lanes[0]?.items[0]).toMatchObject({
      priorityLabel: "#1",
      rootCauseLabel: "Источники устарели",
      occurrencesLabel: "2 повтора",
      actionLabel: "Оставить закрытым до обновления источников",
      safetyLabel: "Автоматическое применение отключено."
    });
  });

  it("keeps empty cockpit states honest and non-visual", () => {
    const model = buildTrustCalibrationCockpitScreenModel({
      ...payload,
      summary: {
        ...payload.summary,
        recommendationCount: 0,
        proposalOnlyCount: 0,
        severityCounts: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        actionCounts: {
          fail_closed_until_evidence_refresh: 0,
          fail_closed_until_signal_capture: 0,
          manual_policy_review_only: 0,
          informational_operator_note: 0
        }
      },
      lanes: [],
      emptyState: {
        title: "Нет безопасных действий калибровки",
        detail: "События обучения сохранены, но повторов пока недостаточно.",
        nextCheckLabel: "Продолжать собирать финальные решения операторов"
      }
    });

    expect(model.mode).toBe("empty");
    expect(model.emptyState?.title).toContain("Нет безопасных");
    expect(model.lanes).toEqual([]);
  });
});
