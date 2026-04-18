import type {
  Case,
  Offer,
  ResultPayload,
  ScenarioLabActionPlan,
  ScenarioLabComparison,
  ScenarioLabCompareResponse,
  ScenarioLabFamily,
  ScenarioLabPlanStep,
  ScenarioLabSignalChange,
  ScenarioLabSummary
} from "@shared/contracts";
import { isInsuranceOffer, isResidencyOffer, isTravelOffer } from "@shared/contracts";
import type { CaseStore } from "./caseStore";

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function getRootCaseId(store: CaseStore, caseId: string): string {
  let cursor = store.get(caseId);
  let rootId = caseId;
  const visited = new Set<string>();

  while (cursor?.forkedFrom && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    rootId = cursor.forkedFrom;
    cursor = store.get(cursor.forkedFrom);
  }

  return cursor?.id ?? rootId;
}

function collectFamilyCases(store: CaseStore, caseId: string): Case[] {
  const rootCaseId = getRootCaseId(store, caseId);
  return store
    .list()
    .filter((entry) => getRootCaseId(store, entry.id) === rootCaseId)
    .sort((left, right) => {
      if (left.id === rootCaseId) return -1;
      if (right.id === rootCaseId) return 1;
      return left.createdAt.localeCompare(right.createdAt);
    });
}

function formatSignalValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => formatSignalValue(item)).join(", ");
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function diffSignals(baseline: Case, candidate: Case): ScenarioLabSignalChange[] {
  const baselineMap = new Map(baseline.signals.map((signal) => [signal.id, signal.value]));
  const candidateMap = new Map(candidate.signals.map((signal) => [signal.id, signal.value]));
  const signalIds = new Set([...baselineMap.keys(), ...candidateMap.keys()]);

  return Array.from(signalIds)
    .sort((left, right) => left.localeCompare(right))
    .flatMap((signalId) => {
      const before = baselineMap.get(signalId);
      const after = candidateMap.get(signalId);
      const beforeValue = before === undefined ? null : formatSignalValue(before);
      const afterValue = after === undefined ? null : formatSignalValue(after);
      return beforeValue === afterValue
        ? []
        : [{ signalId, before: beforeValue, after: afterValue }];
    });
}

function diffPreferences(baseline: Case, candidate: Case): string[] {
  const baselineMap = new Map(baseline.preferences.map((item) => [item.id, item.weight]));
  const candidateMap = new Map(candidate.preferences.map((item) => [item.id, item.weight]));
  const preferenceIds = new Set([...baselineMap.keys(), ...candidateMap.keys()]);

  return Array.from(preferenceIds)
    .sort((left, right) => left.localeCompare(right))
    .filter((preferenceId) => baselineMap.get(preferenceId) !== candidateMap.get(preferenceId));
}

function offerLabel(offer: Offer | null): string | null {
  if (!offer) return null;
  if (isTravelOffer(offer)) return offer.title;
  if (isResidencyOffer(offer)) return offer.nameRu;
  if (isInsuranceOffer(offer)) return `${offer.providerNameRu} ${offer.productNameRu}`;
  return null;
}

function buildActionPlan(result: ResultPayload): ScenarioLabActionPlan {
  const requiresHumanReview = result.verdict === "HUMAN_REVIEW" || result.primaryPath === null;
  const steps: ScenarioLabPlanStep[] = [
    {
      id: `next_action:${result.nextAction.type}`,
      kind: "next_action",
      state: requiresHumanReview ? "blocked" : "todo",
      label: result.nextAction.label,
      detail: result.nextAction.detail,
      targetScreen: result.nextAction.targetScreen,
      triggeredBy: result.nextAction.triggeredBy
    }
  ];

  for (const item of result.documents.items) {
    if (item.status === "ready") continue;
    steps.push({
      id: `document:${item.id}`,
      kind: "documents",
      state: item.status === "blocked" ? "blocked" : "todo",
      label: item.label,
      detail: item.detail,
      targetScreen: "documents",
      triggeredBy: item.pathId ? [item.pathId] : []
    });
  }

  if (
    result.trust.confidenceBreakdown.capsApplied.length > 0 ||
    result.trust.confidence < 0.65
  ) {
    const caps =
      result.trust.confidenceBreakdown.capsApplied.length > 0
        ? `Ограничения: ${result.trust.confidenceBreakdown.capsApplied.join(", ")}.`
        : "Уверенность ниже рабочего порога.";
    steps.push({
      id: "trust:review",
      kind: "trust",
      state: requiresHumanReview ? "blocked" : "watch",
      label: "Проверить доверие к сценарию",
      detail: `${caps} Текущая уверенность ${round(result.trust.confidence)}.`,
      targetScreen: "trust",
      triggeredBy: result.trust.confidenceBreakdown.capsApplied
    });
  }

  if (requiresHumanReview) {
    steps.push({
      id: "review:escalate",
      kind: "review",
      state: "blocked",
      label: "Передать кейс человеку",
      detail:
        result.nextAction.type === "send_for_review"
          ? result.nextAction.detail
          : "Автоматический маршрут не выбран — без ручной проверки сценарий нельзя считать рабочим.",
      targetScreen: "human-review",
      triggeredBy: result.nextAction.triggeredBy
    });
  }

  return {
    status: requiresHumanReview ? "human_review" : "normal",
    headline: requiresHumanReview ? "Нужна ручная проверка" : result.nextAction.label,
    detail: requiresHumanReview
      ? result.nextAction.type === "send_for_review"
        ? result.nextAction.detail
        : "Нормального автоматического исхода нет, поэтому кейс нужно передать на ручную проверку."
      : result.nextAction.detail,
    escalationReason: requiresHumanReview
      ? result.nextAction.type === "send_for_review"
        ? result.nextAction.detail
        : "Не выбран основной маршрут."
      : null,
    primaryAction: result.nextAction,
    steps
  };
}

