import type {
  DocumentsReadinessItem,
  ResultPayload,
  ScenarioLabPayload
} from "@shared/contracts";
import { productTypeLabel } from "@/lib/caseDefaults";
import { documentsCountLabel } from "./screenModelUtils";

export type ResultScreenModel = {
  eyebrow: string;
  heading: string;
  meta: string;
  supportingLine: string;
  cta: {
    label: string;
    subcopy: string;
    targetScreen: string;
  };
  bridge: {
    leftChip: string;
    rightChip: string;
    activeNodeId: "docs" | "step" | "review";
    nodes: Array<{
      id: "docs" | "step" | "review";
      label: string;
      tone: "need" | "info" | "manual";
    }>;
    summary: Record<string, string>;
  };
  evidence: Array<{
    id: string;
    label: string;
    tone: "need" | "info" | "manual" | "result";
  }>;
  workSection: {
    eyebrow: string;
    heading: string;
    rows: Array<{
      id: string;
      title: string;
      meta: string;
      status: string;
      tone: "need" | "info" | "manual" | "result";
    }>;
  };
  ai: {
    summary: string;
    reasons: string[];
    action: string;
  };
  compareCard:
    | {
        title: string;
        summary: string;
      }
    | null;
  basisSheet: {
    whyBullets: string[];
    trustSummary: string;
    topRiskLabels: string[];
  };
};

const bridgeNodes: ResultScreenModel["bridge"]["nodes"] = [
  { id: "docs", label: "Документы", tone: "need" },
  { id: "step", label: "Действие", tone: "info" },
  { id: "review", label: "Проверка", tone: "manual" }
];

const bridgeSummary: ResultScreenModel["bridge"]["summary"] = {
  docs: "Показываем, что нужно закрыть до следующего шага.",
  step: "Следующее действие всегда опирается на текущий результат движка.",
  review: "Если автомат не может честно подтвердить маршрут, кейс уходит человеку."
};

const verdictHeadingByType: Record<ResultPayload["verdict"], string> = {
  GO: "Подача возможна",
  GO_WITH_CONDITIONS: "Можно идти дальше",
  NOT_NOW: "Пока не подавать",
  HUMAN_REVIEW: "Нужна ручная проверка"
};

const countryLabels: Record<string, string> = {
  IT: "Италия",
  ES: "Испания",
  RU: "Россия",
  TR: "Турция",
  US: "США"
};

const countryFlags: Record<string, string> = {
  IT: "🇮🇹",
  ES: "🇪🇸",
  RU: "🇷🇺",
  TR: "🇹🇷",
  US: "🇺🇸"
};

function normalizeUserReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const normalized = reason.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (/EVIDENCE_GATE|evidence|stale|conflict|freshness/i.test(normalized)) {
    return "Есть конфликт или устаревание источников — автомат не может безопасно подтвердить маршрут.";
  }
  if (/manual_only|human_review|automation=|safe_auto/i.test(normalized)) {
    return "Кейс требует ручной проверки: автомат не завершает решение без оператора.";
  }
  if (/rule|R\d{2}/i.test(normalized)) {
    return "Сработало критичное правило риска — нужен оператор для финального решения.";
  }
  if (/[A-Za-z]{4,}/.test(normalized)) {
    return "Есть техническое ограничение по данным — нужна ручная верификация.";
  }
  return normalized.length > 140 ? `${normalized.slice(0, 137)}…` : normalized;
}

function countryLabel(code: string | undefined): string | null {
  if (!code) return null;
  return countryLabels[code] ?? code;
}

function resultMeta(result: ResultPayload): string {
  const primary = result.primaryPath;
  if (!primary) return productTypeLabel(result.productType);

  if (primary.productType === "travel") {
    return `${countryLabel(primary.destination) ?? primary.destination} • ${primary.title}`;
  }

  if (primary.productType === "residency_es") {
    return `Испания • ${primary.nameRu}`;
  }

  return `${primary.providerNameRu} • ${primary.productNameRu}`;
}

