import type { DocumentsReadinessItem, ResultPayload } from "@shared/contracts";
import {
  scoreBadgeTone,
  type PresentationBadgeTone
} from "./screenModelUtils";

export type DocumentsScreenModel = {
  gate:
    | {
        title: string;
        description: string;
        actionLabel: string;
      }
    | null;
  readiness: {
    eyebrow: string;
    heading: string;
    summary: string;
    badgeLabel: string;
    badgeTone: PresentationBadgeTone;
    primaryActionLabel: string;
    secondaryActionLabel: string;
  };
  requirements: {
    heading: string;
    emptyMessage: string;
    items: Array<Pick<DocumentsReadinessItem, "id" | "label" | "status" | "detail">>;
  };
  nextStep: {
    heading: string;
    description: string;
    ctaLabel: string;
    targetScreen: string;
  };
};

function readinessSummary(score: number): string {
  if (score >= 0.99) return "Пакет собран — можно подавать.";
  if (score >= 0.5) return "Базовая часть готова, осталось добрать несколько документов.";
  return "Рано подавать: нужно готовить ключевые документы.";
}

export function buildDocumentsScreenModel({
  result
}: {
  result: ResultPayload;
}): DocumentsScreenModel {
  return {
    gate:
      result.verdict === "HUMAN_REVIEW"
        ? {
            title: "Документный трек откроет оператор",
            description:
              "Пока кейс на ручной проверке, мы не показываем пакет документов и шаги подачи.",
            actionLabel: "Вернуться к ручной проверке"
          }
        : null,
    readiness: {
      eyebrow: "Документы",
      heading: "Индекс готовности",
      summary: readinessSummary(result.documents.score),
      badgeLabel: `${Math.round(result.documents.score * 100)}%`,
      badgeTone: scoreBadgeTone(result.documents.score),
      primaryActionLabel: "Отметить документ как готовый",
      secondaryActionLabel: "Вернуться к вердикту"
    },
    requirements: {
      heading: "Требования основного маршрута",
      emptyMessage: "Список появится, когда движок найдёт основной маршрут.",
      items: result.documents.items.map(({ id, label, status, detail }) => ({
        id,
        label,
        status,
        detail
      }))
    },
    nextStep: {
      heading: "Следующий шаг от движка",
      description: result.nextAction.detail,
      ctaLabel: result.nextAction.label,
      targetScreen: result.nextAction.targetScreen
    }
  };
}
