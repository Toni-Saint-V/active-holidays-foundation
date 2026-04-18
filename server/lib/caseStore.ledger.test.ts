import { describe, expect, it } from "vitest";
import type {
  Case,
  DecisionLedgerEntry,
  DecisionRecord
} from "@shared/contracts";
import { runDecision, type OrchestratorCatalogs } from "@shared/domain/engine";
import { CaseStore } from "./caseStore";
import { loadCatalogs, type Catalogs } from "./catalogs";

const NOW = new Date("2026-04-17T09:00:00.000Z");

function toOrchestrator(catalogs: Catalogs): OrchestratorCatalogs {
  return {
    paths: catalogs.paths,
    visaRules: catalogs.visaRules,
    restrictions: catalogs.restrictions,
    sources: catalogs.sources,
    residencyPrograms: catalogs.residencyPrograms,
    insuranceProducts: catalogs.insuranceProducts
  };
}

function findCase(catalogs: Catalogs, id: string): Case {
  const entry = catalogs.cases.find((item) => item.id === id);
  if (!entry) throw new Error(`Missing seed case ${id}`);
  return entry;
}

describe("CaseStore ledger", () => {
  it("deduplicates identical recomputes under the same engine revision", async () => {
    const catalogs = await loadCatalogs();
    const store = new CaseStore({ ...catalogs, decisionsLog: [] });
    const orchestrator = toOrchestrator(catalogs);
    const caseData = findCase(catalogs, "s1-rf-italy");
    const result = runDecision({ case: caseData, catalogs: orchestrator });

    const first = store.snapshotDecisionRecord({
      case: caseData,
      catalogs: orchestrator,
      result,
      summary: "first",
      kind: "recompute",
      changedSignalIds: [],
      now: NOW
    });
    const second = store.snapshotDecisionRecord({
      case: caseData,
      catalogs: orchestrator,
      result,
      summary: "second",
      kind: "override",
      changedSignalIds: ["citizenship"],
      now: new Date("2026-04-17T10:00:00.000Z")
    });

    expect(first.decisionId).toBe(second.decisionId);
    expect(store.recordsFor(caseData.id)).toHaveLength(1);
    expect(store.latestRecordFor(caseData.id)?.decisionId).toBe(first.decisionId);
  });

  it("creates a new record when the case input changes", async () => {
    const catalogs = await loadCatalogs();
    const store = new CaseStore({ ...catalogs, decisionsLog: [] });
    const orchestrator = toOrchestrator(catalogs);
    const base = findCase(catalogs, "s1-rf-italy");
    const resultA = runDecision({ case: base, catalogs: orchestrator });

    const a = store.snapshotDecisionRecord({
      case: base,
      catalogs: orchestrator,
      result: resultA,
      summary: "initial",
      kind: "recompute",
      changedSignalIds: [],
      now: NOW
    });

    const mutated: Case = {
      ...base,
      signals: base.signals.map((signal) =>
        signal.id === "timeline_weeks"
          ? { ...signal, value: 2 }
          : signal
      )
    };
    const resultB = runDecision({ case: mutated, catalogs: orchestrator });
    const b = store.snapshotDecisionRecord({
      case: mutated,
      catalogs: orchestrator,
      result: resultB,
      summary: "after signal patch",
      kind: "recompute",
      changedSignalIds: ["timeline_weeks"],
      now: new Date("2026-04-17T11:00:00.000Z")
    });

    expect(a.decisionId).not.toBe(b.decisionId);
    expect(store.recordsFor(base.id).map((r) => r.decisionId)).toEqual([
      b.decisionId,
      a.decisionId
    ]);
    expect(store.latestRecordFor(base.id)?.decisionId).toBe(b.decisionId);
  });

  it("migrates legacy seed rows to DecisionRecords with engineVersion=legacy", async () => {
    const catalogs = await loadCatalogs();
    const legacy: DecisionLedgerEntry = {
      id: "log_legacy_1",
      caseId: "s1-rf-italy",
      verdict: "GO",
      confidence: 0.55,
      summary: "legacy row",
      kind: "recompute",
      changedSignalIds: [],
      recordedAt: "2026-04-01T10:00:00.000Z"
    };
    const store = new CaseStore({ ...catalogs, decisionsLog: [legacy] });

    const record = store.getRecord("log_legacy_1");
    expect(record).not.toBeNull();
    expect(record?.engineVersion).toBe("legacy");
    expect(record?.replayableSnapshot).toBeNull();
    expect(record?.result).toBeNull();
    expect(record?.inputFingerprint.startsWith("legacy:")).toBe(true);

    const summary = store.allDecisions().find((entry) => entry.id === "log_legacy_1");
    expect(summary).toBeDefined();
    expect(summary?.summary).toBe("legacy row");
  });

  it("accepts preloaded full DecisionRecords without migration", async () => {
    const catalogs = await loadCatalogs();
    const record: DecisionRecord = {
      decisionId: "dec_s1-rf-italy_7",
      caseId: "s1-rf-italy",
      engineVersion: "rdc.v1",
      engineRevision: "2026.04.18",
      computedAt: "2026-04-17T09:00:00.000Z",
      recordedAt: "2026-04-17T09:00:00.000Z",
      inputFingerprint: "a".repeat(64),
      catalogFingerprint: "b".repeat(64),
      resultFingerprint: "c".repeat(64),
      replayableSnapshot: null,
      result: null,
      auditTrail: null,
      verdict: "GO",
      confidence: 0.66,
      summary: "preloaded full record",
      kind: "recompute",
      changedSignalIds: []
    };
    const store = new CaseStore({ ...catalogs, decisionsLog: [record] });

    expect(store.getRecord(record.decisionId)).toEqual(record);
  });

  it("exposes getRecord, latestRecordFor, and allRecords after recompute", async () => {
    const catalogs = await loadCatalogs();
    const store = new CaseStore({ ...catalogs, decisionsLog: [] });
    const orchestrator = toOrchestrator(catalogs);
    const caseData = findCase(catalogs, "s1-rf-italy");
    const result = runDecision({ case: caseData, catalogs: orchestrator });

    const record = store.snapshotDecisionRecord({
      case: caseData,
      catalogs: orchestrator,
      result,
      summary: "recompute",
      kind: "recompute",
      changedSignalIds: [],
      now: NOW
    });

    expect(store.getRecord(record.decisionId)?.decisionId).toBe(record.decisionId);
    expect(store.latestRecordFor(caseData.id)?.decisionId).toBe(record.decisionId);
    expect(store.allRecords().some((item) => item.decisionId === record.decisionId)).toBe(true);
  });

  it("insertRecordForTest lets tests simulate stale records", async () => {
    const catalogs = await loadCatalogs();
    const store = new CaseStore({ ...catalogs, decisionsLog: [] });
    const synthetic: DecisionRecord = {
      decisionId: "dec_synthetic_1",
      caseId: "s1-rf-italy",
      engineVersion: "rdc.v1",
      engineRevision: "2099.99.99",
      computedAt: "2026-04-17T09:00:00.000Z",
      recordedAt: "2026-04-17T09:00:00.000Z",
      inputFingerprint: "a".repeat(64),
      catalogFingerprint: "b".repeat(64),
      resultFingerprint: "c".repeat(64),
      replayableSnapshot: null,
      result: null,
      auditTrail: null,
      verdict: "GO",
      confidence: 0.5,
      summary: "synthetic",
      kind: "recompute",
      changedSignalIds: []
    };
    store.insertRecordForTest(synthetic);
    expect(store.getRecord("dec_synthetic_1")).not.toBeNull();
    expect(store.latestRecordFor("s1-rf-italy")?.decisionId).toBe("dec_synthetic_1");
  });

  it("advances the generated record counter past preloaded decision ids", async () => {
    const catalogs = await loadCatalogs();
    const orchestrator = toOrchestrator(catalogs);
    const caseData = findCase(catalogs, "s1-rf-italy");
    const result = runDecision({ case: caseData, catalogs: orchestrator });
    const preloaded: DecisionRecord = {
      decisionId: "dec_s1-rf-italy_7",
      caseId: caseData.id,
      engineVersion: "rdc.v1",
      engineRevision: "2026.04.18",
      computedAt: "2026-04-17T08:00:00.000Z",
      recordedAt: "2026-04-17T08:00:00.000Z",
      inputFingerprint: "d".repeat(64),
      catalogFingerprint: "e".repeat(64),
      resultFingerprint: "f".repeat(64),
      replayableSnapshot: null,
      result: null,
      auditTrail: null,
      verdict: "GO",
      confidence: 0.7,
      summary: "preloaded",
      kind: "recompute",
      changedSignalIds: []
    };
    const store = new CaseStore({ ...catalogs, decisionsLog: [preloaded] });

    const next = store.snapshotDecisionRecord({
      case: caseData,
      catalogs: orchestrator,
      result,
      summary: "after preload",
      kind: "recompute",
      changedSignalIds: [],
      now: NOW
    });

    expect(next.decisionId).toBe("dec_s1-rf-italy_8");
    expect(store.getRecord("dec_s1-rf-italy_7")?.summary).toBe("preloaded");
  });
});
