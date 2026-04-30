export type SourceFreshnessTier = "official" | "operator" | "crowdsourced";

export const sourceFreshnessThresholdDaysByTier: Record<SourceFreshnessTier, number> = {
  official: 7,
  operator: 5,
  crowdsourced: 14
};

export function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isIsoFreshnessStale(
  value: string | null,
  windowDays: number,
  now: Date
): boolean {
  if (!value) return true;
  const checkedAt = new Date(value);
  if (Number.isNaN(checkedAt.getTime())) return true;
  return addUtcDays(checkedAt, windowDays).getTime() < now.getTime();
}
