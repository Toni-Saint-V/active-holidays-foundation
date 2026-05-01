import type { ResultPayload, ScenarioCandidate, ScenarioLabPayload } from "@shared/contracts";
import { formatPercent } from "@/lib/format";
import { documentsCountLabel } from "./screenModelUtils";

export type VisaReadinessPassState =
  | "loading"
  | "empty"
  | "ready"
  | "stale_evidence"
  | "conflicting_evidence"
  | "human_review_required"
  | "resolved_after_review"
  | "error"
  | "long_text";

export type VisaReadinessRiskLevel = "low" | "medium" | "high" | "blocked" | "review";

export type VisaReadinessRoutePointStatus =
  | "ready"
  | "attention"
  | "blocked"
  | "review"
  | "available";

export type VisaReadinessAction = {
  id: "primary" | "documents" | "alternatives";
  label: string;
  targetScreen: string;
  why: string;
  disabled: boolean;
};

export type VisaReadinessRoutePoint = {
  id: string;
  label: string;
  status: VisaReadinessRoutePointStatus;
  risk: VisaReadinessRiskLevel;
  requirements: string[];
  why: string;
  selected: boolean;
};

export type VisaReadinessPassScreenModel = {
  version: "visa-readiness-pass.v1";
  viewport: {
    target: "iphone_14";
    width: 390;
    height: 844;
  };
  state: VisaReadinessPassState;
  componentOrder: [
    "headerTripSummary",
    "readinessStatus",
    "routeRiskMap",
    "documentsImpact",
    "alternativesCta"
  ];
  headerTripSummary: {
    eyebrow: string;
    title: string;
    routeLabel: string;
    updatedLabel: string;
  };
  readinessStatus: {
    verdict: ResultPayload["verdict"] | null;
    label: string;
    tone: "positive" | "warning" | "negative" | "review" | "neutral";
    documentReadinessLabel: string;
    evidenceLabel: string;
    why: string;
  };
  routeRiskMap: {
    label: string;
    selectedPointId: string;
    points: VisaReadinessRoutePoint[];
    selectedPoint: VisaReadinessRoutePoint;
  };
  documentsImpact: {
    label: string;
    readyCount: number;
    requiredCount: number;
    completionLabel: string;
    impactLabel: string;
    items: Array<{
      id: string;
      label: string;
      status: ResultPayload["documents"]["items"][number]["status"];
      impact: "ready" | "needed" | "blocked";
    }>;
  };
  alternativesCta: {
    label: string;
    primaryCta: VisaReadinessAction;
    secondaryActions: VisaReadinessAction[];
    alternatives: Array<{
      id: string;
      label: string;
      why: string;
      risk: VisaReadinessRiskLevel;
    }>;
  };
  aiBoundary: {
    summary: string;
    why: string;
    forbiddenClaims: [
      "visa_approval_prediction",
      "legal_certainty",
      "ai_decision_making"
    ];
  };
};

type BuildVisaReadinessPassScreenModelInput = {
  result: ResultPayload | null;
  scenarioLab: ScenarioLabPayload | null;
  selectedRoutePointId?: string | null;
  loading?: boolean;
  errorMessage?: string | null;
  humanReviewResolved?: boolean;
};

const componentOrder: VisaReadinessPassScreenModel["componentOrder"] = [
  "headerTripSummary",
  "readinessStatus",
  "routeRiskMap",
  "documentsImpact",
  "alternativesCta"
];

const countryLabels: Record<string, string> = {
  IT: "Италия",
  ES: "Испания",
  RU: "Россия",
  TR: "Турция",
  US: "США"
};

const verdictLabels: Record<ResultPayload["verdict"], string> = {
  GO: "Маршрут можно продолжать",
  GO_WITH_CONDITIONS: "Можно, если закрыть условия",
  NOT_NOW: "Сейчас лучше не подавать",
  HUMAN_REVIEW: "Нужна ручная проверка"
};

const verdictTones: Record<
  ResultPayload["verdict"],
  VisaReadinessPassScreenModel["readinessStatus"]["tone"]
