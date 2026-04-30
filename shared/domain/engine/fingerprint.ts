import { createHash } from "node:crypto";
import type {
  Case,
  CaseOverride,
  CaseSignals,
  CountryRestriction,
  EngineFingerprint,
  InsuranceProductDefinition,
  PathDefinition,
  PathPreference,
  ResidencyProgramDefinition,
  RuleEvidenceRecord,
  ResultPayload,
  Source,
  HumanReviewTrustCalibration,
  VisaRule
} from "@shared/contracts";
import type { OrchestratorCatalogs } from "./orchestrator";
import { rulesCatalogMetadata } from "../rules/evaluate";
import { toRuleMetadata } from "../rules/types";
import { ENGINE_VERSION } from "./version";

// Numbers are rounded to this precision before hashing so that equivalent
// floats produced by different evaluation orders still hash identically.
const FLOAT_PRECISION = 6;

function roundNumber(value: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** FLOAT_PRECISION;
  return Math.round(value * factor) / factor;
}

// Stable deep serialization: object keys sorted alphabetically, floats rounded.
// Arrays are kept in input order; callers must pre-sort arrays whose semantic
// order is irrelevant (see normalize* helpers below).
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return JSON.stringify(roundNumber(value));
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined
    );
    entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return `{${entries
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`)
      .join(",")}}`;
  }
  return "null";
}

function sha256Hex(serialized: string): EngineFingerprint {
  return createHash("sha256").update(serialized).digest("hex");
}

export function hash(value: unknown): EngineFingerprint {
  return sha256Hex(canonicalize(value));
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortByKey<T>(items: readonly T[], key: (item: T) => string): T[] {
  return items.slice().sort((a, b) => compareStrings(key(a), key(b)));
}

// The normalize* helpers for Case drop volatile timestamps (capturedAt,
// appliedAt, createdAt, updatedAt) so that semantically identical resubmits
// with refreshed clocks produce the same inputFingerprint. Semantic fields
// (id, value, source, reason) are preserved.
function normalizeSignals(signals: CaseSignals): unknown[] {
  return sortByKey(signals, (signal) => signal.id).map((signal) => ({
    id: signal.id,
    value: signal.value,
    source: signal.source,
    capturedAt: "normalized"
  }));
}

function normalizeOverrides(overrides: readonly CaseOverride[]): unknown[] {
  return sortByKey(
    overrides,
    (override) => `${override.signalId}|${override.reason}`
  ).map((override) => ({
    signalId: override.signalId,
    value: override.value,
    reason: override.reason,
    appliedAt: "normalized"
  }));
}

function normalizePreferences(preferences: readonly PathPreference[]): PathPreference[] {
  return sortByKey(preferences, (preference) => preference.id);
}

function normalizeCase(caseData: Case): Record<string, unknown> {
  return {
    id: caseData.id,
    title: caseData.title,
    productType: caseData.productType,
    createdAt: "normalized",
    updatedAt: "normalized",
    forkedFrom: caseData.forkedFrom,
    signals: normalizeSignals(caseData.signals),
    overrides: normalizeOverrides(caseData.overrides),
    preferences: normalizePreferences(caseData.preferences)
  };
}

function normalizePaths(paths: readonly PathDefinition[]): PathDefinition[] {
  return sortByKey(paths, (item) => item.id);
}

function visaKey(rule: VisaRule): string {
  return `${rule.citizenship}|${rule.destination}|${rule.regime}`;
}

function normalizeVisaRules(rules: readonly VisaRule[]): VisaRule[] {
  return sortByKey(rules, visaKey);
}

function restrictionKey(item: CountryRestriction): string {
  return `${item.citizenship}|${item.destination}|${item.severity}|${item.label}`;
}

function normalizeRestrictions(
  items: readonly CountryRestriction[]
): CountryRestriction[] {
  return sortByKey(items, restrictionKey);
}

function normalizeSources(sources: readonly Source[]): Source[] {
  // Exclude lastCheckedAt from the fingerprint source because it is refreshed
  // relative to the "now" clock on every run; including it would make every
  // replay look different even when the engine is bit-stable.
  return sortByKey(
    sources.map((source) => ({
      ...source,
      lastCheckedAt: "normalized"
    })),
    (source) => source.id
  );
}

function normalizeRuleEvidence(
  records: readonly RuleEvidenceRecord[]
): RuleEvidenceRecord[] {
  return sortByKey(
    records,
    (record) =>
      [
        record.ruleId,
        record.countryOrScope,
        record.sourceUrlOrRef,
        record.sourceKind,
        record.automationClass,
        record.evidenceStatus,
        record.lastVerifiedAt ?? "",
        String(record.freshnessWindowDays),
        record.rationale
      ].join("|")
  );
}

function normalizeResidency(
  items: readonly ResidencyProgramDefinition[]
): ResidencyProgramDefinition[] {
  return sortByKey(items, (item) => item.id);
}

function normalizeInsurance(
  items: readonly InsuranceProductDefinition[]
): InsuranceProductDefinition[] {
  return sortByKey(items, (item) => item.id);
}

function normalizeHumanReviewCalibrations(
  items: readonly HumanReviewTrustCalibration[] = []
): HumanReviewTrustCalibration[] {
  return sortByKey(items, (item) => item.calibrationId);
}

function normalizeCatalogs(catalogs: OrchestratorCatalogs) {
  const humanReviewCalibrations = normalizeHumanReviewCalibrations(
    catalogs.humanReviewCalibrations
  );
  return {
    paths: normalizePaths(catalogs.paths),
    visaRules: normalizeVisaRules(catalogs.visaRules),
    restrictions: normalizeRestrictions(catalogs.restrictions),
    sources: normalizeSources(catalogs.sources),
    ruleEvidence: normalizeRuleEvidence(catalogs.ruleEvidence),
    residencyPrograms: normalizeResidency(catalogs.residencyPrograms),
    insuranceProducts: normalizeInsurance(catalogs.insuranceProducts),
    ...(humanReviewCalibrations.length > 0 ? { humanReviewCalibrations } : {})
  };
}

export function fingerprintCase(caseData: Case): EngineFingerprint {
  return hash({
    engineVersion: ENGINE_VERSION,
    case: normalizeCase(caseData)
  });
}

export function fingerprintCatalogs(
  catalogs: OrchestratorCatalogs
): EngineFingerprint {
  // Fold code-defined rule metadata into the catalog fingerprint so any rule
  // logic change flips the hash even if no JSON seed file changed.
  const rulesMetadata = rulesCatalogMetadata()
    .map(toRuleMetadata)
    .slice()
    .sort((a, b) => compareStrings(a.id, b.id));
  return hash({
    engineVersion: ENGINE_VERSION,
    catalogs: normalizeCatalogs(catalogs),
    rulesMetadata
  });
}

// Strips volatile timing/state fields so the result fingerprint only captures
// decision-defining data. Any future field added to ResultPayload will be
// included automatically via canonicalize.
export function projectResultForFingerprint(result: ResultPayload) {
  const projectedSources = result.trust.sources.map((source) => ({
    ...source,
    lastCheckedAt: "normalized"
  }));
  const projectedSteps = result.auditTrail.steps.map((step) => ({
    ...step,
    tookMs: 0
  }));
  return {
    ...result,
    auditTrail: {
      ...result.auditTrail,
      startedAt: "normalized",
      finishedAt: "normalized",
      totalMs: 0,
      steps: projectedSteps
    },
    trust: {
      ...result.trust,
      sources: projectedSources,
      lastCheckedAt: "normalized"
    }
  };
}

export function fingerprintResult(result: ResultPayload): EngineFingerprint {
  return hash(projectResultForFingerprint(result));
}
