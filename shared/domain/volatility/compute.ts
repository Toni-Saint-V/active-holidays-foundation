import type { Source, SourceTier } from "@shared/contracts";

const DAY_MS = 24 * 60 * 60 * 1000;
const tierBaseline: Record<SourceTier, number> = {
  official: 0.1,
  operator: 0.25,
  crowdsourced: 0.5
};

function daysBetween(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / DAY_MS);
}

export function computeSourceVolatility(source: Source, now: Date): number {
  const baseline = tierBaseline[source.tier];
  const ageDays = daysBetween(now, new Date(source.lastCheckedAt));
  const staleness = Math.min(1, ageDays / 45);
  const combined = baseline + staleness * 0.5;
  return Math.min(1, Math.max(0, Math.round(combined * 100) / 100));
}

export function refreshSourcesWithVolatility(
  sources: Source[],
  now: Date
): Source[] {
  return sources
    .map((source) => ({
      ...source,
      volatilityScore: computeSourceVolatility(source, now)
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function aggregateVolatility(sources: Source[]): number {
  if (sources.length === 0) return 0;
  const sum = sources.reduce((acc, source) => acc + source.volatilityScore, 0);
  return Math.round((sum / sources.length) * 100) / 100;
}
