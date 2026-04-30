import {
  humanReviewLearningRootCauseSchema,
  type HumanReviewLearningEvent,
  type HumanReviewLearningRootCause,
  type HumanReviewLearningSummaryResponse,
  type HumanReviewLearningTopBlocker,
  type HumanReviewTrustCalibration,
  type HumanReviewTrustCalibrationAction
} from "@shared/contracts";

export class HumanReviewLearningConflictError extends Error {
  constructor(key: string) {
    super(`Human review learning event ${key} already exists with a different payload.`);
    this.name = "HumanReviewLearningConflictError";
  }
}

export type HumanReviewLearningStoreOptions = {
  events?: HumanReviewLearningEvent[];
  persistEvents?: (events: HumanReviewLearningEvent[]) => void;
};

type StableJsonValue =
  | null
  | string
  | number
  | boolean
  | StableJsonValue[]
  | { [key: string]: StableJsonValue };

function stableStringify(value: StableJsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key] ?? null)}`)
    .join(",")}}`;
}

function eventFingerprint(event: HumanReviewLearningEvent): string {
  return stableStringify(event as unknown as StableJsonValue);
}

function naturalKey(event: HumanReviewLearningEvent): string {
  return `${event.requestId}|${event.resolvedAt}`;
}

function expectedEventId(event: HumanReviewLearningEvent): string {
  return `hrl_${event.requestId}_${event.resolvedAt}`;
}

function emptyRootCauseCounts(): Record<HumanReviewLearningRootCause, number> {
  return Object.fromEntries(
    humanReviewLearningRootCauseSchema.options.map((rootCause) => [rootCause, 0])
  ) as Record<HumanReviewLearningRootCause, number>;
}

function emptyCalibrationActionCounts(): Record<HumanReviewTrustCalibrationAction, number> {
  return {
    fail_closed_until_evidence_refresh: 0,
    fail_closed_until_signal_capture: 0,
    manual_policy_review_only: 0,
    informational_operator_note: 0
  };
}

const severityRank: Record<HumanReviewLearningTopBlocker["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

function dominantRootCause(
  counts: Record<HumanReviewLearningRootCause, number>
): HumanReviewLearningRootCause {
  return humanReviewLearningRootCauseSchema.options
    .slice()
    .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))[0] ?? "missing_evidence";
}

export class HumanReviewLearningStore {
  private readonly events: HumanReviewLearningEvent[] = [];
  private readonly byEventId = new Map<string, HumanReviewLearningEvent>();
  private readonly fingerprintsByEventId = new Map<string, string>();
  private readonly eventIdByNaturalKey = new Map<string, string>();
  private readonly persistEvents?: (events: HumanReviewLearningEvent[]) => void;

  constructor(options: HumanReviewLearningStoreOptions = {}) {
    this.persistEvents = options.persistEvents;
    for (const event of options.events ?? []) {
      this.append(event);
    }
  }

  ingest(event: HumanReviewLearningEvent): {
    event: HumanReviewLearningEvent;
    inserted: boolean;
  } {
    if (event.eventId !== expectedEventId(event)) {
      throw new HumanReviewLearningConflictError(event.eventId);
    }
    const existing = this.byEventId.get(event.eventId);
    if (existing) {
      const existingFingerprint = this.fingerprintsByEventId.get(event.eventId);
      if (existingFingerprint !== eventFingerprint(event)) {
        throw new HumanReviewLearningConflictError(event.eventId);
      }
      return { event: structuredClone(existing), inserted: false };
    }
    if (this.eventIdByNaturalKey.has(naturalKey(event))) {
      throw new HumanReviewLearningConflictError(naturalKey(event));
    }

    this.persistSnapshot([...this.events, structuredClone(event)]);
    this.append(event);
    return { event: structuredClone(event), inserted: true };
  }

  list(): HumanReviewLearningEvent[] {
    return this.events
      .slice()
      .sort(
        (a, b) =>
          a.capturedAt.localeCompare(b.capturedAt) || a.eventId.localeCompare(b.eventId)
      )
      .map((event) => structuredClone(event));
  }

