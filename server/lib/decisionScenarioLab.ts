import {
  isInsuranceOffer,
  isResidencyOffer,
  isTravelOffer,
  type Case,
  type Offer,
  type ResultPayload,
  type ScenarioActionPlan,
  type ScenarioCandidate,
  type ScenarioCandidateType,
  type ScenarioConciergeDelta,
  type ScenarioDocumentsDelta,
  type ScenarioIssue,
  type ScenarioLabPayload,
  type ScenarioSafetyStatus,
  type ProductType,
  type SignalId
} from "@shared/contracts";
import {
  fingerprintResult,
  runDecision,
  type OrchestratorCatalogs
} from "@shared/domain/engine";

type ScenarioDraft = {
  id: string;
  type: ScenarioCandidateType;
  title: string;
  summary: string;
  caseData: Case;
  firstSteps: string[];
  criticalSteps: string[];
  canWait: string[];
};

const verdictRank: Record<ResultPayload["verdict"], number> = {
  GO: 4,
  GO_WITH_CONDITIONS: 3,
  NOT_NOW: 2,
  HUMAN_REVIEW: 1
};

const scenarioDraftBuilders: Record<ProductType, (caseData: Case) => ScenarioDraft[]> = {
  travel: buildTravelSignalFixes,
  residency_es: buildResidencySignalFixes,
  insurance_adult: () => []
};

const evidenceBlockedStatuses = new Set<ResultPayload["trust"]["evidenceStatus"]>([
  "conflicting",
  "missing",
  "stale"
]);

function offerLabel(offer: Offer | null): string | null {
  if (!offer) return null;
  if (isTravelOffer(offer)) return offer.title;
  if (isResidencyOffer(offer)) return offer.nameRu;
  if (isInsuranceOffer(offer)) return `${offer.providerNameRu} · ${offer.productNameRu}`;
  return null;
}

function getSignal(caseData: Case, signalId: SignalId): Case["signals"][number] | undefined {
  return caseData.signals.find((signal) => signal.id === signalId);
}

function getNumericSignal(caseData: Case, signalId: SignalId): number | null {
  const signal = getSignal(caseData, signalId);
  return typeof signal?.value === "number" ? signal.value : null;
}

function getBooleanSignal(caseData: Case, signalId: SignalId): boolean | null {
  const signal = getSignal(caseData, signalId);
  return typeof signal?.value === "boolean" ? signal.value : null;
}

function withSignal(caseData: Case, signalId: SignalId, value: unknown): Case {
  const timestamp = new Date().toISOString();
  const nextSignals = caseData.signals.some((signal) => signal.id === signalId)
    ? caseData.signals.map((signal) =>
        signal.id === signalId
          ? {
              ...signal,
              value,
              source: "user" as const,
              capturedAt: timestamp
            }
          : signal
      )
    : [
        ...caseData.signals,
        {
          id: signalId,
          value,
          source: "user" as const,
          capturedAt: timestamp
        }
      ];

  return {
    ...caseData,
    updatedAt: timestamp,
    signals: nextSignals
  };
}

function withPreferences(
  caseData: Case,
  preferredPathId: string,
  currentPrimaryPathId?: string | null
): Case {
  const nextPreferences = caseData.preferences.filter(
    (preference) =>
      preference.id !== preferredPathId && preference.id !== currentPrimaryPathId
  );

  nextPreferences.push({ id: preferredPathId, weight: 1 });
  if (currentPrimaryPathId) {
    nextPreferences.push({ id: currentPrimaryPathId, weight: -0.4 });
  }

  return {
    ...caseData,
    updatedAt: new Date().toISOString(),
    preferences: nextPreferences
  };
}

function riskLabels(result: ResultPayload): string[] {
  const labels = new Set<string>();
  if (result.criticalRisk) labels.add(result.criticalRisk.label);
  for (const risk of result.risks) labels.add(risk.label);
  return [...labels];
}

