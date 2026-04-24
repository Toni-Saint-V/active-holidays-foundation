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

export function buildTrustScreenModel({
  result
}: {
  result: ResultPayload;
}): TrustScreenModel {
  return {
    gate:
      result.verdict === "HUMAN_REVIEW"
        ? {
            title: "Доверие уточнит оператор",
            description:
              "Для этого кейса мы не показываем детальную оценку уверенности до завершения ручной проверки."
          }
        : null,
    hero: {
      eyebrow: "Доверие",
      heading: "Почему движку можно верить",
      badgeLabel: formatPercent(result.trust.confidence),
      badgeTone: scoreBadgeTone(result.trust.confidence)
    },
    explanation: {
      eyebrow: "Цепочка объяснения",
      heading: "Сигналы → правила → выводы"
    },
    sourcesSection: {
      heading: "Источники",
      volatilityLabel: `Средняя волатильность ${formatPercent(result.trust.volatilityScore, 0)}`,
      items: result.trust.sources.map((source) => ({
        ...source,
        summary: sourceSummaryByTier(source.tier)
      }))
    }
  };
}
