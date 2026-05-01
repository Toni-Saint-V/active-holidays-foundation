import type { ResultPayload, Source } from "@shared/contracts";
import { formatPercent } from "@/lib/format";
import {
  scoreBadgeTone,
  sourceSummaryByTier,
  type PresentationBadgeTone
} from "./screenModelUtils";

export type TrustScreenModel = {
  gate:
    | {
        title: string;
        description: string;
      }
    | null;
  hero: {
    eyebrow: string;
    heading: string;
    badgeLabel: string;
    badgeTone: PresentationBadgeTone;
  };
  explanation: {
    eyebrow: string;
    heading: string;
  };
  sourcesSection: {
    heading: string;
    volatilityLabel: string;
    items: Source[];
  };
};

function humanReviewEvidenceSummary(result: ResultPayload): string {
  const reason = result.trust.blockingReason ?? result.trust.humanReviewReason;

  if (result.trust.evidenceStatus === "conflicting") {
    return `Причина остановки: ${reason ?? "источники конфликтуют"}.`;
  }
  if (
    result.trust.evidenceStatus === "stale" ||
    result.trust.freshnessStatus === "stale"
  ) {
    return `Причина остановки: ${reason ?? "источники устарели"}.`;
  }
  if (result.trust.evidenceStatus === "missing") {
    return `Причина остановки: ${reason ?? "не хватает подтверждающих источников"}.`;
  }
  if (result.trust.evidenceStatus === "manual_only") {
    return `Причина остановки: ${reason ?? "кейс доступен только для ручной проверки"}.`;
  }

  return `Причина остановки: ${reason ?? "кейс должен посмотреть человек"}.`;
}

export function buildTrustScreenModel({
  result
}: {
  result: ResultPayload;
}): TrustScreenModel {
  const isHumanReview = result.verdict === "HUMAN_REVIEW";

  return {
    gate:
      isHumanReview
        ? {
            title: "Доверие уточнит оператор",
            description:
              "Для этого кейса мы не показываем детальную оценку уверенности до завершения ручной проверки."
          }
        : null,
    hero: {
      eyebrow: "Доверие",
      heading: isHumanReview
        ? "Автоматический вывод остановлен"
        : "Почему движку можно верить",
      badgeLabel: isHumanReview ? "проверка" : formatPercent(result.trust.confidence),
      badgeTone: isHumanReview ? "review" : scoreBadgeTone(result.trust.confidence)
    },
    explanation: {
      eyebrow: "Цепочка объяснения",
      heading: isHumanReview
        ? "Сигналы → правила → ручная проверка"
        : "Сигналы → правила → выводы"
    },
    sourcesSection: {
      heading: "Источники",
      volatilityLabel: isHumanReview
        ? humanReviewEvidenceSummary(result)
        : `Средняя волатильность ${formatPercent(result.trust.volatilityScore, 0)}`,
      items: isHumanReview
        ? []
        : result.trust.sources.map((source) => ({
            ...source,
            summary: sourceSummaryByTier(source.tier)
          }))
    }
  };
}
