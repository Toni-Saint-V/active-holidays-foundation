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

function evidenceSignals(
  result: ResultPayload,
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null,
  missingDocs: DocumentsReadinessItem[]
): ResultScreenModel["evidence"] {
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
      label:
        result.verdict === "HUMAN_REVIEW"
          ? "Нужен оператор"
          : recommendedScenario
            ? "Есть сценарий усиления"
            : "Маршрут зафиксирован",
      tone:
        result.verdict === "HUMAN_REVIEW"
          ? "manual"
          : recommendedScenario
            ? "manual"
            : "result"
    }
  ];
}

function aiInsight(
  result: ResultPayload,
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null,
  missingDocs: DocumentsReadinessItem[]
): ResultScreenModel["ai"] {
  if (result.verdict === "HUMAN_REVIEW") {
    return {
      summary: "AI: подготовьте кейс для менеджера — автомат не может честно подтвердить маршрут",
      reasons: [
        "Система не показывает подтверждённый путь, пока кейс не разберёт человек.",
        "Лучше передать материалы сразу, чем пытаться пройти дальше вслепую."
      ],
      action: "Следующий шаг: открыть ручную проверку и передать текущий пакет."
    };
  }

  if (missingDocs.length > 0) {
    return {
      summary: `AI: сначала ${missingDocs[0].label.toLowerCase()} — это блокирует следующий шаг`,
      reasons: [
        "Движок уже показал рабочий маршрут, но пакет ещё не закреплён.",
        "Чем раньше закрыть недостающий документ, тем проще следующий переход."
      ],
      action: "Следующий шаг: открыть документы и закрыть обязательный чеклист."
    };
  }

  if (recommendedScenario) {
    return {
      summary: `AI: проверьте сценарий «${recommendedScenario.title}» — он может усилить путь`,
      reasons: [
        "У вас уже есть рабочий маршрут, поэтому сравнение помогает улучшать, а не спасать кейс.",
        "Сценарии ниже не подменяют основной путь и остаются compare-only."
      ],
      action: "Следующий шаг: открыть сценарии и сравнить усиление без смены базового маршрута."
    };
  }

  return {
    summary: "AI: маршрут подтверждён — можно переходить к следующему действию",
    reasons: [
      "Основной путь уже зафиксирован детерминированным движком.",
      "Сейчас важно не распыляться и пройти основной шаг без лишних отклонений."
    ],
    action: `Следующий шаг: ${result.nextAction.label}.`
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
    return [
      {
        id: recommendedScenario.id,
        title: recommendedScenario.title,
        meta: recommendedScenario.summary,
        status: "сценарий",
        tone: "info"
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
      heading: "Собрать пакет",
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
      trustSummary: `Уверенность движка: ${Math.round(result.trust.confidence * 100)}%. Пределы: ${
        result.trust.confidenceBreakdown.capsApplied.length > 0
          ? result.trust.confidenceBreakdown.capsApplied.join(", ")
          : "нет активных ограничителей"
      }.`,
      topRiskLabels: result.risks.slice(0, 3).map((risk) => risk.label)
    }
  };
}
