import type {
  AutomationClass,
  EvidenceStatus,
  RuleEvidenceDecision,
  RuleEvidenceRecord,
  Source
} from "@shared/contracts";
import {
  isIsoFreshnessStale,
  sourceFreshnessThresholdDaysByTier
} from "./sourceFreshness";

type EvaluateRuleEvidenceInput = {
  ruleId: string;
  countryOrScope: string;
  records: RuleEvidenceRecord[];
  sources?: Source[];
  now: Date;
};

const STATUS_PRIORITY: Record<EvidenceStatus, number> = {
  conflicting: 5,
  manual_only: 4,
  missing: 3,
  stale: 2,
  valid: 1
};

type EvaluatedRecord = {
  record: RuleEvidenceRecord;
  status: EvidenceStatus;
};

function referencedSource(
  record: RuleEvidenceRecord,
  sources: Source[] | undefined
): Source | null {
  return sources?.find((source) => source.id === record.sourceUrlOrRef) ?? null;
}

function isRecordStale(
  record: RuleEvidenceRecord,
  sources: Source[] | undefined,
  now: Date
): boolean {
  if (isIsoFreshnessStale(record.lastVerifiedAt, record.freshnessWindowDays, now)) {
    return true;
  }
  const source = referencedSource(record, sources);
  if (!source) return false;
  return isIsoFreshnessStale(
    source.lastCheckedAt,
    Math.min(
      record.freshnessWindowDays,
      sourceFreshnessThresholdDaysByTier[source.tier]
    ),
    now
  );
}

function missingReferencedSource(
  record: RuleEvidenceRecord,
  sources: Source[] | undefined
): boolean {
  if (!sources) return false;
  if (record.sourceKind === "internal_note") return false;
  return referencedSource(record, sources) === null;
}

function pickAutomationClass(records: RuleEvidenceRecord[]): AutomationClass {
  if (records.some((record) => record.automationClass === "manual_only")) {
    return "manual_only";
  }
  if (records.some((record) => record.automationClass === "assisted")) {
    return "assisted";
  }
  return "safe_auto";
}

function strongestStatus(statuses: EvidenceStatus[]): EvidenceStatus {
  return statuses
    .slice()
    .sort((a, b) => STATUS_PRIORITY[b] - STATUS_PRIORITY[a])[0] ?? "missing";
}

function pickDecidingRecord(
  evaluated: EvaluatedRecord[],
  evidenceStatus: EvidenceStatus,
  automationClass: AutomationClass
): RuleEvidenceRecord {
  if (automationClass === "manual_only") {
    return evaluated.find((entry) => entry.record.automationClass === "manual_only")?.record
      ?? evaluated[0].record;
  }
  if (automationClass === "assisted" && evidenceStatus === "valid") {
    return evaluated.find((entry) => entry.record.automationClass === "assisted")?.record
      ?? evaluated[0].record;
  }
  return evaluated.find((entry) => entry.status === evidenceStatus)?.record
    ?? evaluated[0].record;
}

function blocksAutomation(
  evidenceStatus: EvidenceStatus,
  automationClass: AutomationClass
): boolean {
  return evidenceStatus !== "valid" || automationClass !== "safe_auto";
}

export function evaluateRuleEvidence(
  input: EvaluateRuleEvidenceInput
): RuleEvidenceDecision {
  const sameRule = input.records.filter((record) => record.ruleId === input.ruleId);
  const exact = sameRule.filter(
    (record) => record.countryOrScope === input.countryOrScope
  );
  const matching =
    exact.length > 0
      ? exact
      : sameRule.filter((record) => record.countryOrScope === "global");

  if (matching.length === 0) {
    return {
      ruleId: input.ruleId,
      countryOrScope: input.countryOrScope,
      sourceUrlOrRef: null,
      sourceKind: null,
      lastVerifiedAt: null,
      freshnessWindowDays: null,
      automationClass: "manual_only",
      evidenceStatus: "missing",
      rationale: "No matching rule evidence record exists for this scope.",
      blocksAutomation: true
    };
  }

  const automationClass = pickAutomationClass(matching);
  const evaluated = matching.map((record): EvaluatedRecord => {
    let status: EvidenceStatus;
    if (record.evidenceStatus !== "valid") status = record.evidenceStatus;
    else if (missingReferencedSource(record, input.sources)) status = "missing";
    else status = isRecordStale(record, input.sources, input.now) ? "stale" : "valid";
    return { record, status };
  });
  const statuses = evaluated.map((entry) => entry.status);
  const evidenceStatus =
    automationClass === "manual_only" ? "manual_only" : strongestStatus(statuses);
  const decidingRecord = pickDecidingRecord(evaluated, evidenceStatus, automationClass);
  const primarySource = referencedSource(decidingRecord, input.sources);
  const sourceKind =
    decidingRecord.sourceKind === "internal_note"
      ? decidingRecord.sourceKind
      : primarySource?.tier ?? decidingRecord.sourceKind;

  return {
    ruleId: input.ruleId,
    countryOrScope: input.countryOrScope,
    sourceUrlOrRef: decidingRecord.sourceUrlOrRef,
    sourceKind,
    lastVerifiedAt: decidingRecord.lastVerifiedAt,
    freshnessWindowDays: decidingRecord.freshnessWindowDays,
    automationClass,
    evidenceStatus,
    rationale: decidingRecord.rationale,
    blocksAutomation: blocksAutomation(evidenceStatus, automationClass)
  };
}
