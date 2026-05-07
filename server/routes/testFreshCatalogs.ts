import type { Catalogs } from "../lib/catalogs";

export function freshCatalogsForRouteTest(
  catalogs: Catalogs,
  refreshedAt = new Date().toISOString()
): Catalogs {
  const next = structuredClone(catalogs);
  next.sources = next.sources.map((source) => ({
    ...source,
    lastCheckedAt: refreshedAt
  }));
  next.ruleEvidence = next.ruleEvidence.map((record) =>
    record.evidenceStatus === "valid"
      ? {
          ...record,
          lastVerifiedAt: refreshedAt
        }
      : record
  );
  return next;
}