> = {
  GO: "positive",
  GO_WITH_CONDITIONS: "warning",
  NOT_NOW: "negative",
  HUMAN_REVIEW: "review"
};

function emptyModel(state: VisaReadinessPassState, message: string): VisaReadinessPassScreenModel {
  const point: VisaReadinessRoutePoint = {
    id: "status",
    label: "Статус",
    status: state === "error" ? "blocked" : "attention",
    risk: state === "error" ? "blocked" : "medium",
    requirements: [message],
    why: "Экран ждёт результат движка, чтобы показать маршрут без догадок.",
    selected: true
  };

  return {
    version: "visa-readiness-pass.v1",
    viewport: { target: "iphone_14", width: 390, height: 844 },
    state,
    componentOrder,
    headerTripSummary: {
      eyebrow: "Visa Readiness Pass",
      title: "Маршрут ещё не собран",
      routeLabel: "Нет активного кейса",
      updatedLabel: "Ожидаем данные"
    },
    readinessStatus: {
      verdict: null,
      label: state === "loading" ? "Проверяем маршрут" : "Нужен кейс",
      tone: state === "error" ? "negative" : "neutral",
      documentReadinessLabel: "Документы появятся после расчёта",
      evidenceLabel: "Источники не проверялись",
      why: message
    },
    routeRiskMap: {
      label: "Маршрут",
      selectedPointId: point.id,
      points: [point, fallbackRoutePoint("documents"), fallbackRoutePoint("next-step")],
      selectedPoint: point
    },
    documentsImpact: {
      label: "Влияние документов",
      readyCount: 0,
      requiredCount: 0,
      completionLabel: "0%",
      impactLabel: "Пока нельзя оценить пакет без результата.",
      items: []
    },
    alternativesCta: {
      label: "Следующий шаг",
      primaryCta: {
        id: "primary",
        label: state === "loading" ? "Дождаться расчёта" : "Вернуться к кейсам",
        targetScreen: "landing",
        why: "Без результата движка экран не должен предлагать маршрут.",
        disabled: state === "loading"
      },
      secondaryActions: [],
      alternatives: []
    },
    aiBoundary: {
      summary: "AI не делает вывод без результата движка.",
      why: "Сначала нужен rule-based расчёт, затем можно объяснять риски и следующий шаг.",
      forbiddenClaims: [
        "visa_approval_prediction",
        "legal_certainty",
        "ai_decision_making"
      ]
    }
  };
}

function fallbackRoutePoint(id: "documents" | "next-step"): VisaReadinessRoutePoint {
  return {
    id,
    label: id === "documents" ? "Документы" : "Следующий шаг",
    status: "attention",
    risk: "medium",
    requirements: ["Появится после расчёта"],
    why: "Пункт остаётся пустым, пока нет результата.",
    selected: false
  };
}

function routeLabel(result: ResultPayload): string {
  const primary = result.primaryPath;
  if (!primary) return "Маршрут не подтверждён";

  if (primary.productType === "travel") {
    return `${countryLabels[primary.citizenship] ?? primary.citizenship} → ${
      countryLabels[primary.destination] ?? primary.destination
    }`;
  }

  if (primary.productType === "residency_es") return "Переезд → Испания";
  return `${primary.providerNameRu} → ${primary.productNameRu}`;
}

function titleLabel(result: ResultPayload): string {
  if (!result.primaryPath) return "Нужен безопасный следующий шаг";
  if (result.primaryPath.productType === "travel") return result.primaryPath.title;
  if (result.primaryPath.productType === "residency_es") return result.primaryPath.nameRu;
  return result.primaryPath.productNameRu;
}

function evidenceState(result: ResultPayload, humanReviewResolved: boolean): VisaReadinessPassState {
  if (result.trust.evidenceStatus === "conflicting") return "conflicting_evidence";
  if (
    result.trust.evidenceStatus === "stale" ||
    result.trust.freshnessStatus === "stale"
  ) {
    return "stale_evidence";
  }
  if (result.verdict === "HUMAN_REVIEW") return "human_review_required";
  if (humanReviewResolved) return "resolved_after_review";

  const longText =
    result.nextAction.detail.length > 150 ||
    result.documents.items.some((item) => item.detail.length > 150);
  return longText ? "long_text" : "ready";
}