function buildConciergeDelta(
  before: ResultPayload,
  after: ResultPayload
): ScenarioConciergeDelta {
  const beforeRisks = riskLabels(before);
  const afterRisks = riskLabels(after);

  return {
    verdict: {
      before: before.verdict,
      after: after.verdict,
      changed: before.verdict !== after.verdict
    },
    confidence: {
      before: before.trust.confidence,
      after: after.trust.confidence,
      delta: Math.round((after.trust.confidence - before.trust.confidence) * 100) / 100
    },
    documents: {
      readyCountBefore: before.documents.readyCount,
      readyCountAfter: after.documents.readyCount,
      readyCountDelta: after.documents.readyCount - before.documents.readyCount,
      requiredCountBefore: before.documents.requiredCount,
      requiredCountAfter: after.documents.requiredCount,
      scoreBefore: before.documents.score,
      scoreAfter: after.documents.score,
      scoreDelta: Math.round((after.documents.score - before.documents.score) * 100) / 100
    },
    risks: {
      resolved: beforeRisks.filter((label) => !afterRisks.includes(label)),
      added: afterRisks.filter((label) => !beforeRisks.includes(label)),
      remaining: afterRisks
    },
    nextAction: {
      beforeType: before.nextAction.type,
      afterType: after.nextAction.type,
      beforeLabel: before.nextAction.label,
      afterLabel: after.nextAction.label,
      changed:
        before.nextAction.type !== after.nextAction.type ||
        before.nextAction.label !== after.nextAction.label
    },
    evidenceStatus: {
      before: before.trust.evidenceStatus,
      after: after.trust.evidenceStatus,
      changed: before.trust.evidenceStatus !== after.trust.evidenceStatus
    },
    freshnessStatus: {
      before: before.trust.freshnessStatus,
      after: after.trust.freshnessStatus,
      changed: before.trust.freshnessStatus !== after.trust.freshnessStatus
    },
    blockingReason: {
      before: before.trust.blockingReason,
      after: after.trust.blockingReason,
      changed: before.trust.blockingReason !== after.trust.blockingReason
    },
    humanReviewReason: {
      before: before.trust.humanReviewReason,
      after: after.trust.humanReviewReason,
      changed: before.trust.humanReviewReason !== after.trust.humanReviewReason
    }
  };
}

function documentsDelta(before: ResultPayload, after: ResultPayload): ScenarioDocumentsDelta {
  return {
    readyCountBefore: before.documents.readyCount,
    readyCountAfter: after.documents.readyCount,
    requiredCount: Math.max(before.documents.requiredCount, after.documents.requiredCount),
    itemsToCollect: after.documents.items.filter((item) => item.status !== "ready")
  };
}

function humanReviewRequired(result: ResultPayload): boolean {
  return (
    result.verdict === "HUMAN_REVIEW" ||
    result.nextAction.priority === "human_review" ||
    result.nextAction.type === "send_for_review" ||
    result.ruleResults.some((rule) => rule.fired && rule.output.type === "human_review_trigger")
  );
}

function scenarioSafetyStatus(
  before: ResultPayload,
  after: ResultPayload
): ScenarioSafetyStatus {
  if (evidenceBlockedStatuses.has(after.trust.evidenceStatus)) {
    return "evidence_blocked";
  }

  if (after.trust.evidenceStatus === "manual_only" || humanReviewRequired(after)) {
    return "human_review_only";
  }

  const beforeRisks = riskLabels(before);
  const afterRisks = riskLabels(after);
  const addedRisk = afterRisks.some((label) => !beforeRisks.includes(label));
  const verdictDegraded = verdictRank[after.verdict] < verdictRank[before.verdict];
  const confidenceDegraded = before.trust.confidence - after.trust.confidence >= 0.03;

  if (verdictDegraded || confidenceDegraded || addedRisk) {
    return "degraded_usable";
  }

  return "safe_automatic";
}

