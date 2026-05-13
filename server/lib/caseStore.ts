import type {
  Case,
  CaseOverride,
  CaseSignals,
  DecisionKind,
  DecisionLedgerEntry,
  DecisionLogEntry,
  DecisionRecord,
  PathPreference,
  ReplayableSnapshot,
  ResultPayload,
  Verdict,
  HumanReviewActor,
  HumanReviewCreateRequest,
  HumanReviewHandoff,
  HumanReviewResolution,
  HumanReviewRequest,
  HumanReviewSnapshot,
  HumanReviewStatus,
  DocumentAsset,
  DocumentCheckRun
} from "@shared/contracts";
import {
  decisionLedgerEntrySchema,
  decisionRecordToLogEntry,
  activeHumanReviewStatuses,
  allowedHumanReviewTransitions,
  isHumanReviewTerminalStatus,
  isDecisionRecord,
  signalIdSchema,
  signalValueSchema
} from "@shared/contracts";
import {
  ENGINE_REVISION,
  ENGINE_VERSION,
  fingerprintCase,
  fingerprintCatalogs,
  fingerprintResult,
  type OrchestratorCatalogs
} from "@shared/domain/engine";
import type { Catalogs } from "./catalogs";

export type SnapshotDecisionRecordInput = {
  case: Case;
  catalogs: OrchestratorCatalogs;
  result: ResultPayload;
  summary: string;
  kind: DecisionKind;
  changedSignalIds: string[];
  changedPreferenceIds?: string[];
  now?: Date;
};

export type CreateOrReuseHumanReviewInput = {
  caseId: string;
  request: HumanReviewCreateRequest;
  snapshot: HumanReviewSnapshot;
  handoff?: HumanReviewHandoff | null;
  now?: Date;
};

export type TransitionHumanReviewInput = {
  requestId: string;
  status: HumanReviewStatus;
  changedBy: HumanReviewActor;
  note?: string | null;
  resolution?: {
    summary: HumanReviewResolution["summary"];
    postDecisionRecordId?: HumanReviewResolution["postDecisionRecordId"];
  } | null;
  now?: Date;
};

export type AttachHumanReviewDecisionRecordInput = {
  requestId: string;
  postDecisionRecordId: string;
};

export type CaseStoreOptions = {
  humanReviews?: HumanReviewRequest[];
  persistHumanReviews?: (requests: HumanReviewRequest[]) => void;
};

export type StoredDocumentIntakeEntry = {
  caseId: string;
  asset: DocumentAsset;
  run: DocumentCheckRun;
  uploadStatus: "accepted" | "rejected";
};

export class HumanReviewHandoffConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HumanReviewHandoffConflictError";
  }
}

function migrateLegacyEntry(entry: DecisionLogEntry): DecisionRecord {
  const placeholder = `legacy:${entry.id}`;
  return {
    decisionId: entry.id,
    caseId: entry.caseId,
    engineVersion: "legacy",
    engineRevision: "legacy",
    computedAt: entry.recordedAt,
    recordedAt: entry.recordedAt,
    inputFingerprint: placeholder,
    catalogFingerprint: placeholder,
    resultFingerprint: placeholder,
    replayableSnapshot: null,
    result: null,
    auditTrail: null,
    verdict: entry.verdict,
    confidence: entry.confidence,
    summary: entry.summary,
    kind: entry.kind,
    changedSignalIds: entry.changedSignalIds,
    changedPreferenceIds: []
  };
}

export class CaseStore {
  private readonly cases = new Map<string, Case>();
  private readonly records: DecisionRecord[] = [];
  private readonly byDecisionId = new Map<string, DecisionRecord>();
  private readonly byCaseId = new Map<string, DecisionRecord[]>();
  private readonly latestByCaseId = new Map<string, DecisionRecord>();
  private readonly humanReviews: HumanReviewRequest[] = [];
  private readonly humanReviewById = new Map<string, HumanReviewRequest>();
  private readonly humanReviewByCaseId = new Map<string, HumanReviewRequest[]>();
  private readonly documentEntriesByCaseId = new Map<string, StoredDocumentIntakeEntry[]>();
  private readonly persistHumanReviews?: (requests: HumanReviewRequest[]) => void;
  private counter = 0;

