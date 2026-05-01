import {
  humanReviewTrustCalibrationCockpitResponseSchema,
  type HumanReviewLearningBlockerSeverity,
  type HumanReviewLearningEvent,
  type HumanReviewTrustCalibrationAction,
  type HumanReviewTrustCalibrationCockpitItem,
  type HumanReviewTrustCalibrationCockpitLane,
  type HumanReviewTrustCalibrationCockpitResponse,
  type HumanReviewTrustCalibrationRecommendation
} from "@shared/contracts";
import { buildHumanReviewTrustCalibration } from "./humanReviewTrustCalibration";

const severityRank: Record<HumanReviewLearningBlockerSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

function emptySeverityCounts(): Record<HumanReviewLearningBlockerSeverity, number> {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
}

function emptyActionCounts(): Record<HumanReviewTrustCalibrationAction, number> {
  return {
    fail_closed_until_evidence_refresh: 0,
    fail_closed_until_signal_capture: 0,
    manual_policy_review_only: 0,
    informational_operator_note: 0
  };
}

function laneIdForRecommendation(
  recommendation: HumanReviewTrustCalibrationRecommendation
): HumanReviewTrustCalibrationCockpitLane["id"] {
  if (recommendation.action === "informational_operator_note") return "informational";
  if (recommendation.severity === "critical" || recommendation.severity === "high") {
    return "urgent";
  }
  return "watchlist";
}

function actionPlan(
  recommendation: HumanReviewTrustCalibrationRecommendation
): HumanReviewTrustCalibrationCockpitItem["actionPlan"] {
  switch (recommendation.action) {
    case "fail_closed_until_evidence_refresh":
      return {
        title: "Разобрать доказательную базу перед любым автоматическим советом",
        steps: [
          "Проверить источники и дату последней верификации по связанным событиям.",
          "Зафиксировать, какой источник устарел, отсутствует или конфликтует.",
          "Оставить кейс в ручной проверке, пока доказательная база не станет свежей и непротиворечивой."
        ],
        terminalFallback: {
          label: "Оставить ручную проверку",
          detail:
            "Если источник нельзя подтвердить без оператора, продукт не должен обещать автоматический результат."
        }
      };
    case "fail_closed_until_signal_capture":
      return {
        title: "Собрать недостающий сигнал перед пересчётом",
        steps: [
          "Проверить, какой входной сигнал повторно отсутствует в событиях обучения.",
          "Передать в сбор данных только конкретный недостающий сигнал, без новых предположений.",
          "Не выпускать автоматический совет, пока обязательный сигнал не получен."
        ],
        terminalFallback: {
          label: "Вернуть в ручной сценарий",
          detail:
            "Если сигнал нельзя получить честно, кейс остаётся в ручной проверке без имитации уверенности."
        }
      };
    case "manual_policy_review_only":
      return {
        title: "Оставить правило в ручной интерпретации",
        steps: [
          "Сверить повторяющийся блокер с текущей операционной политикой.",
          "Зафиксировать, почему правило нельзя автоматизировать без ручной проверки.",
          "Передавать похожие кейсы оператору до явного утверждения политики."
        ],
        terminalFallback: {
          label: "Только ручное решение",
          detail:
            "Если неясность политики не снята, система честно маршрутизирует кейс оператору."
        }
      };
    case "informational_operator_note":
      return {
        title: "Сохранить как операционную заметку",
        steps: [
          "Использовать событие только для аналитики очереди.",
          "Не менять доверительный контур и не добавлять автоматическое правило.",
          "Вернуться к блокеру только если появится повторяемая машинно-проверяемая причина."
        ],
        terminalFallback: {
          label: "Без автоматического действия",
          detail:
            "Операторское переопределение само по себе не является основанием для будущей автоматизации."
        }
      };
  }
}