function buildWhyChanged(
  before: ResultPayload,
  after: ResultPayload,
  draft: ScenarioDraft
): string[] {
  const bullets: string[] = [];

  if (before.verdict !== after.verdict) {
    bullets.push(`Вердикт меняется: было ${before.verdict}, стало ${after.verdict}.`);
  }

  const confidenceDelta = after.trust.confidence - before.trust.confidence;
  if (Math.abs(confidenceDelta) >= 0.03) {
    bullets.push(
      confidenceDelta > 0
        ? `Уверенность растёт с ${Math.round(before.trust.confidence * 100)}% до ${Math.round(after.trust.confidence * 100)}%.`
        : `Уверенность падает с ${Math.round(before.trust.confidence * 100)}% до ${Math.round(after.trust.confidence * 100)}%.`
    );
  }

  if ((before.primaryPath?.id ?? null) !== (after.primaryPath?.id ?? null)) {
    bullets.push(
      after.primaryPath
        ? `Основной путь переключается на «${offerLabel(after.primaryPath)}».`
        : "Основной путь больше не подтверждается автоматически."
    );
  }

  const resolvedRules = before.ruleResults
    .filter((rule) => rule.fired)
    .filter(
      (rule) =>
        !after.ruleResults.some(
          (candidate) => candidate.ruleId === rule.ruleId && candidate.fired
        )
    )
    .map((rule) => rule.explanation);

  for (const explanation of resolvedRules.slice(0, 2)) {
    bullets.push(explanation);
  }

  if (bullets.length === 0 && draft.type === "documents") {
    bullets.push(
      `Чеклист усиливается: ${after.documents.readyCount} из ${after.documents.requiredCount} вместо ${before.documents.readyCount}.`
    );
  }

  if (bullets.length === 0) {
    bullets.push(draft.summary);
  }

  return bullets.slice(0, 4);
}

function dedupeLines(lines: string[]): string[] {
  return [...new Set(lines.filter(Boolean))];
}

function buildPlan(
  draft: ScenarioDraft,
  after: ResultPayload,
  before: ResultPayload
): ScenarioActionPlan {
  const pendingDocs = after.documents.items
    .filter((item) => item.status !== "ready")
    .map((item) => item.label);
  const humanReviewReason =
    after.ruleResults.find((rule) => rule.fired && rule.output.type === "human_review_trigger")
      ?.explanation ?? (humanReviewRequired(after) ? after.nextAction.detail : null);

  const headline =
    after.verdict === "HUMAN_REVIEW"
      ? "Автоматического улучшения недостаточно — нужен человек."
      : after.verdict !== before.verdict
        ? `После этого сценария кейс переходит в ${after.verdict}.`
        : `После этого сценария следующий шаг — ${after.nextAction.label.toLowerCase()}.`;

  const critical: string[] = [...draft.criticalSteps];
  if (after.criticalRisk) {
    critical.push(after.criticalRisk.detail);
  }
  if (pendingDocs.length > 0 && draft.type !== "documents") {
    critical.push(`Не забыть добрать документы: ${pendingDocs.slice(0, 2).join(", ")}.`);
  }
  if (humanReviewReason) {
    critical.push(humanReviewReason);
  }

  const later = [...draft.canWait];
  if (after.nextAction.type !== "send_for_review") {
    later.push(`После этого перейти к шагу «${after.nextAction.label}».`);
  }

  return {
    headline,
    firstSteps: dedupeLines(draft.firstSteps).slice(0, 3),
    criticalSteps: dedupeLines(critical).slice(0, 3),
    canWait: dedupeLines(later).slice(0, 3),
    humanReviewRequired: humanReviewRequired(after),
    humanReviewReason
  };
}

function isHelpfulScenario(
  before: ResultPayload,
  after: ResultPayload,
  draft: ScenarioDraft
): boolean {
  if (after.verdict !== before.verdict && verdictRank[after.verdict] >= verdictRank[before.verdict]) {
    return true;
  }
  if (after.trust.confidence - before.trust.confidence >= 0.03) {
    return true;
  }
  if (after.documents.readyCount > before.documents.readyCount) {
    return true;
  }
  if (draft.type === "human_review") {
    return true;
  }

  if (
    draft.type === "path_switch" &&
    after.verdict !== "HUMAN_REVIEW" &&
    (before.primaryPath?.id ?? null) !== (after.primaryPath?.id ?? null) &&
    (
      before.verdict !== after.verdict ||
      Math.abs(after.trust.confidence - before.trust.confidence) >= 0.03 ||
      before.documents.score !== after.documents.score ||
      before.nextAction.type !== after.nextAction.type ||
      riskLabels(before).join("|") !== riskLabels(after).join("|")
    )
  ) {
    return true;
  }

  const beforeRisks = new Set(riskLabels(before));
  const afterRisks = new Set(riskLabels(after));
  return [...beforeRisks].some((label) => !afterRisks.has(label));
}