  constructor(initial: Catalogs, options: CaseStoreOptions = {}) {
    this.persistHumanReviews = options.persistHumanReviews;
    for (const entry of initial.cases) {
      const cloned = structuredClone(entry);
      this.cases.set(entry.id, cloned);
      this.observeGeneratedSequence(entry.id);
    }
    for (const raw of initial.decisionsLog) {
      const parsed = decisionLedgerEntrySchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(
          `[caseStore] Пропускаем запись журнала решений из-за несовместимости: ${parsed.error.message}`
        );
        continue;
      }
      const record = this.toRecord(parsed.data);
      this.appendRecord(record);
    }
    for (const request of options.humanReviews ?? []) {
      this.appendHumanReview(structuredClone(request));
    }
  }

  list(): Case[] {
    return Array.from(this.cases.values())
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id: string): Case | null {
    return this.cases.get(id) ?? null;
  }

  upsert(caseData: Case): Case {
    this.cases.set(caseData.id, structuredClone(caseData));
    return structuredClone(caseData);
  }

  patchSignals(id: string, patches: CaseSignals, now = new Date()): Case | null {
    const existing = this.cases.get(id);
    if (!existing) return null;
    const map = new Map(existing.signals.map((signal) => [signal.id, signal]));
    for (const patch of patches) map.set(patch.id, patch);
    const next: Case = {
      ...existing,
      signals: Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id)),
      updatedAt: now.toISOString()
    };
    this.cases.set(id, next);
    return structuredClone(next);
  }

  overrideSignal(
    id: string,
    override: CaseOverride,
    now = new Date()
  ): Case | null {
    const existing = this.cases.get(id);
    if (!existing) return null;
    const parsedSignalId = signalIdSchema.safeParse(override.signalId);
    if (!parsedSignalId.success) return null;
    const parsedSignalValue = signalValueSchema.safeParse({
      id: parsedSignalId.data,
      value: override.value
    });
    if (!parsedSignalValue.success) return null;
    const overrides = existing.overrides.filter(
      (item) => item.signalId !== override.signalId
    );
    overrides.push(override);
    const signals = existing.signals.slice();
    const nextSignal = {
      id: parsedSignalId.data,
      value: parsedSignalValue.data.value,
      source: "override" as const,
      capturedAt: override.appliedAt
    };
    const existingIndex = signals.findIndex(
      (signal) => signal.id === parsedSignalId.data
    );
    if (existingIndex === -1) signals.push(nextSignal);
    else signals[existingIndex] = nextSignal;
    signals.sort((a, b) => a.id.localeCompare(b.id));
    const next: Case = {
      ...existing,
      signals,
      overrides,
      updatedAt: now.toISOString()
    };
    this.cases.set(id, next);
    return structuredClone(next);
  }

  setPreferences(
    id: string,
    preferences: PathPreference[],
    now = new Date()
  ): Case | null {
    const existing = this.cases.get(id);
    if (!existing) return null;
    const next: Case = {
      ...existing,
      preferences,
      updatedAt: now.toISOString()
    };
    this.cases.set(id, next);
    return structuredClone(next);
  }

  fork(id: string, options: { title?: string; now?: Date } = {}): Case | null {
    const existing = this.cases.get(id);
    if (!existing) return null;
    this.counter += 1;
    const now = options.now ?? new Date();
    const forked: Case = {
      ...structuredClone(existing),
      id: `${id}-fork-${this.counter}`,
      title: options.title ?? `Форк: ${existing.title}`,
      forkedFrom: id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    this.cases.set(forked.id, forked);
    return structuredClone(forked);
  }

  // Snapshot a full DecisionRecord for the given case + catalogs + result.
  // Returns the existing record when input/catalog/result fingerprints match
  // the latest record for this case under the same engine version/revision.
  snapshotDecisionRecord(input: SnapshotDecisionRecordInput): DecisionRecord {
    const now = input.now ?? new Date();
    const inputFingerprint = fingerprintCase(input.case);
    const catalogFingerprint = fingerprintCatalogs(input.catalogs);
    const resultFingerprint = fingerprintResult(input.result);

    const latest = this.latestByCaseId.get(input.case.id);
    if (
      latest &&
      latest.engineVersion === ENGINE_VERSION &&
      latest.engineRevision === ENGINE_REVISION &&
      latest.inputFingerprint === inputFingerprint &&
      latest.catalogFingerprint === catalogFingerprint &&
      latest.resultFingerprint === resultFingerprint
    ) {
      return structuredClone(latest);
    }

    this.counter += 1;
    // snapshot.now must equal the clock the engine used for `input.result`,
    // otherwise replay will produce a different computedAt and the result
    // fingerprints will not match. recordedAt tracks ledger insertion time
    // separately (wall-clock is fine for that).
    const snapshot: ReplayableSnapshot = structuredClone({
      case: input.case,
      catalogs: input.catalogs,
      now: input.result.computedAt,
      evidenceContractCaptured: true
    });

    const record: DecisionRecord = {
      decisionId: `dec_${input.case.id}_${this.counter}`,
      caseId: input.case.id,
      engineVersion: ENGINE_VERSION,
      engineRevision: ENGINE_REVISION,
      computedAt: input.result.computedAt,
      recordedAt: now.toISOString(),
      inputFingerprint,
      catalogFingerprint,
      resultFingerprint,
      replayableSnapshot: snapshot,
      result: structuredClone(input.result),
      auditTrail: structuredClone(input.result.auditTrail),
      verdict: input.result.verdict,
      confidence: Math.round(input.result.trust.confidence * 100) / 100,
      summary: input.summary,
      kind: input.kind,
      changedSignalIds: input.changedSignalIds.slice(),
      changedPreferenceIds: input.changedPreferenceIds?.slice() ?? []
    };

    this.appendRecord(record);
    return structuredClone(record);
  }

  // Test-only helper: push a hand-crafted record into the ledger without
  // running the engine. Used by drift tests to simulate a stale stored
  // result whose replay would differ from current engine output.
  insertRecordForTest(record: DecisionRecord): void {
    this.appendRecord(structuredClone(record));
  }

  decisionsFor(caseId: string): DecisionLogEntry[] {
    const records = this.byCaseId.get(caseId) ?? [];
    return records
      .slice()
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .map(decisionRecordToLogEntry);
  }

  allDecisions(): DecisionLogEntry[] {
    return this.records
      .slice()
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .map(decisionRecordToLogEntry);
  }

  allRecords(): DecisionRecord[] {
    return this.records
      .slice()
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .map((record) => structuredClone(record));
  }

  recordsFor(caseId: string): DecisionRecord[] {
    const records = this.byCaseId.get(caseId) ?? [];
    return records
      .slice()
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .map((record) => structuredClone(record));
  }

  getRecord(decisionId: string): DecisionRecord | null {
    const found = this.byDecisionId.get(decisionId);
    return found ? structuredClone(found) : null;
  }

  latestRecordFor(caseId: string): DecisionRecord | null {
    const found = this.latestByCaseId.get(caseId);
    return found ? structuredClone(found) : null;
  }

  latestHumanReviewFor(caseId: string): HumanReviewRequest | null {
    const bucket = this.humanReviewByCaseId.get(caseId) ?? [];
    const latest = bucket
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return latest ? structuredClone(latest) : null;
  }

  humanReviewForDecisionRecord(
    caseId: string,
    decisionRecordId: string
  ): HumanReviewRequest | null {
    const bucket = this.humanReviewByCaseId.get(caseId) ?? [];
    const request = bucket
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .find((entry) => entry.resolution?.postDecisionRecordId === decisionRecordId);
    return request ? structuredClone(request) : null;
  }

  activeHumanReviewFor(caseId: string): HumanReviewRequest | null {
    const bucket = this.humanReviewByCaseId.get(caseId) ?? [];
    const active = bucket
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .find((entry) => activeHumanReviewStatuses.some((status) => status === entry.status));
    return active ? structuredClone(active) : null;
  }

  activeHumanReviewQueue(): HumanReviewRequest[] {
    return this.humanReviews
      .filter((entry) => activeHumanReviewStatuses.some((status) => status === entry.status))
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((request) => structuredClone(request));
  }

  getHumanReviewById(requestId: string): HumanReviewRequest | null {
    const request = this.humanReviewById.get(requestId);
    return request ? structuredClone(request) : null;
  }

  createOrReuseHumanReview(
    input: CreateOrReuseHumanReviewInput
  ): { request: HumanReviewRequest; reused: boolean } {
    const existing = this.activeHumanReviewFor(input.caseId);
    if (existing) {
      if (
        existing.handoff &&
        input.handoff &&
        existing.handoff.scenarioId !== input.handoff.scenarioId
      ) {
        throw new HumanReviewHandoffConflictError(
          `Active HumanReviewRequest ${existing.id} already tracks scenario ${existing.handoff.scenarioId}.`
        );
      }
      if (!existing.handoff && input.handoff) {
        const now = (input.now ?? new Date()).toISOString();
        const enriched: HumanReviewRequest = {
          ...existing,
          handoff: structuredClone(input.handoff),
          updatedAt: now,
          events: [
            ...existing.events,
            {
              id: `${existing.id}_handoff`,
              at: now,
              type: "handoff_created",
              status: existing.status,
              changedBy: "system",
              note: input.handoff.humanReviewReason
            }
          ]
        };
        this.persistHumanReviewSnapshot(
          this.humanReviews.map((request) =>
            request.id === enriched.id
              ? structuredClone(enriched)
              : structuredClone(request)
          )
        );
        this.replaceHumanReview(enriched);
        return { request: structuredClone(enriched), reused: true };
      }
      return { request: existing, reused: true };
    }

    this.counter += 1;
    const now = (input.now ?? new Date()).toISOString();
    const requestId = `hr_${input.caseId}_${this.counter}`;
    const event = {
      id: `${requestId}_submitted`,
      at: now,
      type: "submitted" as const,
      status: "submitted" as const,
      changedBy: "traveler" as const,
      note: null
    };
    const request: HumanReviewRequest = {
      id: requestId,
      caseId: input.caseId,
      status: "submitted",
      channel: input.request.channel,
      contact: input.request.contact,
      message: input.request.message,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      durability: "persisted",
      snapshot: structuredClone(input.snapshot),
      handoff: input.handoff ? structuredClone(input.handoff) : null,
      resolution: null,
      events: input.handoff
        ? [
            event,
            {
              id: `${requestId}_handoff`,
              at: now,
              type: "handoff_created" as const,
              status: "submitted" as const,
              changedBy: "system" as const,
              note: input.handoff.humanReviewReason
            }
          ]
        : [event]
    };
    this.persistHumanReviewSnapshot([...this.humanReviews, structuredClone(request)]);
    this.appendHumanReview(request);
    return { request: structuredClone(request), reused: false };
  }

  transitionHumanReview(input: TransitionHumanReviewInput): HumanReviewRequest {
    const existing = this.humanReviewById.get(input.requestId);
    if (!existing) {
      throw new Error(`HumanReviewRequest ${input.requestId} не найден.`);
    }
    if (isHumanReviewTerminalStatus(existing.status)) {
      throw new Error(`HumanReviewRequest ${input.requestId} уже закрыт и не может меняться.`);
    }
    if (input.status === "resolved" && !input.resolution && !existing.resolution) {
      throw new Error(
        `HumanReviewRequest ${input.requestId} требует resolution payload перед закрытием.`
      );
    }
    if (input.status !== "resolved" && input.resolution) {
      throw new Error(
        `Resolution payload допустим только для resolved HumanReviewRequest ${input.requestId}.`
      );
    }
    if (existing.status === input.status) {
      return structuredClone(existing);
    }
    if (!allowedHumanReviewTransitions[existing.status].some((status) => status === input.status)) {
      throw new Error(
        `Переход ${existing.status} -> ${input.status} для HumanReviewRequest ${input.requestId} запрещён.`
      );
    }

    const now = (input.now ?? new Date()).toISOString();
    const resolution =
      input.status === "resolved" && input.resolution
        ? {
            summary: input.resolution.summary,
            resolvedAt: now,
            changedBy: input.changedBy,
            postDecisionRecordId: input.resolution.postDecisionRecordId ?? null
          }
        : existing.resolution;
    const next: HumanReviewRequest = {
      ...existing,
      status: input.status,
      updatedAt: now,
      closedAt: isHumanReviewTerminalStatus(input.status) ? now : null,
      resolution,
      events: [
        ...existing.events,
        {
          id: `${existing.id}_${existing.events.length + 1}`,
          at: now,
          type: "status_changed",
          status: input.status,
          changedBy: input.changedBy,
          note: input.note ?? null
        }
      ]
    };
    this.persistHumanReviewSnapshot(
      this.humanReviews.map((request) =>
        request.id === next.id ? structuredClone(next) : structuredClone(request)
      )
    );
    this.replaceHumanReview(next);
    return structuredClone(next);
  }

  attachHumanReviewDecisionRecord(
    input: AttachHumanReviewDecisionRecordInput
  ): HumanReviewRequest {
    const existing = this.humanReviewById.get(input.requestId);
    if (!existing) {
      throw new Error(`HumanReviewRequest ${input.requestId} не найден.`);
    }
    if (existing.status !== "resolved" || !existing.resolution) {
      throw new Error(
        `HumanReviewRequest ${input.requestId} не закрыт и не может получить decision record.`
      );
    }
    if (existing.resolution.postDecisionRecordId === input.postDecisionRecordId) {
      return structuredClone(existing);
    }
    if (existing.resolution.postDecisionRecordId) {
      throw new Error(
        `HumanReviewRequest ${input.requestId} уже связан с decision record ${existing.resolution.postDecisionRecordId}.`
      );
    }
    const next: HumanReviewRequest = {
      ...existing,
      resolution: {
        ...existing.resolution,
        postDecisionRecordId: input.postDecisionRecordId
      }
    };
    this.persistHumanReviewSnapshot(
      this.humanReviews.map((request) =>
        request.id === next.id ? structuredClone(next) : structuredClone(request)
      )
    );
    this.replaceHumanReview(next);
    return structuredClone(next);
  }

  appendDocumentEntry(input: StoredDocumentIntakeEntry): StoredDocumentIntakeEntry {
    const entry = structuredClone(input);
    const bucket = this.documentEntriesByCaseId.get(input.caseId) ?? [];
    bucket.push(entry);
    this.documentEntriesByCaseId.set(input.caseId, bucket);
    return structuredClone(entry);
  }

  documentEntriesFor(caseId: string): StoredDocumentIntakeEntry[] {
    return (this.documentEntriesByCaseId.get(caseId) ?? [])
      .map((entry, index) => ({ entry, index }))
      .sort((left, right) => {
        const byCreatedAt = right.entry.run.createdAt.localeCompare(left.entry.run.createdAt);
        if (byCreatedAt !== 0) {
          return byCreatedAt;
        }
        return right.index - left.index;
      })
      .map(({ entry }) => structuredClone(entry));
  }

  // Back-compat: some call sites may still want to record a minimal row when
  // the full result is not available. Constructs a legacy-style record with
  // placeholder fingerprints so it never deduplicates against real records.
  snapshotDecision(
    caseId: string,
    verdict: Verdict,
    confidence: number,
    summary: string,
    kind: DecisionKind,
    changedSignalIds: string[],
    now = new Date()
  ): DecisionLogEntry {
    this.counter += 1;
    const recordedAt = now.toISOString();
    const decisionId = `log_${caseId}_${this.counter}`;
    const placeholder = `legacy:${decisionId}`;
    const record: DecisionRecord = {
      decisionId,
      caseId,
      engineVersion: "legacy",
      engineRevision: "legacy",
      computedAt: recordedAt,
      recordedAt,
      inputFingerprint: placeholder,
      catalogFingerprint: placeholder,
      resultFingerprint: placeholder,
      replayableSnapshot: null,
      result: null,
      auditTrail: null,
      verdict,
      confidence: Math.round(confidence * 100) / 100,
      summary,
      kind,
      changedSignalIds: changedSignalIds.slice(),
      changedPreferenceIds: []
    };
    this.appendRecord(record);
    return decisionRecordToLogEntry(record);
  }

  private toRecord(entry: DecisionLedgerEntry): DecisionRecord {
    return isDecisionRecord(entry) ? structuredClone(entry) : migrateLegacyEntry(entry);
  }

  private observeGeneratedSequence(value: string): void {
    const generatedDecision = /^(?:dec|log|hr)_.+_(\d+)$/.exec(value);
    if (generatedDecision) {
      const parsed = Number.parseInt(generatedDecision[1] ?? "", 10);
      if (Number.isInteger(parsed) && parsed > this.counter) {
        this.counter = parsed;
      }
      return;
    }

    const generatedFork = /-fork-(\d+)$/.exec(value);
    if (!generatedFork) return;
    const parsed = Number.parseInt(generatedFork[1] ?? "", 10);
    if (Number.isInteger(parsed) && parsed > this.counter) {
      this.counter = parsed;
    }
  }

  private appendRecord(record: DecisionRecord): void {
    if (this.byDecisionId.has(record.decisionId)) {
      throw new Error(`DecisionRecord ${record.decisionId} already exists in CaseStore.`);
    }
    this.observeGeneratedSequence(record.decisionId);
    this.records.push(record);
    this.byDecisionId.set(record.decisionId, record);
    const bucket = this.byCaseId.get(record.caseId) ?? [];
    bucket.push(record);
    this.byCaseId.set(record.caseId, bucket);
    const current = this.latestByCaseId.get(record.caseId);
    if (!current || record.recordedAt >= current.recordedAt) {
      this.latestByCaseId.set(record.caseId, record);
    }
  }

  private appendHumanReview(request: HumanReviewRequest): void {
    if (this.humanReviewById.has(request.id)) {
      throw new Error(`HumanReviewRequest ${request.id} already exists in CaseStore.`);
    }
    this.observeGeneratedSequence(request.id);
    this.humanReviews.push(request);
    this.humanReviewById.set(request.id, request);
    const bucket = this.humanReviewByCaseId.get(request.caseId) ?? [];
    bucket.push(request);
    this.humanReviewByCaseId.set(request.caseId, bucket);
  }

  private replaceHumanReview(request: HumanReviewRequest): void {
    const existing = this.humanReviewById.get(request.id);
    if (!existing) {
      throw new Error(`HumanReviewRequest ${request.id} не найден.`);
    }
    const index = this.humanReviews.findIndex((entry) => entry.id === request.id);
    if (index !== -1) {
      this.humanReviews[index] = request;
    }
    this.humanReviewById.set(request.id, request);
    const bucket = this.humanReviewByCaseId.get(request.caseId) ?? [];
    const bucketIndex = bucket.findIndex((entry) => entry.id === request.id);
    if (bucketIndex !== -1) {
      bucket[bucketIndex] = request;
    }
    this.humanReviewByCaseId.set(request.caseId, bucket);
  }

  private persistHumanReviewSnapshot(requests: HumanReviewRequest[]): void {
    if (!this.persistHumanReviews) return;
    this.persistHumanReviews(requests.map((request) => structuredClone(request)));
  }
}

let singleton: CaseStore | null = null;

export function initializeCaseStore(catalogs: Catalogs, options: CaseStoreOptions = {}): CaseStore {
  singleton = new CaseStore(catalogs, options);
  return singleton;
}

export function getCaseStore(): CaseStore {
  if (!singleton) throw new Error("CaseStore ещё не инициализирован.");
  return singleton;
}
