import type { HumanReviewRequest, SourceTier } from "@shared/contracts";

export type PresentationBadgeTone = "positive" | "warning" | "negative" | "review";

export const HUMAN_REVIEW_STATUS_LABELS: Record<HumanReviewRequest["status"], string> = {
  submitted: "Принято",
  in_queue: "В очереди",
  in_review: "У человека",
  resolved: "Ответ готов",
  cancelled: "Закрыто"
};

export const HUMAN_REVIEW_PIPELINE_ORDER: HumanReviewRequest["status"][] = [
  "submitted",
  "in_queue",
  "in_review",
  "resolved"
];

export const HUMAN_REVIEW_VERDICT_LABELS: Record<
  HumanReviewRequest["snapshot"]["verdict"],
  string
> = {
  GO: "Можно идти дальше",
  GO_WITH_CONDITIONS: "Можно, но с условиями",
  NOT_NOW: "Пока рано",
  HUMAN_REVIEW: "Нужна ручная проверка"
};

export function scoreBadgeTone(score: number): PresentationBadgeTone {
  if (score >= 0.8) return "positive";
  if (score >= 0.5) return "warning";
  return "negative";
}

export function documentsCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} документов`;
  if (mod10 === 1) return `${count} документ`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} документа`;
  return `${count} документов`;
}

export function sourceSummaryByTier(tier: SourceTier): string {
  if (tier === "official") {
    return "Официальный источник — учитываем с минимальной волатильностью.";
  }

  if (tier === "operator") {
    return "Оператор: актуальные слоты и цены.";
  }

  return "Краудсорс: учитываем как вторичный сигнал.";
}

export function pulseAmplitudeForSeverity(
  severity: HumanReviewWarningSeverity | undefined
): number {
  if (severity === "critical") return 1;
  if (severity === "high") return 0.75;
  if (severity === "medium") return 0.5;
  return 0.25;
}

type HumanReviewWarningSeverity = "critical" | "high" | "medium" | "low";
