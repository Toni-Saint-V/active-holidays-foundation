import {
  humanReviewLearningRootCauseSchema,
  type HumanReviewLearningBlockerSeverity,
  type HumanReviewLearningEvent,
  type HumanReviewLearningRootCause,
  type HumanReviewTrustCalibrationAction,
  type HumanReviewTrustCalibrationRecommendation,
  type HumanReviewTrustCalibrationResponse
} from "@shared/contracts";

type CalibrationGroup = {
  id: string;
  label: string;
  rootCauseCounts: Record<HumanReviewLearningRootCause, number>;
  severity: HumanReviewLearningBlockerSeverity;
  lastSeenAt: string;
  eventsById: Map<string, HumanReviewLearningEvent>;
};

const severityRank: Record<HumanReviewLearningBlockerSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const rootCauseLabels: Record<HumanReviewLearningRootCause, string> = {
  missing_evidence: "не хватает доказательной базы",
  stale_evidence: "источники устарели",
  conflicting_evidence: "источники конфликтуют",
  missing_signal: "не хватает входного сигнала",
  policy_ambiguity: "правило требует ручной интерпретации",
  operator_override_only: "решение держится только на операторском переопределении"
};

const actionByRootCause: Record<HumanReviewLearningRootCause, {
  action: HumanReviewTrustCalibrationAction;
  label: string;
}> = {
  missing_evidence: {
    action: "fail_closed_until_evidence_refresh",
    label: "Оставить закрытым до пополнения доказательной базы"
  },
  stale_evidence: {
    action: "fail_closed_until_evidence_refresh",
    label: "Оставить закрытым до обновления источников"
  },
  conflicting_evidence: {
    action: "fail_closed_until_evidence_refresh",
    label: "Оставить закрытым до разбора конфликта источников"
  },
  missing_signal: {
    action: "fail_closed_until_signal_capture",
    label: "Оставить закрытым до сбора недостающего сигнала"
  },
  policy_ambiguity: {
    action: "manual_policy_review_only",
    label: "Оставить правило только для ручной интерпретации"
  },
  operator_override_only: {
    action: "informational_operator_note",
    label: "Сохранить как операционную заметку"
  }
};

function emptyRootCauseCounts(): Record<HumanReviewLearningRootCause, number> {
  return Object.fromEntries(
    humanReviewLearningRootCauseSchema.options.map((rootCause) => [rootCause, 0])
  ) as Record<HumanReviewLearningRootCause, number>;
}

function dominantRootCause(
  counts: Record<HumanReviewLearningRootCause, number>
): HumanReviewLearningRootCause {
  return humanReviewLearningRootCauseSchema.options
    .slice()
    .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))[0] ?? "missing_evidence";
}

function closureLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} повторное закрытие`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} повторных закрытия`;
  }
  return `${count} повторных закрытий`;
}

function upsertGroup(
  groups: Map<string, CalibrationGroup>,
  input: {
    id: string;
    label: string;
    severity: HumanReviewLearningBlockerSeverity;
    event: HumanReviewLearningEvent;
  }
): void {
  const existing = groups.get(input.id);
  if (!existing) {
    const group: CalibrationGroup = {
      id: input.id,
      label: input.label,
      rootCauseCounts: {
        ...emptyRootCauseCounts(),
        [input.event.rootCause]: 1
      },
      severity: input.severity,
      lastSeenAt: input.event.capturedAt,
      eventsById: new Map([[input.event.eventId, input.event]])
    };
    groups.set(input.id, group);
    return;
  }

  if (existing.eventsById.has(input.event.eventId)) return;
  existing.eventsById.set(input.event.eventId, input.event);
  existing.rootCauseCounts[input.event.rootCause] += 1;
  if (severityRank[input.severity] > severityRank[existing.severity]) {
    existing.severity = input.severity;
  }
  if (input.event.capturedAt > existing.lastSeenAt) {
    existing.lastSeenAt = input.event.capturedAt;
    existing.label = input.label;
  }
}

function collectGroups(events: HumanReviewLearningEvent[]): Map<string, CalibrationGroup> {
  const groups = new Map<string, CalibrationGroup>();

  for (const event of events) {
    if (event.evidenceGaps.length > 0) {
      for (const gap of event.evidenceGaps) {
        upsertGroup(groups, {
          id: gap.id,
          label: gap.label,
          severity: gap.severity,
          event
        });
      }
      continue;
    }

    if (event.fixedSignals.length > 0) {
      for (const signalId of event.fixedSignals) {
        upsertGroup(groups, {
          id: `SIGNAL:${signalId}`,
          label: `Не хватает сигнала ${signalId}`,
          severity: "medium",
          event
        });
      }
      continue;
    }

    upsertGroup(groups, {
      id: `ROOT_CAUSE:${event.rootCause}`,
      label: event.rootCauseLabel,
      severity: "low",
      event
    });
  }

  return groups;
}

function toRecommendation(group: CalibrationGroup): HumanReviewTrustCalibrationRecommendation {
  const events = Array.from(group.eventsById.values()).sort((a, b) =>
    a.eventId.localeCompare(b.eventId)
  );
  const rootCause = dominantRootCause(group.rootCauseCounts);
  const confidenceAverage =
    events.reduce((sum, event) => sum + event.confidenceDelta, 0) / events.length;
  const action = actionByRootCause[rootCause];

  return {
    id: `cal_${group.id}`,
    blockerId: group.id,
    label: group.label,
    rootCause,
    rootCauseCounts: group.rootCauseCounts,
    occurrences: events.length,
    severity: group.severity,
    lastSeenAt: group.lastSeenAt,
    confidenceImpact: {
      averageDelta: Number(confidenceAverage.toFixed(4)),
      negativeEvents: events.filter((event) => event.confidenceDelta < 0).length
    },
    action: action.action,
    actionLabel: action.label,
    rationale: `${closureLabel(events.length)} ручной проверки: ${rootCauseLabels[rootCause]}. Рекомендация только для операционного разбора, без автоматической правки каталогов.`,
    sourceEventIds: events.map((event) => event.eventId),
    safety: {
      mode: "proposal_only",
      sourceCatalogMutation: {
        allowed: false,
        applied: false
      }
    }
  };
}

export function buildHumanReviewTrustCalibration(input: {
  events: HumanReviewLearningEvent[];
  minOccurrences?: number;
  limit?: number;
  now?: Date;
}): HumanReviewTrustCalibrationResponse {
  const minOccurrences = input.minOccurrences ?? 2;
  const limit = input.limit ?? 10;
  const recommendations = Array.from(collectGroups(input.events).values())
    .filter((group) => group.eventsById.size >= minOccurrences)
    .map(toRecommendation)
    .sort(
      (a, b) =>
        severityRank[b.severity] - severityRank[a.severity] ||
        b.occurrences - a.occurrences ||
        b.lastSeenAt.localeCompare(a.lastSeenAt) ||
        a.id.localeCompare(b.id)
    )
    .slice(0, limit);

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    totalEvents: input.events.length,
    minOccurrences,
    recommendations,
    emptyState:
      recommendations.length === 0
        ? {
            title: "Недостаточно повторов для калибровки",
            detail:
              "События обучения сохранены, но пока нет повторяющихся блокеров выше выбранного порога."
          }
        : null
  };
}