  calibrations(): HumanReviewTrustCalibration[] {
    return this.list()
      .map((event) => event.trustCalibration)
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) ||
          a.calibrationId.localeCompare(b.calibrationId)
      )
      .map((calibration) => structuredClone(calibration));
  }

  page(input: { limit: number; offset: number }): {
    totalEvents: number;
    events: HumanReviewLearningEvent[];
  } {
    const events = this.list();
    return {
      totalEvents: events.length,
      events: events.slice(input.offset, input.offset + input.limit)
    };
  }

  get(eventId: string): HumanReviewLearningEvent | null {
    const event = this.byEventId.get(eventId);
    return event ? structuredClone(event) : null;
  }

  summary(now = new Date()): HumanReviewLearningSummaryResponse {
    const rootCauseCounts = emptyRootCauseCounts();
    const calibrationActionCounts = emptyCalibrationActionCounts();
    let verdictChanged = 0;
    let actionChanged = 0;

    for (const event of this.events) {
      rootCauseCounts[event.rootCause] += 1;
      calibrationActionCounts[event.trustCalibration.action] += 1;
      if (event.verdictDelta.changed) verdictChanged += 1;
      if (event.actionDelta.changed) actionChanged += 1;
    }

    return {
      generatedAt: now.toISOString(),
      totalEvents: this.events.length,
      rootCauseCounts,
      verdictDeltaCounts: {
        changed: verdictChanged,
        unchanged: this.events.length - verdictChanged
      },
      actionDeltaCounts: {
        changed: actionChanged,
        unchanged: this.events.length - actionChanged
      },
      calibrationActionCounts,
      sourceCatalogMutationsApplied: 0
    };
  }

  topBlockers(limit = 10, now = new Date()): {
    generatedAt: string;
    blockers: HumanReviewLearningTopBlocker[];
  } {
    const blockers = new Map<string, HumanReviewLearningTopBlocker>();

    for (const event of this.events) {
      for (const gap of event.evidenceGaps) {
        const existing = blockers.get(gap.id);
        if (!existing) {
          blockers.set(gap.id, {
            id: gap.id,
            label: gap.label,
            rootCause: event.rootCause,
            dominantRootCause: event.rootCause,
            rootCauseCounts: {
              ...emptyRootCauseCounts(),
              [event.rootCause]: 1
            },
            count: 1,
            severity: gap.severity,
            lastSeenAt: event.capturedAt
          });
          continue;
        }

        existing.count += 1;
        existing.rootCauseCounts[event.rootCause] += 1;
        existing.dominantRootCause = dominantRootCause(existing.rootCauseCounts);
        existing.rootCause = existing.dominantRootCause;
        if (severityRank[gap.severity] > severityRank[existing.severity]) {
          existing.severity = gap.severity;
        }
        if (event.capturedAt > existing.lastSeenAt) {
          existing.lastSeenAt = event.capturedAt;
          existing.label = gap.label;
        }
      }
    }

    return {
      generatedAt: now.toISOString(),
      blockers: Array.from(blockers.values())
        .sort(
          (a, b) =>
            b.count - a.count ||
            severityRank[b.severity] - severityRank[a.severity] ||
            b.lastSeenAt.localeCompare(a.lastSeenAt) ||
            a.id.localeCompare(b.id)
        )
        .slice(0, limit)
        .map((blocker) => structuredClone(blocker))
    };
  }

  private append(event: HumanReviewLearningEvent): void {
    if (this.byEventId.has(event.eventId)) {
      throw new HumanReviewLearningConflictError(event.eventId);
    }
    const cloned = structuredClone(event);
    this.events.push(cloned);
    this.byEventId.set(cloned.eventId, cloned);
    this.fingerprintsByEventId.set(cloned.eventId, eventFingerprint(cloned));
    this.eventIdByNaturalKey.set(naturalKey(cloned), cloned.eventId);
  }

  private persistSnapshot(events: HumanReviewLearningEvent[]): void {
    if (!this.persistEvents) return;
    this.persistEvents(events.map((event) => structuredClone(event)));
  }
}

let singleton: HumanReviewLearningStore | null = null;

export function initializeHumanReviewLearningStore(
  options: HumanReviewLearningStoreOptions = {}
): HumanReviewLearningStore {
  singleton = new HumanReviewLearningStore(options);
  return singleton;
}

export function getHumanReviewLearningStore(): HumanReviewLearningStore {
  if (!singleton) throw new Error("HumanReviewLearningStore ещё не инициализирован.");
  return singleton;
}