function scenarioFromDraft(
  before: ResultPayload,
  after: ResultPayload,
  draft: ScenarioDraft
): ScenarioCandidate {
  const delta = buildConciergeDelta(before, after);

  return {
    id: draft.id,
    type: draft.type,
    title: draft.title,
    summary: draft.summary,
    recommended: false,
    safetyStatus: scenarioSafetyStatus(before, after),
    evidenceStatus: after.trust.evidenceStatus,
    freshnessStatus: after.trust.freshnessStatus,
    blockingReason: after.trust.blockingReason,
    humanReviewReason: after.trust.humanReviewReason,
    nextAction: after.nextAction,
    comparison: {
      verdictBefore: before.verdict,
      verdictAfter: after.verdict,
      confidenceBefore: before.trust.confidence,
      confidenceAfter: after.trust.confidence,
      primaryPathBefore: {
        id: before.primaryPath?.id ?? null,
        label: offerLabel(before.primaryPath)
      },
      primaryPathAfter: {
        id: after.primaryPath?.id ?? null,
        label: offerLabel(after.primaryPath)
      },
      resolvedRisks: riskLabels(before).filter((label) => !riskLabels(after).includes(label)),
      remainingRisks: riskLabels(after),
      documents: documentsDelta(before, after),
      whyChanged: buildWhyChanged(before, after, draft)
    },
    delta,
    plan: buildPlan(draft, after, before)
  };
}

function issueKind(rule: ResultPayload["ruleResults"][number]): ScenarioIssue["kind"] {
  if (rule.output.type === "human_review_trigger") return "review";
  if (rule.output.type === "blocker") return "blocking";
  return "warning";
}

function issueSeverity(rule: ResultPayload["ruleResults"][number]): ScenarioIssue["severity"] {
  if (rule.output.type === "human_review_trigger") return "high";
  return rule.output.severity ?? "medium";
}

function issueTitle(rule: ResultPayload["ruleResults"][number]): string {
  switch (rule.category) {
    case "document":
    case "completeness":
      return "Документы";
    case "slot":
      return "Слот подачи";
    case "timeline":
      return "Сроки";
    case "insurance":
    case "insurance_compliance":
    case "insurance_coverage":
    case "insurance_chronic":
    case "insurance_activities":
      return "Страховка";
    case "payment":
      return "Платёжный канал";
    case "registration":
      return "Регистрация по прибытии";
    case "sanctions":
      return "Ручная проверка по ограничениям";
    case "residency_eligibility":
    case "residency_program":
    case "residency_compliance":
      return "Требования программы";
    default:
      return "Что мешает сейчас";
  }
}

function buildIssues(result: ResultPayload): ScenarioIssue[] {
  const issues: ScenarioIssue[] = result.ruleResults
    .filter(
      (rule) =>
        rule.fired &&
        (rule.output.type === "blocker" ||
          rule.output.type === "warning" ||
          rule.output.type === "human_review_trigger")
    )
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 4)
    .map((rule) => ({
      id: `issue:${rule.ruleId}`,
      title: issueTitle(rule),
      detail: rule.explanation,
      severity: issueSeverity(rule),
      kind: issueKind(rule),
      ruleId: rule.ruleId,
      signalIds: rule.consumedSignals
    }));

  if (issues.length === 0 && result.documents.requiredCount > result.documents.readyCount) {
    issues.push({
      id: "issue:documents",
      title: "Документы",
      detail: `Готово ${result.documents.readyCount} из ${result.documents.requiredCount} документов — без полного пакета шанс не укрепится.`,
      severity: "medium",
      kind: "warning",
      ruleId: null,
      signalIds: ["documents_ready_count", "documents_required_count"]
    });
  }

  return issues;
}