function actionSummary(result: ResultPayload): string {
  switch (result.nextAction.type) {
    case "book_appointment":
    case "schedule_consulate_appointment":
      return "запись на подачу";
    case "upload_missing_docs":
    case "collect_financial_docs":
      return "документы";
    case "send_for_review":
      return "ручная проверка";
    case "buy_policy":
    case "upgrade_coverage":
      return "страховой шаг";
    case "start_application":
      return "следующий шаг";
    default:
      return result.nextAction.label.toLowerCase();
  }
}

function supportingLine(
  result: ResultPayload,
  missingDocs: DocumentsReadinessItem[],
  isHumanReview: boolean
): string {
  if (isHumanReview) return "Автомат не подтвердил путь. Дальше — ручная проверка.";
  if (missingDocs.length > 0) {
    return `Нужно ${documentsCountLabel(missingDocs.length)}. Дальше — ${actionSummary(result)}.`;
  }
  return `Маршрут собран. Дальше — ${actionSummary(result)}.`;
}

function bridgeChipLabel(result: ResultPayload): string {
  if (result.productType === "residency_es") return "Досье";
  if (result.productType === "insurance_adult") return "Полис";
  return "Пакет";
}

function bridgeDestinationLabel(result: ResultPayload): string {
  const primary = result.primaryPath;
  if (primary?.productType === "travel") {
    const label = countryLabel(primary.destination) ?? primary.destination;
    const flag = countryFlags[primary.destination] ?? "";
    return `${label}${flag ? ` ${flag}` : ""}`;
  }
  if (result.productType === "residency_es") return "Испания 🇪🇸";
  if (result.productType === "insurance_adult") return "Шенген 🇪🇺";
  return productTypeLabel(result.productType);
}

function bridgeActiveNode(
  result: ResultPayload,
  missingDocs: DocumentsReadinessItem[]
): "docs" | "step" | "review" {
  if (result.verdict === "HUMAN_REVIEW") return "review";
  if (missingDocs.length > 0) return "docs";
  return "step";
}

function ctaSubcopy(result: ResultPayload): string {
  switch (result.nextAction.type) {
    case "book_appointment":
    case "schedule_consulate_appointment":
      return "Откроем запись и собранный шаг по кейсу.";
    case "upload_missing_docs":
    case "collect_financial_docs":
      return "Откроем документы и недостающий чеклист.";
    case "send_for_review":
      return "Откроем ручную проверку по текущему кейсу.";
    default:
      return "Откроем следующий шаг по текущему кейсу.";
  }
}

function scenarioEvidenceLabel(
  result: ResultPayload,
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null
): string {
  if (result.verdict === "HUMAN_REVIEW") return "Нужен оператор";
  if (!recommendedScenario) return "Маршрут зафиксирован";

  switch (recommendedScenario.safetyStatus) {
    case "evidence_blocked":
      return "Источники блокируют сценарий";
    case "human_review_only":
      return "Только ручная проверка";
    case "degraded_usable":
      return "Есть запасной сценарий";
    case "safe_automatic":
      return "Есть безопасный сценарий";
    default:
      return "Есть сценарий усиления";
  }
}

function scenarioEvidenceTone(
  result: ResultPayload,
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null
): "manual" | "info" | "result" {
  if (result.verdict === "HUMAN_REVIEW") return "manual";
  if (!recommendedScenario) return "result";
  return recommendedScenario.safetyStatus === "evidence_blocked" ||
    recommendedScenario.safetyStatus === "human_review_only"
    ? "manual"
    : "info";
}

function evidenceSignals(
  result: ResultPayload,
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null,
  missingDocs: DocumentsReadinessItem[]
): ResultScreenModel["evidence"] {
  if (result.verdict === "HUMAN_REVIEW") {
    return [
      {
        id: "manual-review",
        label: "Автомат остановлен",
        tone: "manual"
      },
      {
        id: "evidence",
        label:
          normalizeUserReason(result.trust.blockingReason) ??
          normalizeUserReason(result.trust.humanReviewReason) ??
          "Нужна ручная проверка",
        tone: "manual"
      },
      {
        id: "next-step",
        label: result.nextAction.label,
        tone: "manual"
      }
    ];
  }

  return [
    {
      id: "docs",
      label:
        missingDocs.length > 0
          ? `${documentsCountLabel(missingDocs.length)} сейчас`
          : "Пакет собран",
      tone: missingDocs.length > 0 ? "need" : "result"
    },
    {
      id: "next-step",
      label: result.nextAction.label,
      tone: "info"
    },
    {
      id: "scenario",
      label: scenarioEvidenceLabel(result, recommendedScenario),
      tone: scenarioEvidenceTone(result, recommendedScenario)
    }
  ];
}