export function buildScenarioSummary(
  baselineCase: Case,
  candidateCase: Case,
  result: ResultPayload
): ScenarioLabSummary {
  const changedSignals = diffSignals(baselineCase, candidateCase);
  const changedPreferenceIds = diffPreferences(baselineCase, candidateCase);
  return {
    caseId: candidateCase.id,
    title: candidateCase.title,
    productType: candidateCase.productType,
    forkedFrom: candidateCase.forkedFrom,
    signalCount: candidateCase.signals.length,
    changedSignalIds: changedSignals.map((item) => item.signalId),
    changedPreferenceIds,
    changedSignals,
    outcome: {
      verdict: result.verdict,
      confidence: round(result.trust.confidence),
      primaryPathId: result.primaryPath?.id ?? null,
      primaryPathLabel: offerLabel(result.primaryPath),
      alternativePathIds: result.alternativePaths.map((offer) => offer.id),
      alternativePathLabels: result.alternativePaths.map((offer) => offerLabel(offer) ?? offer.id),
      documentsScore: round(result.documents.score),
      documentsReadyCount: result.documents.readyCount,
      documentsRequiredCount: result.documents.requiredCount,
      nextActionType: result.nextAction.type,
      nextActionLabel: result.nextAction.label,
      humanReview: result.verdict === "HUMAN_REVIEW" || result.primaryPath === null
    },
    actionPlan: buildActionPlan(result)
  };
}

export function compareScenarioSummaries(
  baseline: ScenarioLabSummary,
  candidate: ScenarioLabSummary
): ScenarioLabComparison {
  const baselineAlternatives = new Set(baseline.outcome.alternativePathIds);
  const candidateAlternatives = new Set(candidate.outcome.alternativePathIds);

  return {
    baseline,
    candidate,
    delta: {
      verdictChanged: baseline.outcome.verdict !== candidate.outcome.verdict,
      confidenceDelta: round(candidate.outcome.confidence - baseline.outcome.confidence),
      primaryPathChanged: baseline.outcome.primaryPathId !== candidate.outcome.primaryPathId,
      documentsScoreDelta: round(
        candidate.outcome.documentsScore - baseline.outcome.documentsScore
      ),
      documentsReadyDelta:
        candidate.outcome.documentsReadyCount - baseline.outcome.documentsReadyCount,
      nextActionChanged:
        baseline.outcome.nextActionType !== candidate.outcome.nextActionType ||
        baseline.outcome.nextActionLabel !== candidate.outcome.nextActionLabel,
      humanReviewChanged:
        baseline.outcome.humanReview !== candidate.outcome.humanReview,
      addedAlternativePathIds: candidate.outcome.alternativePathIds.filter(
        (id) => !baselineAlternatives.has(id)
      ),
      removedAlternativePathIds: baseline.outcome.alternativePathIds.filter(
        (id) => !candidateAlternatives.has(id)
      ),
      changedSignalIds: candidate.changedSignalIds,
      changedPreferenceIds: candidate.changedPreferenceIds,
      changedSignals: candidate.changedSignals
    }
  };
}

export function buildScenarioFamily(
  store: CaseStore,
  focusCaseId: string,
  computeResult: (caseData: Case) => ResultPayload
): ScenarioLabFamily {
  const familyCases = collectFamilyCases(store, focusCaseId);
  const rootCase = familyCases[0];
  if (!rootCase) {
    throw new Error(`Scenario family for ${focusCaseId} is empty.`);
  }

  const baseline = buildScenarioSummary(rootCase, rootCase, computeResult(rootCase));
  const scenarios = familyCases.map((entry) =>
    buildScenarioSummary(rootCase, entry, computeResult(entry))
  );

  return {
    rootCaseId: rootCase.id,
    focusCaseId,
    baseline,
    scenarios,
    comparisons: scenarios
      .filter((scenario) => scenario.caseId !== baseline.caseId)
      .map((scenario) => compareScenarioSummaries(baseline, scenario))
  };
}

export function buildScenarioCompareResponse(input: {
  store: CaseStore;
  baselineCase: Case;
  candidateCase: Case;
  candidateDecisionRecordId?: string | null;
  computeResult: (caseData: Case) => ResultPayload;
}): ScenarioLabCompareResponse {
  const { store, baselineCase, candidateCase, candidateDecisionRecordId, computeResult } = input;
  const rootCaseId = getRootCaseId(store, baselineCase.id);
  const baselineSummary = buildScenarioSummary(
    baselineCase,
    baselineCase,
    computeResult(baselineCase)
  );
  const candidateSummary = buildScenarioSummary(
    baselineCase,
    candidateCase,
    computeResult(candidateCase)
  );

  return {
    rootCaseId,
    baseline: baselineSummary,
    candidateCase,
    comparison: compareScenarioSummaries(baselineSummary, candidateSummary),
    candidateDecisionRecordId: candidateDecisionRecordId ?? null
  };
}

export function ensureSameScenarioFamily(
  store: CaseStore,
  baselineCaseId: string,
  candidateCaseId: string
): boolean {
  return getRootCaseId(store, baselineCaseId) === getRootCaseId(store, candidateCaseId);
}
