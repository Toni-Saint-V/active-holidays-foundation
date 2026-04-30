import { z } from "zod";
import { verdictSchema } from "./verdict";
import { auditTrailSchema } from "./audit";
import { legacyResultPayloadSchema, resultPayloadSchema } from "./result";
import {
  engineFingerprintSchema,
  engineVersionSchema,
  replayableSnapshotSchema
} from "./engine";

// Legacy summary shape (prior to the decision-integrity-layer). Kept as an
// exported schema so the seed file `data/db/decisions_log.json` still parses
// and so existing HTTP consumers of GET /api/decisions keep their shape.
export const decisionKindSchema = z.enum([
  "recompute",
  "override",
  "fork",
  "source_update"
]);
export type DecisionKind = z.infer<typeof decisionKindSchema>;

export const decisionLogEntrySchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  verdict: verdictSchema,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  kind: decisionKindSchema,
  changedSignalIds: z.array(z.string()).default([]),
  recordedAt: z.string().datetime()
});
export type DecisionLogEntry = z.infer<typeof decisionLogEntrySchema>;

export const decisionsLogSchema = z.array(decisionLogEntrySchema);
export type DecisionsLog = z.infer<typeof decisionsLogSchema>;

const decisionRecordBaseSchema = z.object({
  decisionId: z.string().min(1),
  caseId: z.string().min(1),
  engineVersion: engineVersionSchema,
  engineRevision: z.string().min(1),
  computedAt: z.string().datetime(),
  recordedAt: z.string().datetime(),
  inputFingerprint: engineFingerprintSchema,
  catalogFingerprint: engineFingerprintSchema,
  resultFingerprint: engineFingerprintSchema,
  replayableSnapshot: replayableSnapshotSchema.nullable(),
  result: z.unknown().nullable(),
  auditTrail: auditTrailSchema.nullable(),
  verdict: verdictSchema,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  kind: decisionKindSchema,
  changedSignalIds: z.array(z.string()).default([]),
  changedPreferenceIds: z.array(z.string()).default([])
});

function canUseLegacyResult(
  record: z.infer<typeof decisionRecordBaseSchema>
): boolean {
  return (
    record.replayableSnapshot === null ||
    record.replayableSnapshot.evidenceContractCaptured === false
  );
}

function parseDecisionRecordResult(
  record: z.infer<typeof decisionRecordBaseSchema>
) {
  if (record.result === null) return null;
  return canUseLegacyResult(record)
    ? legacyResultPayloadSchema.parse(record.result)
    : resultPayloadSchema.parse(record.result);
}

// Full production ledger record. Captured on every non-deduped recompute so
// replay, drift checks, and audit trails have bit-stable inputs. Historical
// records may use ResultPayload trust compat only when they predate the
// evidence contract; current evidence-captured records stay strict.
export const decisionRecordSchema = decisionRecordBaseSchema
  .superRefine((record, ctx) => {
    if (record.result === null) return;
    const parsed = canUseLegacyResult(record)
      ? legacyResultPayloadSchema.safeParse(record.result)
      : resultPayloadSchema.safeParse(record.result);
    if (parsed.success) return;
    ctx.addIssue({
      code: "custom",
      path: ["result"],
      message: parsed.error.message
    });
  })
  .transform((record) => ({
    ...record,
    result: parseDecisionRecordResult(record)
  }));
export type DecisionRecord = z.infer<typeof decisionRecordSchema>;

export const decisionRecordsSchema = z.array(decisionRecordSchema);
export type DecisionRecords = z.infer<typeof decisionRecordsSchema>;

// Union that accepts either a legacy row or a full record. The CaseStore uses
// this to migrate seed data into records at boot without breaking backward
// compatibility with the existing decisions_log.json file.
export const decisionLedgerEntrySchema = z.union([
  decisionRecordSchema,
  decisionLogEntrySchema
]);
export type DecisionLedgerEntry = z.infer<typeof decisionLedgerEntrySchema>;
export const decisionLedgerSchema = z.array(decisionLedgerEntrySchema);
export type DecisionLedger = z.infer<typeof decisionLedgerSchema>;

export function isDecisionRecord(entry: DecisionLedgerEntry): entry is DecisionRecord {
  return "decisionId" in entry;
}

export function decisionRecordToLogEntry(record: DecisionRecord): DecisionLogEntry {
  return {
    id: record.decisionId,
    caseId: record.caseId,
    verdict: record.verdict,
    confidence: record.confidence,
    summary: record.summary,
    kind: record.kind,
    changedSignalIds: record.changedSignalIds,
    recordedAt: record.recordedAt
  };
}