function aiInsight(
  result: ResultPayload,
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null,
  missingDocs: DocumentsReadinessItem[]
): ResultScreenModel["ai"] {
  const criticalRiskDetail = result.criticalRisk?.detail?.trim() || null;
  const reviewReason =
    normalizeUserReason(result.trust.humanReviewReason) ??
    normalizeUserReason(result.trust.blockingReason) ??
    "Нужна ручная проверка по риску и источникам.";

  if (result.verdict === "HUMAN_REVIEW") {
    return {
      summary:
        "AI: по маршруту есть критичный риск — кейс уходит в контур менеджера и ручную проверку до подтверждения источников и документов",
      reasons: [
        `Причина проверки: ${reviewReason}`,
        criticalRiskDetail
          ? `Критичный риск: ${criticalRiskDetail}`
          : "До решения оператора не фиксируем вердикт: сначала подтверждаем источники и ключевые документы."
      ],
      action:
        "Следующий шаг: передать кейс менеджеру, приложить источники и документы по риску, затем зафиксировать действие для пользователя."
    };
  }

  if (missingDocs.length > 0) {
    const primaryGap = missingDocs[0];
    return {
      summary: `AI: сначала закрой «${primaryGap.label}» — без этого следующий шаг даёт слабый результат`,
      reasons: [
        `Документный контур сейчас: ${documentsCountLabel(missingDocs.length)} без подтверждения.`,
        criticalRiskDetail
          ? `Параллельно держим под контролем риск: ${criticalRiskDetail}`
          : "Сначала закрепляем обязательный пакет, потом открываем переход по маршруту."
      ],
      action:
        "Следующий шаг: открыть документы, закрыть первый блокер и только после этого переходить к действию."
    };
  }

  if (recommendedScenario) {
    if (
      recommendedScenario.safetyStatus === "evidence_blocked" ||
      recommendedScenario.safetyStatus === "human_review_only"
    ) {
      return {
        summary: `AI: сценарий «${recommendedScenario.title}» не готов к авто-переходу`,
        reasons: [
          normalizeUserReason(recommendedScenario.blockingReason) ??
            normalizeUserReason(recommendedScenario.humanReviewReason) ??
            "Сценарий требует ручной верификации перед запуском.",
          "Используем его как диагностический сигнал риска, а не как мгновенный план действий."
        ],
        action: "Следующий шаг: передать сценарий менеджеру и закрепить безопасный маршрут вручную."
      };
    }

    if (recommendedScenario.safetyStatus === "degraded_usable") {
      return {
        summary: `AI: «${recommendedScenario.title}» — допустимый fallback, но не лучший путь`,
        reasons: [
          "Сценарий рабочий, но по качеству уступает текущему маршруту по ключевым условиям.",
          "Его стоит держать как страхующий вариант, а не переключать пользователя немедленно."
        ],
        action:
          "Следующий шаг: сравнить сценарии по документам и рискам, затем принимать решение о переключении."
      };
    }

    return {
      summary: `AI: сценарий «${recommendedScenario.title}» может усилить текущий маршрут`,
      reasons: [
        "Базовый маршрут уже рабочий, поэтому сравнение используется для усиления качества, а не для спасения кейса.",
        "Решение о переключении принимается только после сверки рисков и следующего действия."
      ],
      action:
        "Следующий шаг: открыть сравнение и подтвердить, что усиление не увеличивает операционные риски."
    };
  }

  return {
    summary: "AI: маршрут подтверждён — фокус на дисциплине исполнения шага без отклонений",
    reasons: [
      "Ключевые сигналы уже согласованы и путь не требует экстренного пересмотра.",
      "Максимальный эффект сейчас даёт точное выполнение следующего шага в нужной последовательности."
    ],
    action: `Следующий шаг: ${result.nextAction.label}. Зафиксируй выполнение и вернись к проверке статуса.`
  };
}

