import type { ResultPayload, Verdict } from "@shared/contracts";

export type DriftFieldChange<T> = { before: T; after: T };

export type DriftDiff = {
  verdict?: DriftFieldChange<Verdict>;
  nextActionType?: DriftFieldChange<string>;
  nextActionLabel?: DriftFieldChange<string>;
  primaryPathId?: DriftFieldChange<string | null>;
  confidence?: DriftFieldChange<number>;
  alternativePathIds?: DriftFieldChange<string[]>;
  risks?: DriftFieldChange<string[]>;
  criticalRiskId?: DriftFieldChange<string | null>;
};

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function sortedRiskKeys(result: ResultPayload): string[] {
  return result.risks
    .map((risk) => `${risk.id}:${risk.severity}`)
    .slice()
    .sort();
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Compares the decision-defining projection of two results. Returns null when
// the projections are equal. Otherwise returns a structured diff with both
// sides for every changed field.
export function driftDiff(
  before: ResultPayload,
  after: ResultPayload
): DriftDiff | null {
  const diff: DriftDiff = {};

  if (before.verdict !== after.verdict) {
    diff.verdict = { before: before.verdict, after: after.verdict };
  }

  if (before.nextAction.type !== after.nextAction.type) {
    diff.nextActionType = {
      before: before.nextAction.type,
      after: after.nextAction.type
    };
  }

  if (before.nextAction.label !== after.nextAction.label) {
    diff.nextActionLabel = {
      before: before.nextAction.label,
      after: after.nextAction.label
    };
  }

  const beforePathId = before.primaryPath?.id ?? null;
  const afterPathId = after.primaryPath?.id ?? null;
  if (beforePathId !== afterPathId) {
    diff.primaryPathId = { before: beforePathId, after: afterPathId };
  }

  const beforeConfidence = roundTwo(before.trust.confidence);
  const afterConfidence = roundTwo(after.trust.confidence);
  if (beforeConfidence !== afterConfidence) {
    diff.confidence = { before: beforeConfidence, after: afterConfidence };
  }

  const beforeAlternatives = before.alternativePaths.map((offer) => offer.id).sort();
  const afterAlternatives = after.alternativePaths.map((offer) => offer.id).sort();
  if (!arraysEqual(beforeAlternatives, afterAlternatives)) {
    diff.alternativePathIds = {
      before: beforeAlternatives,
      after: afterAlternatives
    };
  }

  const beforeRisks = sortedRiskKeys(before);
  const afterRisks = sortedRiskKeys(after);
  if (!arraysEqual(beforeRisks, afterRisks)) {
    diff.risks = { before: beforeRisks, after: afterRisks };
  }

  const beforeCritical = before.criticalRisk?.id ?? null;
  const afterCritical = after.criticalRisk?.id ?? null;
  if (beforeCritical !== afterCritical) {
    diff.criticalRiskId = { before: beforeCritical, after: afterCritical };
  }

  return Object.keys(diff).length === 0 ? null : diff;
}

export function hasDrift(diff: DriftDiff | null): diff is DriftDiff {
  return diff !== null;
}
