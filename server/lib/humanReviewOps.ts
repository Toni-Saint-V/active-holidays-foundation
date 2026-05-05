import type {
  Case,
  HumanReviewOpsAction,
  HumanReviewOpsCapabilities,
  HumanReviewOpsDetail,
  HumanReviewOpsOrphanQueueItem,
  HumanReviewOpsQueueItem,
  HumanReviewRequest,
  ResultPayload
} from "@shared/contracts";
import { allowedHumanReviewTransitions, isHumanReviewTerminalStatus } from "@shared/contracts";
import { extractHumanReviewBlockers } from "./humanReviewBlockers";

export const HUMAN_REVIEW_OPS_CAPABILITIES: HumanReviewOpsCapabilities = {
  terminalResolve: "transition_only",
  learningFeedback: "available"
};

function statusEventLabel(status: HumanReviewRequest["status"]): string {
  switch (status) {
    case "submitted":
      return "Запрос отправлен";
    case "in_queue":
      return "Запрос в очереди";
    case "in_review":
      return "Запрос в работе";
    case "resolved":
      return "Проверка закрыта";
    case "cancelled":
      return "Проверка отменена";
  }
}

function ageMinutes(createdAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000));
}

export function buildHumanReviewOpsQueueItem(input: {
  request: HumanReviewRequest;
  caseData: Case;
  currentResult: ResultPayload;
  now?: Date;
}): HumanReviewOpsQueueItem {
  const blockers = extractHumanReviewBlockers(input.currentResult);
  return {
    itemStatus: "ready",
    requestId: input.request.id,
    caseId: input.request.caseId,
    caseTitle: input.caseData.title,
    status: input.request.status,
    submittedAt: input.request.createdAt,
    updatedAt: input.request.updatedAt,
    channel: input.request.channel,
    contact: input.request.contact,
    snapshot: input.request.snapshot,
    currentVerdict: input.currentResult.verdict,
    currentNextActionLabel: input.currentResult.nextAction.label,
    currentEvidenceStatus: input.currentResult.trust.evidenceStatus,
    blockerCount: blockers.length,
    primaryBlockerLabel: blockers[0]?.label ?? null,
    ageMinutes: ageMinutes(input.request.createdAt, input.now ?? new Date())
  };
}

export function buildHumanReviewOpsOrphanQueueItem(input: {
  request: HumanReviewRequest;
  now?: Date;
}): HumanReviewOpsOrphanQueueItem {
  return {
    itemStatus: "orphaned_case",
    requestId: input.request.id,
    caseId: input.request.caseId,
    status: input.request.status,
    submittedAt: input.request.createdAt,
    updatedAt: input.request.updatedAt,
    channel: input.request.channel,
    contact: input.request.contact,
    snapshot: input.request.snapshot,
    ageMinutes: ageMinutes(input.request.createdAt, input.now ?? new Date()),
    recoveryLabel: "Связанный кейс не найден. Проверьте сохранённое состояние вручную."
  };
}

function operatorActions(request: HumanReviewRequest): HumanReviewOpsAction[] {
  if (isHumanReviewTerminalStatus(request.status)) return [];
  const actions: HumanReviewOpsAction[] = [];
  for (const transitionStatus of allowedHumanReviewTransitions[request.status]) {
    if (transitionStatus === "in_review") {
      actions.push({
        id: "move_in_review",
        label: "Взять в работу",
        transitionStatus,
        internalOnly: true
      });
    }
    if (transitionStatus === "resolved") {
      actions.push({
        id: "mark_resolved",
        label: "Закрыть проверку",
        transitionStatus,
        internalOnly: true
      });
    }
    if (transitionStatus === "cancelled") {
      actions.push({
        id: "cancel_review",
        label: "Отменить проверку",
        transitionStatus,
        internalOnly: true
      });
    }
  }
  return actions;
}

export function buildHumanReviewOpsDetail(input: {
  request: HumanReviewRequest;
  caseData: Case;
  currentResult: ResultPayload;
}): HumanReviewOpsDetail {
  const lastEvent = input.request.events.at(-1) ?? null;
  return {
    request: input.request,
    caseSummary: {
      id: input.caseData.id,
      title: input.caseData.title,
      productType: input.caseData.productType,
      updatedAt: input.caseData.updatedAt
    },
    currentResult: input.currentResult,
    blockingReasons: extractHumanReviewBlockers(input.currentResult),
    auditTrail: input.request.events.map((event) => ({
      id: event.id,
      at: event.at,
      label: statusEventLabel(event.status),
      actor: event.changedBy,
      note: event.note
    })),
    resolution: isHumanReviewTerminalStatus(input.request.status) && input.request.closedAt
      ? {
          status: input.request.status,
          closedAt: input.request.closedAt,
          note: input.request.resolution?.summary ?? lastEvent?.note ?? null,
          mode: "transition_only",
          recompute: null
        }
      : null,
    learning: {
      source: "learning_api",
      summary: "Learning feedback is captured after terminal operator resolution."
    },
    operatorNextActions: operatorActions(input.request)
  };
}