function evidenceLabel(result: ResultPayload): string {
  if (result.trust.evidenceStatus === "conflicting") return "Есть конфликт источников";
  if (result.trust.evidenceStatus === "stale" || result.trust.freshnessStatus === "stale") {
    return "Есть устаревшие источники";
  }
  if (result.trust.evidenceStatus === "missing") return "Не хватает источников";
  if (result.trust.evidenceStatus === "manual_only") return "Только ручная проверка";
  return "Источники актуальны";
}

function documentImpactLabel(result: ResultPayload): string {
  const missing = result.documents.items.filter((item) => item.status !== "ready");
  if (result.verdict === "HUMAN_REVIEW") {
    return "Пакет не трактуется автоматически, пока кейс не посмотрит человек.";
  }
  if (missing.some((item) => item.status === "blocked")) {
    return "Есть блокирующие документы: следующий шаг нельзя показывать как готовый.";
  }
  if (missing.length > 0) {
    return `${documentsCountLabel(missing.length)} влияет на следующий шаг.`;
  }
  return "Документный пакет не блокирует следующий шаг.";
}

function riskFromResult(result: ResultPayload): VisaReadinessRiskLevel {
  if (result.verdict === "HUMAN_REVIEW") return "review";
  if (result.verdict === "NOT_NOW") return "blocked";
  if (result.trust.evidenceStatus === "conflicting") return "high";
  if (result.trust.evidenceStatus === "stale" || result.trust.freshnessStatus === "stale") {
    return "medium";
  }
  if (result.verdict === "GO_WITH_CONDITIONS") return "medium";
  return "low";
}

function statusFromRisk(risk: VisaReadinessRiskLevel): VisaReadinessRoutePointStatus {
  if (risk === "review") return "review";
  if (risk === "blocked") return "blocked";
  if (risk === "medium" || risk === "high") return "attention";
  return "ready";
}

function primaryRequirements(result: ResultPayload): string[] {
  const primary = result.primaryPath;
  if (!primary) return [result.nextAction.detail];
  if (primary.productType === "travel") {
    return primary.requirements.slice(0, 3).map((item) => item.label);
  }
  if (primary.productType === "residency_es") {
    return primary.eligibilityRequirements.slice(0, 3);
  }
  return [
    primary.schengenCompliant ? "Шенгенское покрытие" : "Проверить зону покрытия",
    `Покрытие ${primary.coverageAmountEur} EUR`,
    primary.description
  ];
}

function recommendedScenario(
  scenarioLab: ScenarioLabPayload | null
): ScenarioCandidate | null {
  if (!scenarioLab || scenarioLab.scenarios.length === 0) return null;
  return (
    scenarioLab.scenarios.find((scenario) => scenario.id === scenarioLab.recommendedScenarioId) ??
    scenarioLab.scenarios[0] ??
    null
  );
}

function scenarioRisk(scenario: ScenarioCandidate): VisaReadinessRiskLevel {
  if (scenario.safetyStatus === "human_review_only") return "review";
  if (scenario.safetyStatus === "evidence_blocked") return "blocked";
  if (scenario.safetyStatus === "degraded_usable") return "medium";
  return "low";
}

