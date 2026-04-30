import type {
  HumanReviewLearningEvent,
  HumanReviewLearningEvidenceGap,
  HumanReviewLearningRootCause,
  HumanReviewTrustCalibration,
  HumanReviewTrustCalibrationAction,
  HumanReviewTrustCalibrationTarget,
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

function missingSignalIds(result: ResultPayload): string[] {
  return result.decisionSignals
    .filter((signal) => !signal.present)
    .map((signal) => signal.id)
    .sort();
}

function calibrationTarget(input: {
  action: HumanReviewTrustCalibrationAction;
  blockers: HumanReviewOpsBlocker[];
  postResult: ResultPayload;
}): HumanReviewTrustCalibrationTarget {
  if (input.action === "fail_closed_until_evidence_refresh") {
    const evidenceGaps = input.blockers.filter(
      (blocker) => blocker.type === "evidence_gate"
    );
    const gapIds = evidenceGaps.map((blocker) => blocker.id).filter(Boolean);
    const ruleIds = evidenceGaps
      .map((blocker) => blocker.ruleId)
      .filter((ruleId): ruleId is string => !!ruleId)
      .sort();
    const trustBlocker = input.blockers.find((blocker) => blocker.type === "trust");
    if (gapIds.length === 0) {
      return {
        type: "trust_state",
        blockerId: trustBlocker?.id ?? `trust:${input.postResult.caseId}`,
        evidenceStatus: input.postResult.trust.evidenceStatus,
        freshnessStatus: input.postResult.trust.freshnessStatus
      };
    }
    return {
      type: "evidence_gap",
      gapIds: gapIds.length > 0 ? gapIds : [`trust:${input.postResult.caseId}`],
      ruleIds
    };
  }

  if (input.action === "fail_closed_until_signal_capture") {
    const signalIds = missingSignalIds(input.postResult);
    return {
      type: "signal",
      signalIds: signalIds.length > 0 ? signalIds : ["unknown_missing_signal"]
    };
  }

  if (input.action === "manual_policy_review_only") {
    const ruleIds = input.blockers
      .filter((blocker) => blocker.type === "human_review_trigger" && blocker.ruleId)
      .map((blocker) => blocker.ruleId as string)
      .sort();
    return {
      type: "policy_rule",
      ruleIds: ruleIds.length > 0 ? ruleIds : ["manual_policy"]
    };
  }

  return { type: "operator_note" };
}

function calibrationActionForRootCause(
  rootCause: HumanReviewLearningRootCause
): HumanReviewTrustCalibrationAction {
  switch (rootCause) {
    case "missing_evidence":
    case "stale_evidence":
    case "conflicting_evidence":
      return "fail_closed_until_evidence_refresh";
    case "missing_signal":
      return "fail_closed_until_signal_capture";
    case "policy_ambiguity":
      return "manual_policy_review_only";
    case "operator_override_only":
      return "informational_operator_note";
  }
}

function calibrationReason(input: {
  action: HumanReviewTrustCalibrationAction;
  rootCauseLabel: string;
  resolutionSummary: string;
  postResult: ResultPayload;
}): string {
  switch (input.action) {
    case "fail_closed_until_evidence_refresh":
      return [
        `${input.rootCauseLabel}: автоматический совет остаётся закрытым до обновления evidence.`,
        input.postResult.trust.blockingReason ?? input.postResult.trust.humanReviewReason,
        `Операторский итог: ${input.resolutionSummary}`
      ].filter(Boolean).join(" ");
    case "fail_closed_until_signal_capture":
      return [
        `${input.rootCauseLabel}: автоматический совет остаётся закрытым до сбора недостающих сигналов.`,
        `Операторский итог: ${input.resolutionSummary}`
      ].join(" ");
    case "manual_policy_review_only":
      return [
        `${input.rootCauseLabel}: правило остаётся только для ручной интерпретации.`,
        `Операторский итог: ${input.resolutionSummary}`
      ].join(" ");
    case "informational_operator_note":
      return `Операторский итог сохранён как аналитика без автоматического изменения доверия: ${input.resolutionSummary}`;
  }
}

function buildTrustCalibration(input: {
  eventId: string;
  request: HumanReviewRequest;
  rootCause: HumanReviewLearningRootCause;
  rootCauseLabel: string;
  resolutionSummary: string;
  postResult: ResultPayload;
  blockers: HumanReviewOpsBlocker[];
  confidenceDelta: number;
  createdAt: string;
}): HumanReviewTrustCalibration {
  const action = calibrationActionForRootCause(input.rootCause);
  const applyToFutureAutomation = action !== "informational_operator_note";
  return {
    version: "human-review-trust-calibration.v1",
    calibrationId: `hrc_${input.request.id}_${input.createdAt}`,
    eventId: input.eventId,
    requestId: input.request.id,
    caseId: input.request.caseId,
    rootCause: input.rootCause,
    action,
    status: applyToFutureAutomation ? "active" : "informational",
    evidenceStatus: input.postResult.trust.evidenceStatus,
    freshnessStatus: input.postResult.trust.freshnessStatus,
    target: calibrationTarget({
      action,
      blockers: input.blockers,
      postResult: input.postResult
    }),
    confidenceDelta: input.confidenceDelta,
    applyToFutureAutomation,
    reason: calibrationReason({
      action,
      rootCauseLabel: input.rootCauseLabel,
      resolutionSummary: input.resolutionSummary,
      postResult: input.postResult
    }),
    createdAt: input.createdAt,
    sourceCatalogMutation: {
      allowed: false,
      applied: false
    }
  };
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
  const rootCauseLabel = rootCauseLabels[rootCause];
  const beforeActionType =
    input.requestBefore.snapshot.verdict === "HUMAN_REVIEW"
      ? "send_for_review"
      : input.postResult.nextAction.type;
  const confidenceDelta = Number(
    (input.postResult.trust.confidence - input.requestBefore.snapshot.confidence).toFixed(4)
  );
  const eventId = humanReviewLearningEventId(input.requestAfter);

  return {
    version: "human-review-learning.v1",
    ingestedVia: "terminal_resolution",
    ingestReason: "Captured automatically when operator resolved human review.",
    ingestedAt: input.now?.toISOString() ?? resolvedAt,
    eventId,
    requestId: input.requestAfter.id,
    caseId: input.requestAfter.caseId,
    capturedAt: input.now?.toISOString() ?? resolvedAt,
    resolvedAt,
    resolutionSummary,
    rootCause,
    rootCauseLabel,
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
    confidenceDelta,
    postDecisionRecordId: input.postDecisionRecordId,
    trustCalibration: buildTrustCalibration({
      eventId,
      request: input.requestAfter,
      rootCause,
      rootCauseLabel,
      resolutionSummary,
      postResult: input.postResult,
      blockers: input.blockers,
      confidenceDelta,
      createdAt: input.now?.toISOString() ?? resolvedAt
    }),
    sourceCatalogMutation: {
      allowed: false,
      applied: false
    }
  };
}
