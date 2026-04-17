import type {
  Case,
  CaseOverride,
  CaseSignals,
  DecisionLogEntry,
  PathPreference,
  Verdict
} from "@shared/contracts";
import type { Catalogs } from "./catalogs";

export class CaseStore {
  private readonly cases = new Map<string, Case>();
  private readonly decisionsLog: DecisionLogEntry[] = [];
  private counter = 0;

  constructor(initial: Catalogs) {
    for (const entry of initial.cases) this.cases.set(entry.id, structuredClone(entry));
    for (const entry of initial.decisionsLog) this.decisionsLog.push(structuredClone(entry));
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
    const overrides = existing.overrides.filter(
      (item) => item.signalId !== override.signalId
    );
    overrides.push(override);
    const signals = existing.signals.map((signal) =>
      signal.id === override.signalId
        ? { ...signal, value: override.value, source: "override" as const, capturedAt: override.appliedAt }
        : signal
    );
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

  recordDecision(entry: DecisionLogEntry): void {
    this.decisionsLog.push(entry);
  }

  decisionsFor(caseId: string): DecisionLogEntry[] {
    return this.decisionsLog
      .filter((entry) => entry.caseId === caseId)
      .slice()
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }

  allDecisions(): DecisionLogEntry[] {
    return this.decisionsLog
      .slice()
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }

  snapshotDecision(caseId: string, verdict: Verdict, confidence: number, summary: string, kind: DecisionLogEntry["kind"], changedSignalIds: string[], now = new Date()): DecisionLogEntry {
    this.counter += 1;
    const entry: DecisionLogEntry = {
      id: `log_${caseId}_${this.counter}`,
      caseId,
      verdict,
      confidence: Math.round(confidence * 100) / 100,
      summary,
      kind,
      changedSignalIds,
      recordedAt: now.toISOString()
    };
    this.recordDecision(entry);
    return entry;
  }
}

let singleton: CaseStore | null = null;

export function initializeCaseStore(catalogs: Catalogs): CaseStore {
  singleton = new CaseStore(catalogs);
  return singleton;
}

export function getCaseStore(): CaseStore {
  if (!singleton) throw new Error("CaseStore ещё не инициализирован.");
  return singleton;
}