function buildDocumentScenario(caseData: Case, result: ResultPayload): ScenarioDraft | null {
  if (result.documents.requiredCount === 0 || result.documents.readyCount >= result.documents.requiredCount) {
    return null;
  }

  const missingItems = result.documents.items.filter((item) => item.status !== "ready");
  return {
    id: "documents-ready",
    type: "documents",
    title: "Добрать обязательные документы",
    summary: "Закрываем недостающий чеклист по текущему пути и смотрим, как меняется исход.",
    caseData: withSignal(caseData, "documents_ready_count", result.documents.requiredCount),
    firstSteps: missingItems.slice(0, 3).map((item) => item.label),
    criticalSteps: missingItems
      .filter((item) => item.status === "blocked")
      .slice(0, 2)
      .map((item) => item.detail),
    canWait: ["Дополнительные оптимизации имеет смысл делать уже после полного чеклиста."]
  };
}

function buildTravelSignalFixes(caseData: Case): ScenarioDraft[] {
  const drafts: ScenarioDraft[] = [];

  if (getBooleanSignal(caseData, "insurance_ok") === false) {
    drafts.push({
      id: "travel-insurance-ok",
      type: "signal_fix",
      title: "Подтвердить страховку",
      summary: "Снимаем риск по полису и пересчитываем исход на том же маршруте.",
      caseData: withSignal(caseData, "insurance_ok", true),
      firstSteps: [
        "Оформить полис на все дни поездки.",
        "Проверить покрытие не ниже 30000€."
      ],
      criticalSteps: ["Без подтверждённой страховки кейс остаётся условным."],
      canWait: []
    });
  }

  if (getBooleanSignal(caseData, "payment_cards_ok") === false) {
    drafts.push({
      id: "travel-payment-ready",
      type: "signal_fix",
      title: "Подготовить рабочий способ оплаты",
      summary: "Проверяем, уйдёт ли предупреждение по платежам после подтверждения канала оплаты.",
      caseData: withSignal(caseData, "payment_cards_ok", true),
      firstSteps: [
        "Подтвердить рабочую карту или другой способ оплаты в стране назначения.",
        "Зафиксировать резервный способ оплаты."
      ],
      criticalSteps: ["Без платежного канала поездка остаётся с операционным риском."],
      canWait: []
    });
  }

  if (getBooleanSignal(caseData, "registration_on_arrival_ok") === false) {
    drafts.push({
      id: "travel-registration-ready",
      type: "signal_fix",
      title: "Подтвердить регистрацию по прибытии",
      summary: "Снимаем риск по регистрации и проверяем, меняется ли итог.",
      caseData: withSignal(caseData, "registration_on_arrival_ok", true),
      firstSteps: [
        "Подтвердить адрес проживания или принимающую сторону.",
        "Проверить дедлайн регистрации после въезда."
      ],
      criticalSteps: ["Просрочка регистрации ломает даже хороший маршрут."],
      canWait: []
    });
  }

  const timeline = getNumericSignal(caseData, "timeline_weeks");
  const slot = getNumericSignal(caseData, "slot_available_weeks");
  if (timeline !== null && slot !== null && slot > timeline) {
    drafts.push({
      id: "travel-shift-timeline",
      type: "timing_shift",
      title: "Сдвинуть поездку на реалистичный срок",
      summary: "Синхронизируем выезд со слотом подачи и повторно считаем кейс.",
      caseData: withSignal(caseData, "timeline_weeks", slot + 1),
      firstSteps: [
        `Сдвинуть выезд минимум до ${slot + 1} нед.`,
        "После этого заново проверить слот подачи."
      ],
      criticalSteps: ["Если горизонт короче слота, шанс останется искусственно завышенным."],
      canWait: []
    });
  }

  return drafts;
}

