import type {
  HumanReviewTrustCalibrationCockpitItem,
  HumanReviewTrustCalibrationCockpitResponse
} from "@shared/contracts";

type TrustCalibrationCockpitMode = "empty" | "recommendations";

export type TrustCalibrationCockpitScreenModel = {
  mode: TrustCalibrationCockpitMode;
  header: {
    eyebrow: string;
    heading: string;
    description: string;
  };
  summary: {
    recommendationsLabel: string;
    urgentLabel: string;
    safetyLabel: string;
  };
  emptyState: {
    title: string;
    description: string;
    nextCheckLabel: string;
  } | null;
  lanes: Array<{
    id: "urgent" | "watchlist" | "informational";
    title: string;
    description: string;
    countLabel: string;
    items: Array<{
      id: string;
      priorityLabel: string;
      title: string;
      severity: "critical" | "high" | "medium" | "low";
      rootCauseLabel: string;
      occurrencesLabel: string;
      confidenceLabel: string;
      actionLabel: string;
      rationale: string;
      planTitle: string;
      steps: string[];
      fallbackLabel: string;
      fallbackDetail: string;
      safetyLabel: string;
      sourceEventIds: string[];
    }>;
  }>;
  safetyNote: {
    title: string;
    detail: string;
  };
};

const rootCauseLabels: Record<
  HumanReviewTrustCalibrationCockpitItem["recommendation"]["rootCause"],
  string
> = {
  missing_evidence: "Не хватает evidence",
  stale_evidence: "Источники устарели",
  conflicting_evidence: "Источники конфликтуют",
  missing_signal: "Не хватает сигнала",
  policy_ambiguity: "Неясность политики",
  operator_override_only: "Только операторское переопределение"
};

function russianPlural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${few}`;
  }
  return `${count} ${many}`;
}

function confidenceLabel(averageDelta: number, negativeEvents: number): string {
  const signed = averageDelta > 0 ? `+${averageDelta}` : `${averageDelta}`;
  return `изменение уверенности ${signed}, негативных событий: ${negativeEvents}`;
}

function itemView(item: HumanReviewTrustCalibrationCockpitItem) {
  const recommendation = item.recommendation;
  return {
    id: recommendation.id,
    priorityLabel: `#${item.priorityRank}`,
    title: recommendation.label,
    severity: recommendation.severity,
    rootCauseLabel: rootCauseLabels[recommendation.rootCause],
    occurrencesLabel: russianPlural(recommendation.occurrences, "повтор", "повтора", "повторов"),
    confidenceLabel: confidenceLabel(
      recommendation.confidenceImpact.averageDelta,
      recommendation.confidenceImpact.negativeEvents
    ),
    actionLabel: recommendation.actionLabel,
    rationale: recommendation.rationale,
    planTitle: item.actionPlan.title,
    steps: item.actionPlan.steps,
    fallbackLabel: item.actionPlan.terminalFallback.label,
    fallbackDetail: item.actionPlan.terminalFallback.detail,
    safetyLabel: item.operatorDecision.disabledReason,
    sourceEventIds: recommendation.sourceEventIds
  };
}

export function buildTrustCalibrationCockpitScreenModel(
  payload: HumanReviewTrustCalibrationCockpitResponse
): TrustCalibrationCockpitScreenModel {
  const mode: TrustCalibrationCockpitMode =
    payload.summary.recommendationCount === 0 ? "empty" : "recommendations";
  const urgentCount =
    payload.summary.severityCounts.critical + payload.summary.severityCounts.high;

  return {
    mode,
    header: {
      eyebrow: "Операции · калибровка доверия",
      heading: "Панель калибровки доверия",
      description:
        "Повторяющиеся блокеры ручной проверки собраны в безопасные предложения для операционного разбора."
    },
    summary: {
      recommendationsLabel: russianPlural(
        payload.summary.recommendationCount,
        "рекомендация",
        "рекомендации",
        "рекомендаций"
      ),
      urgentLabel:
        urgentCount === 0
          ? "Срочных блокеров нет"
          : russianPlural(
              urgentCount,
              "срочный блокер",
              "срочных блокера",
              "срочных блокеров"
            ),
      safetyLabel:
        payload.summary.sourceCatalogMutationsApplied === 0
          ? "Каталоги источников не изменялись"
          : "Требуется проверка изменения каталогов источников"
    },
    emptyState: payload.emptyState
      ? {
          title: payload.emptyState.title,
          description: payload.emptyState.detail,
          nextCheckLabel: payload.emptyState.nextCheckLabel
        }
      : null,
    lanes: payload.lanes.map((lane) => ({
      id: lane.id,
      title: lane.title,
      description: lane.description,
      countLabel: russianPlural(lane.count, "пункт", "пункта", "пунктов"),
      items: lane.items.map(itemView)
    })),
    safetyNote: {
      title: payload.safety.title,
      detail: payload.safety.detail
    }
  };
}