function documentRows(
  result: ResultPayload,
  missingDocs: DocumentsReadinessItem[],
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null
): ResultScreenModel["workSection"]["rows"] {
  if (result.verdict === "HUMAN_REVIEW") {
    return [
      {
        id: "manual-review",
        title: "Передать кейс",
        meta: result.nextAction.detail,
        status: "проверка",
        tone: "manual"
      }
    ];
  }

  if (missingDocs.length > 0) {
    return missingDocs.slice(0, 2).map((item) => ({
      id: item.id,
      title: item.label,
      meta: item.detail,
      status: item.status === "blocked" ? "стоп" : "нужно",
      tone: item.status === "blocked" ? "manual" : "need"
    }));
  }

  if (recommendedScenario) {
    const status =
      recommendedScenario.safetyStatus === "evidence_blocked"
        ? "стоп"
        : recommendedScenario.safetyStatus === "human_review_only"
          ? "проверка"
          : recommendedScenario.safetyStatus === "degraded_usable"
            ? "запасной"
            : "сценарий";
    const tone =
      recommendedScenario.safetyStatus === "evidence_blocked" ||
      recommendedScenario.safetyStatus === "human_review_only"
        ? "manual"
        : "info";

    return [
      {
        id: recommendedScenario.id,
        title: recommendedScenario.title,
        meta: recommendedScenario.summary,
        status,
        tone
      }
    ];
  }

  return [
    {
      id: "next-action",
      title: result.nextAction.label,
      meta: result.nextAction.detail,
      status: "дальше",
      tone: "result"
    }
  ];
}

export function buildResultScreenModel({
  result,
  scenarioLab
}: {
  result: ResultPayload;
  scenarioLab: ScenarioLabPayload | null;
}): ResultScreenModel {
  const missingDocs = result.documents.items.filter((item) => item.status !== "ready");
  const isHumanReview = result.verdict === "HUMAN_REVIEW";
  const recommendedScenario =
    isHumanReview
      ? null
      : scenarioLab?.scenarios.find((scenario) => scenario.id === scenarioLab.recommendedScenarioId) ??
        scenarioLab?.scenarios[0] ??
        null;

  return {
    eyebrow: isHumanReview ? "ручная проверка" : "основной маршрут",
    heading: verdictHeadingByType[result.verdict],
    meta: resultMeta(result),
    supportingLine: supportingLine(result, missingDocs, isHumanReview),
    cta: {
      label: result.nextAction.label,
      subcopy: ctaSubcopy(result),
      targetScreen: result.nextAction.targetScreen
    },
    bridge: {
      leftChip: bridgeChipLabel(result),
      rightChip: bridgeDestinationLabel(result),
      activeNodeId: bridgeActiveNode(result, missingDocs),
      nodes: bridgeNodes,
      summary: bridgeSummary
    },
    evidence: evidenceSignals(result, recommendedScenario, missingDocs),
    workSection: {
      eyebrow: "нужно сейчас",
      heading: isHumanReview ? "Передать кейс человеку" : "Собрать пакет",
      rows: documentRows(result, missingDocs, recommendedScenario)
    },
    ai: aiInsight(result, recommendedScenario, missingDocs),
    compareCard:
      recommendedScenario || result.alternativePaths.length > 0
        ? {
            title: recommendedScenario?.title ?? "Есть альтернативный путь",
            summary:
              recommendedScenario?.summary ??
              "Сравните запасной маршрут, не ломая основной путь."
          }
        : null,
    basisSheet: {
      whyBullets:
        result.whyBullets.length > 0
          ? result.whyBullets.slice(0, 4).map((bullet) => bullet.text)
          : [result.nextAction.detail],
      trustSummary: isHumanReview
        ? `Автоматический вывод остановлен безопасно: ${
            result.trust.blockingReason ??
            result.trust.humanReviewReason ??
            "кейс должен посмотреть человек"
          }.`
        : `Уверенность движка: ${Math.round(result.trust.confidence * 100)}%. Пределы: ${
            result.trust.confidenceBreakdown.capsApplied.length > 0
              ? result.trust.confidenceBreakdown.capsApplied.join(", ")
              : "нет активных ограничителей"
          }.`,
      topRiskLabels: result.risks.slice(0, 3).map((risk) => risk.label)
    }
  };
}