function buildResidencySignalFixes(caseData: Case): ScenarioDraft[] {
  const drafts: ScenarioDraft[] = [];
  const insuranceType = getSignal(caseData, "health_insurance_type")?.value;
  if (
    insuranceType === "none" ||
    insuranceType === "travel_only" ||
    insuranceType === "private_basic"
  ) {
    drafts.push({
      id: "residency-upgrade-insurance",
      type: "signal_fix",
      title: "Оформить подходящую страховку для ВНЖ",
      summary: "Смотрим, как меняется кейс после полной частной страховки без соплатежей.",
      caseData: withSignal(caseData, "health_insurance_type", "private_comprehensive"),
      firstSteps: [
        "Подобрать частную страховку без соплатежей.",
        "Сохранить полис и условия покрытия для подачи."
      ],
      criticalSteps: ["Туристическая страховка не закрывает требования ВНЖ."],
      canWait: []
    });
  }

  return drafts;
}

function buildAlternativePathScenarios(caseData: Case, result: ResultPayload): ScenarioDraft[] {
  const currentPrimaryId = result.primaryPath?.id ?? null;

  return result.alternativePaths.slice(0, 2).map((offer) => ({
    id: `switch:${offer.id}`,
    type: "path_switch",
    title: `Сравнить путь «${offerLabel(offer)}»`,
    summary: "Принудительно поднимаем альтернативу в приоритет и сравниваем с текущим решением.",
    caseData: withPreferences(caseData, offer.id, currentPrimaryId),
    firstSteps: [
      `Переключить фокус на путь «${offerLabel(offer)}».`,
      "Проверить требования выбранного маршрута."
    ],
    criticalSteps: ["Менять путь имеет смысл только если итог реально улучшается."],
    canWait: []
  }));
}

function humanReviewScenarioSafetyStatus(result: ResultPayload): ScenarioSafetyStatus {
  return evidenceBlockedStatuses.has(result.trust.evidenceStatus)
    ? "evidence_blocked"
    : "human_review_only";
}

function humanReviewScenarioNextAction(result: ResultPayload, reason: string): ResultPayload["nextAction"] {
  return {
    type: "send_for_review",
    priority: "human_review",
    label: "Открыть ручную проверку",
    detail: reason,
    targetScreen: "human-review",
    triggeredBy: result.ruleResults
      .filter((rule) => rule.fired && rule.output.type === "human_review_trigger")
      .map((rule) => rule.ruleId)
      .concat("no_helpful_scenarios")
  };
}

function buildHumanReviewScenario(result: ResultPayload): ScenarioCandidate {
  const reason =
    result.ruleResults.find((rule) => rule.fired && rule.output.type === "human_review_trigger")
      ?.explanation ?? result.nextAction.detail;
  const nextAction = humanReviewScenarioNextAction(result, reason);
  const scenarioResult: ResultPayload = {
    ...result,
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    nextAction,
    trust: {
      ...result.trust,
      confidence: 0,
      humanReviewReason: result.trust.humanReviewReason ?? reason
    }
  };
  const delta = buildConciergeDelta(result, scenarioResult);

  return {
    id: "human-review",
    type: "human_review",
    title: "Передать кейс в ручную проверку",
    summary: "Если автоматический пересчёт не даёт нормальный исход, не рисуем оптимизм и зовём человека.",
    recommended: true,
    safetyStatus: humanReviewScenarioSafetyStatus(result),
    evidenceStatus: result.trust.evidenceStatus,
    freshnessStatus: result.trust.freshnessStatus,
    blockingReason: result.trust.blockingReason,
    humanReviewReason: result.trust.humanReviewReason ?? reason,
    nextAction,
    comparison: {
      verdictBefore: result.verdict,
      verdictAfter: "HUMAN_REVIEW",
      confidenceBefore: result.trust.confidence,
      confidenceAfter: scenarioResult.trust.confidence,
      primaryPathBefore: {
        id: result.primaryPath?.id ?? null,
        label: offerLabel(result.primaryPath)
      },
      primaryPathAfter: {
        id: null,
        label: null
      },
      resolvedRisks: [],
      remainingRisks: riskLabels(result),
      documents: {
        readyCountBefore: result.documents.readyCount,
        readyCountAfter: result.documents.readyCount,
        requiredCount: result.documents.requiredCount,
        itemsToCollect: result.documents.items.filter((item) => item.status !== "ready")
      },
      whyChanged: [reason]
    },
    delta,
    plan: {
      headline: "Кейс упирается в факторы, которые автомат не должен трактовать сам.",
      firstSteps: ["Подготовить всё, что уже известно по кейсу, без попытки “додавить” автомат."],
      criticalSteps: [reason],
      canWait: ["Дополнительные оптимизации имеет смысл делать уже после решения менеджера."],
      humanReviewRequired: true,
      humanReviewReason: reason
    }
  };
}

