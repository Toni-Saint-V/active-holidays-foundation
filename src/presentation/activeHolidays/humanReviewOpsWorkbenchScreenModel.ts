import type {
  HumanReviewOpsDetailResponse,
  HumanReviewOpsQueueItem,
  HumanReviewOpsQueueResponse
} from "@shared/contracts";
import { HUMAN_REVIEW_STATUS_LABELS } from "./screenModelUtils";

type WorkbenchMode = "empty" | "queue" | "active_detail" | "terminal_detail";

type WorkbenchAction = {
  id: string;
  label: string;
  transitionStatus: "in_review" | "resolved" | "cancelled";
  internalOnly: true;
};

export type HumanReviewOpsWorkbenchScreenModel = {
  mode: WorkbenchMode;
  header: {
    eyebrow: string;
    heading: string;
    description: string;
  };
  capabilityNotes: string[];
  emptyState: {
    title: string;
    description: string;
  } | null;
  queue: {
    countLabel: string;
    items: Array<{
      id: string;
      caseTitle: string;
      statusLabel: string;
      blockerLabel: string;
      ageLabel: string;
      selected: boolean;
    }>;
  };
  detailPanel: {
    title: string;
    verdictLabel: string;
    nextActionLabel: string;
    contactLabel: string;
    message: string;
    blockers: Array<{
      id: string;
      label: string;
      detail: string;
      severity: "critical" | "high" | "medium" | "low";
    }>;
    auditTrail: Array<{
      id: string;
      label: string;
      note: string | null;
    }>;
    resolution: {
      summary: string;
      recomputeLabel: string;
    } | null;
    learningNote: string;
    primaryAction: WorkbenchAction | null;
    secondaryActions: WorkbenchAction[];
  } | null;
};

function queueCountLabel(count: number): string {
  if (count === 1) return "1 активный запрос";
  return `${count} активных запросов`;
}

function statusLabel(status: HumanReviewOpsQueueItem["status"]): string {
  if (status === "submitted") return "Новый";
  return HUMAN_REVIEW_STATUS_LABELS[status];
}

function ageLabel(ageMinutes: number): string {
  if (ageMinutes < 1) return "только что";
  if (ageMinutes < 60) return `${ageMinutes} мин`;
  return `${Math.floor(ageMinutes / 60)} ч`;
}

function capabilityNotes(queue: HumanReviewOpsQueueResponse): string[] {
  const notes: string[] = [];
  if (queue.capabilities.terminalResolve === "transition_only") {
    notes.push("Закрытие сейчас фиксирует только статус проверки.");
  }
  if (queue.capabilities.learningFeedback === "available") {
    notes.push("После закрытия система сохраняет learning feedback для операционной аналитики.");
  }
  return notes;
}

function actionView(action: HumanReviewOpsDetailResponse["detail"]["operatorNextActions"][number]) {
  return {
    id: action.id,
    label: action.label,
    transitionStatus: action.transitionStatus,
    internalOnly: action.internalOnly
  };
}

export function buildHumanReviewOpsWorkbenchScreenModel(input: {
  queue: HumanReviewOpsQueueResponse;
  detail: HumanReviewOpsDetailResponse | null;
}): HumanReviewOpsWorkbenchScreenModel {
  const selectedRequestId = input.detail?.detail.request.id ?? null;
  const terminal = input.detail?.detail.resolution ?? null;
  const mode: WorkbenchMode = input.detail
    ? terminal
      ? "terminal_detail"
      : "active_detail"
    : input.queue.queue.length === 0
      ? "empty"
      : "queue";

  const actions = terminal ? [] : input.detail?.detail.operatorNextActions.map(actionView) ?? [];
  const primaryAction = actions[0] ?? null;

  return {
    mode,
    header: {
      eyebrow: "Операции · ручная проверка",
      heading: "Очередь ручной проверки",
      description:
        "Оператор видит только проверяемые факты: причину блокировки, статус запроса, историю и разрешённые действия."
    },
    capabilityNotes: capabilityNotes(input.queue),
    emptyState:
      mode === "empty"
        ? {
            title: "Нет активных запросов",
            description: "Когда кейс уйдёт в ручную проверку, он появится в этой очереди."
          }
        : null,
    queue: {
      countLabel: queueCountLabel(input.queue.queue.length),
      items: input.queue.queue.map((item) =>
        item.itemStatus === "orphaned_case"
          ? {
              id: item.requestId,
              caseTitle: `Кейс ${item.caseId}`,
              statusLabel: statusLabel(item.status),
              blockerLabel: item.recoveryLabel,
              ageLabel: ageLabel(item.ageMinutes),
              selected: false
            }
          : {
              id: item.requestId,
              caseTitle: item.caseTitle,
              statusLabel: statusLabel(item.status),
              blockerLabel: item.primaryBlockerLabel ?? "Причина требует ручной проверки.",
              ageLabel: ageLabel(item.ageMinutes),
              selected: item.requestId === selectedRequestId
            }
      )
    },
    detailPanel: input.detail
      ? {
          title: input.detail.detail.caseSummary.title,
          verdictLabel: input.detail.detail.request.snapshot.summary,
          nextActionLabel: input.detail.detail.currentResult.nextAction.label,
          contactLabel: input.detail.detail.request.contact,
          message: input.detail.detail.request.message,
          blockers: input.detail.detail.blockingReasons.map((blocker) => ({
            id: blocker.id,
            label: blocker.label,
            detail: blocker.detail,
            severity: blocker.severity
          })),
          auditTrail: input.detail.detail.auditTrail.map((event) => ({
            id: event.id,
            label: event.label,
            note: event.note
          })),
          resolution: terminal
            ? {
                summary:
                  terminal.status === "resolved"
                    ? "Проверка закрыта оператором."
                    : "Проверка отменена оператором.",
                recomputeLabel:
                  terminal.recompute === null
                    ? "После закрытия автоматический пересчёт не запускается."
                    : "Пересчёт выполнен."
              }
            : null,
          learningNote: input.detail.detail.learning.summary,
          primaryAction,
          secondaryActions: actions.slice(1)
        }
      : null
  };
}