function buildRoutePoints({
  result,
  scenarioLab,
  selectedRoutePointId
}: {
  result: ResultPayload;
  scenarioLab: ScenarioLabPayload | null;
  selectedRoutePointId: string | null | undefined;
}): VisaReadinessRoutePoint[] {
  const missingDocs = result.documents.items.filter((item) => item.status !== "ready");
  const scenario = recommendedScenario(scenarioLab);
  const baseRisk = riskFromResult(result);
  const docsRisk: VisaReadinessRiskLevel =
    result.verdict === "HUMAN_REVIEW"
      ? "review"
      : missingDocs.some((item) => item.status === "blocked")
        ? "blocked"
        : missingDocs.length > 0
          ? "medium"
          : "low";
  const evidenceRisk: VisaReadinessRiskLevel =
    result.trust.evidenceStatus === "conflicting"
      ? "high"
      : result.trust.evidenceStatus === "stale" || result.trust.freshnessStatus === "stale"
        ? "medium"
        : result.trust.evidenceStatus === "manual_only"
          ? "review"
          : "low";

  const points: VisaReadinessRoutePoint[] = [
    {
      id: "trip",
      label: "Маршрут",
      status: statusFromRisk(baseRisk),
      risk: baseRisk,
      requirements: primaryRequirements(result),
      why:
        result.primaryPath === null
          ? "Движок не нашёл основной путь, поэтому маршрут нельзя показать как готовый."
          : "Пункт показывает rule-based статус основного маршрута без прогноза по визе.",
      selected: false
    },
    {
      id: "documents",
      label: "Документы",
      status: statusFromRisk(docsRisk),
      risk: docsRisk,
      requirements:
        missingDocs.length > 0
          ? missingDocs.slice(0, 3).map((item) => item.label)
          : ["Документный пакет не блокирует следующий шаг"],
      why: documentImpactLabel(result),
      selected: false
    },
    {
      id: "evidence",
      label: "Источники",
      status: statusFromRisk(evidenceRisk),
      risk: evidenceRisk,
      requirements: [
        result.trust.blockingReason ??
          result.trust.humanReviewReason ??
          evidenceLabel(result)
      ],
      why:
        "AI объясняет статус источников как ограничение автоматизации, а не как юридический вывод.",
      selected: false
    },
    {
      id: "next-action",
      label: "Следующий шаг",
      status: result.verdict === "HUMAN_REVIEW" ? "review" : "available",
      risk: result.verdict === "HUMAN_REVIEW" ? "review" : "low",
      requirements: [result.nextAction.label],
      why: `Почему: ${result.nextAction.detail}`,
      selected: false
    }
  ];

  if (scenario) {
    const risk = scenarioRisk(scenario);
    points.push({
      id: "alternative",
      label: "Альтернатива",
      status: statusFromRisk(risk),
      risk,
      requirements: scenario.plan.firstSteps.slice(0, 3),
      why:
        scenario.blockingReason ??
        scenario.humanReviewReason ??
        `Почему: ${scenario.summary}`,
      selected: false
    });
  }

  const capped = points.slice(0, 5);
  const selected =
    capped.find((point) => point.id === selectedRoutePointId)?.id ??
    (result.verdict === "HUMAN_REVIEW"
      ? "evidence"
      : missingDocs.length > 0
        ? "documents"
        : "trip");

  return capped.map((point) => ({
    ...point,
    selected: point.id === selected
  }));
}

function buildActions(result: ResultPayload, hasAlternatives: boolean): VisaReadinessAction[] {
  const actions: VisaReadinessAction[] = [
    {
      id: "primary",
      label: result.nextAction.label,
      targetScreen: result.nextAction.targetScreen,
      why: `Почему: ${result.nextAction.detail}`,
      disabled: false
    }
  ];

  if (result.documents.items.some((item) => item.status !== "ready")) {
    actions.push({
      id: "documents",
      label: "Открыть документы",
      targetScreen: "documents",
      why: "Почему: недостающие документы меняют следующий безопасный шаг.",
      disabled: result.verdict === "HUMAN_REVIEW"
    });
  }

  if (hasAlternatives && actions.length < 3) {
    actions.push({
      id: "alternatives",
      label: "Сравнить альтернативы",
      targetScreen: "result",
      why: "Почему: альтернативы сравниваются с текущим маршрутом, но не заменяют его автоматически.",
      disabled: result.verdict === "HUMAN_REVIEW"
    });
  }

  return actions.slice(0, 3);
}