function toCockpitItem(
  recommendation: HumanReviewTrustCalibrationRecommendation,
  priorityRank: number
): HumanReviewTrustCalibrationCockpitItem {
  return {
    priorityRank,
    recommendation,
    actionPlan: actionPlan(recommendation),
    operatorDecision: {
      mode: "proposal_only",
      primaryLabel: "Подготовить разбор",
      disabledReason:
        "Автоматическое применение отключено: панель только предлагает безопасный операционный разбор."
    }
  };
}

function emptyLane(
  id: HumanReviewTrustCalibrationCockpitLane["id"]
): HumanReviewTrustCalibrationCockpitLane {
  if (id === "urgent") {
    return {
      id,
      title: "Срочные блокеры",
      description: "Высокий риск: похожие кейсы должны оставаться закрытыми до разбора.",
      count: 0,
      items: []
    };
  }
  if (id === "watchlist") {
    return {
      id,
      title: "Наблюдение",
      description: "Повторы есть, но приоритет ниже срочного операционного разбора.",
      count: 0,
      items: []
    };
  }
  return {
    id,
    title: "Информационные заметки",
    description: "События полезны для аналитики, но не дают основания менять автоматизацию.",
    count: 0,
    items: []
  };
}

function buildLanes(
  items: HumanReviewTrustCalibrationCockpitItem[]
): HumanReviewTrustCalibrationCockpitLane[] {
  const lanes: Record<
    HumanReviewTrustCalibrationCockpitLane["id"],
    HumanReviewTrustCalibrationCockpitLane
  > = {
    urgent: emptyLane("urgent"),
    watchlist: emptyLane("watchlist"),
    informational: emptyLane("informational")
  };

  for (const item of items) {
    const lane = lanes[laneIdForRecommendation(item.recommendation)];
    lane.items.push(item);
    lane.count = lane.items.length;
  }

  return [lanes.urgent, lanes.watchlist, lanes.informational].filter(
    (lane) => lane.items.length > 0
  );
}

export function buildHumanReviewTrustCalibrationCockpit(input: {
  events: HumanReviewLearningEvent[];
  minOccurrences?: number;
  limit?: number;
  now?: Date;
}): HumanReviewTrustCalibrationCockpitResponse {
  const calibration = buildHumanReviewTrustCalibration(input);
  const recommendations = calibration.recommendations.slice().sort(
    (a, b) =>
      severityRank[b.severity] - severityRank[a.severity] ||
      b.occurrences - a.occurrences ||
      b.lastSeenAt.localeCompare(a.lastSeenAt) ||
      a.id.localeCompare(b.id)
  );
  const items = recommendations.map((recommendation, index) =>
    toCockpitItem(recommendation, index + 1)
  );
  const severityCounts = emptySeverityCounts();
  const actionCounts = emptyActionCounts();

  for (const recommendation of recommendations) {
    severityCounts[recommendation.severity] += 1;
    actionCounts[recommendation.action] += 1;
  }

  return humanReviewTrustCalibrationCockpitResponseSchema.parse({
    generatedAt: calibration.generatedAt,
    totalEvents: calibration.totalEvents,
    thresholds: {
      minOccurrences: calibration.minOccurrences,
      limit: input.limit ?? 10
    },
    summary: {
      recommendationCount: items.length,
      sourceCatalogMutationsApplied: 0,
      proposalOnlyCount: items.length,
      severityCounts,
      actionCounts
    },
    lanes: buildLanes(items),
    emptyState:
      items.length === 0
        ? {
            title: "Нет безопасных действий калибровки",
            detail:
              "События обучения сохранены, но повторов пока недостаточно для операционного разбора.",
            nextCheckLabel: "Продолжать собирать финальные решения операторов"
          }
        : null,
    safety: {
      title: "Только предложение",
      detail:
        "Панель не меняет каталоги источников и не включает автоматизацию без отдельного подтверждения.",
      sourceCatalogMutation: {
        allowed: false,
        applied: false
      }
    }
  });
}
