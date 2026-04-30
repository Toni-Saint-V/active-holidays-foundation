import type {
  HumanReviewLearningEvent,
  HumanReviewLearningEvidenceGap,
  HumanReviewLearningRootCause,
  HumanReviewOpsBlocker,
  HumanReviewRequest,
  ResultPayload
} from "@shared/contracts";

const rootCauseLabels: Record<HumanReviewLearningRootCause, string> = {
  missing_evidence: "Не хватает доказательной базы",
  stale_evidence: "Источники устарели",
  conflicting_evidence: "Источники конфликтуют",
  missing_signal: "Не хватает входного сигнала",
  policy_ambiguity: "Правило требует ручной интерпретации",
  operator_override_only: "Операторское решение без машинно-устранимой причины"
};

export function humanReviewLearningEventId(request: HumanReviewRequest): string {
  const resolvedAt = request.resolution?.resolvedAt ?? request.closedAt ?? request.updatedAt;
  return `hrl_${request.id}_${resolvedAt}`;
}

function classifyRootCause(input: {
  requestBefore: HumanReviewRequest;
  postResult: ResultPayload;
  blockers: HumanReviewOpsBlocker[];
}): HumanReviewLearningRootCause {
  if (input.postResult.trust.evidenceStatus === "conflicting") {
    return "conflicting_evidence";
  }
  if (
    input.postResult.trust.evidenceStatus === "stale" ||
    input.postResult.trust.freshnessStatus === "stale"
  ) {
    return "stale_evidence";
  }
  if (
    input.postResult.trust.evidenceStatus === "missing" ||
    input.postResult.trust.evidenceStatus === "manual_only"
  ) {
    return "missing_evidence";
  }
  if (input.postResult.decisionSignals.some((signal) => !signal.present)) {
    return "missing_signal";
  }
  if (
    input.blockers.some((blocker) => blocker.type === "human_review_trigger") ||
    input.requestBefore.handoff?.safetyStatus === "human_review_only"
  ) {
    return "policy_ambiguity";
  }
  return "operator_override_only";
}

function evidenceGaps(blockers: HumanReviewOpsBlocker[]): HumanReviewLearningEvidenceGap[] {
  return blockers.map((blocker) => ({
    id: blocker.id,
    label: blocker.label,
    detail: blocker.detail,
    severity: blocker.severity,
    ruleId: blocker.ruleId
  }));
}

export function buildHumanReviewLearningEvent(input: {
  requestBefore: HumanReviewRequest;
  requestAfter: HumanReviewRequest;
  postResult: ResultPayload;
  blockers: HumanReviewOpsBlocker[];
  postDecisionRecordId: string | null;
  now?: Date;
}): HumanReviewLearningEvent {
  const resolvedAt =
    input.requestAfter.resolution?.resolvedAt ??
    input.requestAfter.closedAt ??
    input.requestAfter.updatedAt;
  const resolutionSummary =
    input.requestAfter.resolution?.summary ??
    input.requestAfter.events.at(-1)?.note ??
    "Оператор закрыл ручную проверку.";
  const rootCause = classifyRootCause({
    requestBefore: input.requestBefore,
    postResult: input.postResult,
    blockers: input.blockers
  });
  const beforeActionType =
    input.requestBefore.snapshot.verdict === "HUMAN_REVIEW"
      ? "send_for_review"
      : input.postResult.nextAction.type;

  return {
    version: "human-review-learning.v1",
    ingestedVia: "terminal_resolution",
    ingestReason: "Captured automatically when operator resolved human review.",
    ingestedAt: input.now?.toISOString() ?? resolvedAt,
    eventId: humanReviewLearningEventId(input.requestAfter),
    requestId: input.requestAfter.id,
    caseId: input.requestAfter.caseId,
    capturedAt: input.now?.toISOString() ?? resolvedAt,
    resolvedAt,
    resolutionSummary,
    rootCause,
    rootCauseLabel: rootCauseLabels[rootCause],
    fixedSignals: [],
    evidenceGaps: evidenceGaps(input.blockers),
    verdictDelta: {
      before: input.requestBefore.snapshot.verdict,
      after: input.postResult.verdict,
      changed: input.requestBefore.snapshot.verdict !== input.postResult.verdict
    },
    actionDelta: {
      beforeLabel: input.requestBefore.snapshot.nextActionLabel,
      afterLabel: input.postResult.nextAction.label,
      beforeType: beforeActionType,
      afterType: input.postResult.nextAction.type,
      changed:
        input.requestBefore.snapshot.nextActionLabel !== input.postResult.nextAction.label ||
        beforeActionType !== input.postResult.nextAction.type
    },
    confidenceDelta: Number(
      (input.postResult.trust.confidence - input.requestBefore.snapshot.confidence).toFixed(4)
    ),
    postDecisionRecordId: input.postDecisionRecordId,
    sourceCatalogMutation: {
      allowed: false,
      applied: false
    }
  };
}