export function buildVisaReadinessPassScreenModel({
  result,
  scenarioLab,
  selectedRoutePointId = null,
  loading = false,
  errorMessage = null,
  humanReviewResolved = false
}: BuildVisaReadinessPassScreenModelInput): VisaReadinessPassScreenModel {
  if (loading) return emptyModel("loading", "Идёт расчёт готовности маршрута.");
  if (errorMessage) return emptyModel("error", errorMessage);
  if (!result) return emptyModel("empty", "Выберите кейс, чтобы собрать Visa Readiness Pass.");

  const state = evidenceState(result, humanReviewResolved);
  const routePoints = buildRoutePoints({ result, scenarioLab, selectedRoutePointId });
  const selectedPoint = routePoints.find((point) => point.selected) ?? routePoints[0];
  const actions = buildActions(
    result,
    result.alternativePaths.length > 0 || (scenarioLab?.scenarios.length ?? 0) > 0
  );
  const alternatives = [
    ...result.alternativePaths.slice(0, 2).map((offer) => ({
      id: offer.id,
      label:
        offer.productType === "travel"
          ? offer.title
          : offer.productType === "residency_es"
            ? offer.nameRu
            : offer.productNameRu,
      why: "Почему: запасной путь виден для сравнения, но не выбирается автоматически.",
      risk: "medium" as const
    })),
    ...scenarioLab?.scenarios.slice(0, Math.max(0, 2 - result.alternativePaths.length)).map(
      (scenario) => ({
        id: scenario.id,
        label: scenario.title,
        why:
          scenario.blockingReason ??
          scenario.humanReviewReason ??
          `Почему: ${scenario.summary}`,
        risk: scenarioRisk(scenario)
      })
    ) ?? []
  ].slice(0, 2);

  return {
    version: "visa-readiness-pass.v1",
    viewport: { target: "iphone_14", width: 390, height: 844 },
    state,
    componentOrder,
    headerTripSummary: {
      eyebrow: "Visa Readiness Pass",
      title: titleLabel(result),
      routeLabel: routeLabel(result),
      updatedLabel: `Обновлено: ${result.computedAt}`
    },
    readinessStatus: {
      verdict: result.verdict,
      label: verdictLabels[result.verdict],
      tone: verdictTones[result.verdict],
      documentReadinessLabel: `Документы: ${result.documents.readyCount}/${result.documents.requiredCount}`,
      evidenceLabel: evidenceLabel(result),
      why:
        result.trust.blockingReason ??
        result.trust.humanReviewReason ??
        result.whyBullets[0]?.text ??
        "Статус собран из rule-based результата и текущих evidence-сигналов."
    },
    routeRiskMap: {
      label: "Карта риска маршрута",
      selectedPointId: selectedPoint.id,
      points: routePoints,
      selectedPoint
    },
    documentsImpact: {
      label: "Влияние документов",
      readyCount: result.documents.readyCount,
      requiredCount: result.documents.requiredCount,
      completionLabel: formatPercent(result.documents.score),
      impactLabel: documentImpactLabel(result),
      items: result.documents.items.slice(0, 4).map((item) => ({
        id: item.id,
        label: item.label,
        status: item.status,
        impact:
          item.status === "ready" ? "ready" : item.status === "blocked" ? "blocked" : "needed"
      }))
    },
    alternativesCta: {
      label: "Альтернативы и действие",
      primaryCta: actions[0],
      secondaryActions: actions.slice(1),
      alternatives
    },
    aiBoundary: {
      summary:
        result.verdict === "HUMAN_REVIEW"
          ? "AI объясняет, почему нужен человек, и не предлагает продолжать автоматически."
          : "AI объясняет rule-based статус, документы и следующий шаг.",
      why:
        result.verdict === "HUMAN_REVIEW"
          ? "Почему: evidence или доверие не позволяют честно автоматизировать решение."
          : `Почему: следующий шаг основан на поле nextAction: ${result.nextAction.label}.`,
      forbiddenClaims: [
        "visa_approval_prediction",
        "legal_certainty",
        "ai_decision_making"
      ]
    }
  };
}