function rankScenario(candidate: ScenarioCandidate): number {
  const safetyRank: Record<ScenarioSafetyStatus, number> = {
    safe_automatic: 300,
    degraded_usable: 150,
    evidence_blocked: 0,
    human_review_only: 0
  };

  return (
    safetyRank[candidate.safetyStatus ?? "degraded_usable"] +
    verdictRank[candidate.comparison.verdictAfter] * 100 +
    Math.round(candidate.comparison.confidenceAfter * 100) +
    candidate.comparison.resolvedRisks.length * 10 +
    (candidate.type === "documents" ? 3 : 0)
  );
}

export function buildDecisionScenarioLab(
  caseData: Case,
  catalogs: OrchestratorCatalogs,
  baseResult?: ResultPayload
): ScenarioLabPayload {
  const referenceResult = baseResult ?? runDecision({ case: caseData, catalogs });
  const stableNow = new Date(referenceResult.computedAt);
  const runScenario = (draft: ScenarioDraft) =>
    runDecision(
      { case: draft.caseData, catalogs },
      {
        now: () => new Date(stableNow)
      }
    );

  const drafts: ScenarioDraft[] = [];
  const documentsDraft = buildDocumentScenario(caseData, referenceResult);
  if (documentsDraft) drafts.push(documentsDraft);

  drafts.push(...scenarioDraftBuilders[caseData.productType](caseData));

  drafts.push(...buildAlternativePathScenarios(caseData, referenceResult));

  const scenarios: ScenarioCandidate[] = [];
  const seenFingerprints = new Set<string>([fingerprintResult(referenceResult)]);
  for (const draft of drafts) {
    const simulated = runScenario(draft);
    const fingerprint = fingerprintResult(simulated);
    if (seenFingerprints.has(fingerprint)) continue;
    seenFingerprints.add(fingerprint);
    if (!isHelpfulScenario(referenceResult, simulated, draft)) continue;
    scenarios.push(scenarioFromDraft(referenceResult, simulated, draft));
  }

  scenarios.sort((left, right) => rankScenario(right) - rankScenario(left));
  const trimmed = scenarios.slice(0, 4);
  const noHelpfulScenarios = trimmed.length === 0;

  return {
    version: "scenario-lab.v1",
    caseId: caseData.id,
    generatedAt: stableNow.toISOString(),
    baseResult: referenceResult,
    issues: buildIssues(referenceResult),
    scenarios: noHelpfulScenarios
      ? [buildHumanReviewScenario(referenceResult)]
      : trimmed.map((scenario, index) => ({
          ...scenario,
          recommended: index === 0
        })),
    recommendedScenarioId: noHelpfulScenarios ? "human-review" : trimmed[0]?.id ?? null,
    noHelpfulScenarios,
    humanReviewEscalation: {
      required: humanReviewRequired(referenceResult) || noHelpfulScenarios,
      title:
        humanReviewRequired(referenceResult) || noHelpfulScenarios
          ? "Нужна ручная проверка"
          : "Ручная проверка не нужна",
      detail:
        humanReviewRequired(referenceResult) || noHelpfulScenarios
          ? "Если ни один сценарий не даёт нормальный исход, кейс нужно передать человеку."
          : "По текущему кейсу есть хотя бы один сценарий, который можно безопасно отработать без ручной проверки.",
      triggeredBy: referenceResult.ruleResults
        .filter((rule) => rule.fired && rule.output.type === "human_review_trigger")
        .map((rule) => rule.ruleId)
        .concat(noHelpfulScenarios ? ["no_helpful_scenarios"] : [])
    }
  };
}
