import { describe, expect, it } from "vitest";
import {
  decisionLedgerSchema,
  decisionsLogSchema,
  decisionLedgerEntrySchema,
  decisionLogEntrySchema,
  decisionRecordSchema,
  decisionRecordToLogEntry,
  isDecisionRecord,
  type DecisionLogEntry,
  type DecisionRecord
} from "./decisions";
import { resultPayloadSchema } from "./result";
import { runDecision, type OrchestratorCatalogs } from "../domain/engine";
import { loadCatalogs } from "../../server/lib/catalogs";

const LEGACY: DecisionLogEntry = {
  id: "log_s1_init",
  caseId: "s1-rf-italy",
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.62,
  summary: "Исходный пересчёт: шенген C возможен, но нужна страховка и проверка дат.",
  kind: "recompute",
  changedSignalIds: [],
  recordedAt: "2026-04-15T10:00:00.000Z"
};

const RECORD: DecisionRecord = {
  decisionId: "dec_s1_1",
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
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.79,
  summary: "recompute",
  kind: "recompute",
  changedSignalIds: [],
  changedPreferenceIds: []
};

describe("decisionLedgerEntrySchema", () => {
  it("accepts the legacy DecisionLogEntry shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(LEGACY);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(false);
    }
  });

  it("accepts the new DecisionRecord shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(RECORD);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(true);
    }
  });

  it("rejects entries that match neither shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse({
      id: "missing_case_id"
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps decisionsLogSchema legacy-only for old API consumers", () => {
    const parsed = decisionsLogSchema.safeParse([LEGACY]);
    expect(parsed.success).toBe(true);
  });

  it("accepts mixed legacy and full records in decisionLedgerSchema", () => {
    const parsed = decisionLedgerSchema.safeParse([LEGACY, RECORD]);
    expect(parsed.success).toBe(true);
  });
});

describe("decisionRecordToLogEntry", () => {
  it("projects a record onto the legacy shape that the old API uses", () => {
    const entry = decisionRecordToLogEntry(RECORD);
    const parsed = decisionLogEntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
    expect(entry.id).toBe(RECORD.decisionId);
    expect(entry.verdict).toBe(RECORD.verdict);
    expect(entry.confidence).toBe(RECORD.confidence);
    expect(entry.summary).toBe(RECORD.summary);
    expect(entry.kind).toBe(RECORD.kind);
    expect(entry.changedSignalIds).toEqual(RECORD.changedSignalIds);
    expect(entry.recordedAt).toBe(RECORD.recordedAt);
  });
});

describe("decisionRecordSchema", () => {
  it("rejects a record with an invalid fingerprint", () => {
    const bad = { ...RECORD, inputFingerprint: "not-a-hash" };
    const parsed = decisionRecordSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("rejects evidence-captured records whose result misses trust evidence fields", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s1-rf-italy");
    expect(caseData).toBeDefined();
    if (!caseData) return;
    const orchestrator: OrchestratorCatalogs = {
      paths: catalogs.paths,
      visaRules: catalogs.visaRules,
      restrictions: catalogs.restrictions,
      sources: catalogs.sources,
      ruleEvidence: catalogs.ruleEvidence,
      residencyPrograms: catalogs.residencyPrograms,
      insuranceProducts: catalogs.insuranceProducts
    };
    const result = runDecision({ case: caseData, catalogs: orchestrator });
    const legacyResult = structuredClone(result) as Record<string, unknown> & {
      trust: Record<string, unknown>;
    };
    delete legacyResult.trust.evidenceStatus;
    delete legacyResult.trust.freshnessStatus;
    delete legacyResult.trust.blockingReason;
    delete legacyResult.trust.humanReviewReason;
    expect(resultPayloadSchema.safeParse(legacyResult).success).toBe(false);

    const parsed = decisionRecordSchema.safeParse({
      ...RECORD,
      replayableSnapshot: {
        case: caseData,
        catalogs: orchestrator,
        now: result.computedAt,
        evidenceContractCaptured: true
      },
      result: legacyResult
    });

    expect(parsed.success).toBe(false);
  });
});
