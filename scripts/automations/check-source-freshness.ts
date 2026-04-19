import { readFile } from "node:fs/promises";
import path from "node:path";

type SourceTier = "official" | "operator" | "crowdsourced";

type Source = {
  id: string;
  label: string;
  url: string;
  tier: SourceTier;
  lastCheckedAt: string;
  volatilityScore: number;
};

type RecordWithSource = {
  sourceId?: string;
  sources?: Array<{ id: string }>;
};

const thresholdDaysByTier: Record<SourceTier, number> = {
  official: 7,
  operator: 5,
  crowdsourced: 14
};

async function loadJson<T>(relativePath: string): Promise<T> {
  const target = path.join(process.cwd(), relativePath);
  const raw = await readFile(target, "utf8");
  return JSON.parse(raw) as T;
}

function dayAge(iso: string): number | null {
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return null;
  const deltaMs = Date.now() - stamp;
  return Math.floor(deltaMs / (24 * 60 * 60 * 1000));
}

function collectSourceIds(records: RecordWithSource[]): string[] {
  const ids: string[] = [];
  for (const record of records) {
    if (record.sourceId) ids.push(record.sourceId);
    for (const source of record.sources ?? []) ids.push(source.id);
  }
  return ids;
}

async function main() {
  const sources = await loadJson<Source[]>("data/db/sources.json");
  const visaRules = await loadJson<RecordWithSource[]>("data/db/visa_rules.json");
  const restrictions = await loadJson<RecordWithSource[]>("data/db/country_restrictions.json");
  const residency = await loadJson<RecordWithSource[]>("data/db/residency_programs.json");
  const insurance = await loadJson<RecordWithSource[]>("data/db/insurance_products.json");

  const failures: string[] = [];
  const warnings: string[] = [];
  const duplicates = new Set<string>();
  const seen = new Set<string>();
  const referenced = collectSourceIds([
    ...visaRules,
    ...restrictions,
    ...residency,
    ...insurance
  ]);
  const referencedSet = new Set(referenced);

  for (const source of sources) {
    if (seen.has(source.id)) duplicates.add(source.id);
    seen.add(source.id);
    const age = dayAge(source.lastCheckedAt);
    if (age === null) {
      failures.push(`invalid lastCheckedAt: ${source.id}`);
      continue;
    }
    const threshold = thresholdDaysByTier[source.tier];
    const isReferenced = referencedSet.has(source.id);
    if (age > threshold && isReferenced) {
      const message = `${source.id} stale ${age}d > ${threshold}d (${source.tier})`;
      if (source.tier === "crowdsourced") warnings.push(message);
      else failures.push(message);
    } else if (age > threshold && !isReferenced) {
      warnings.push(`${source.id} stale but unused ${age}d > ${threshold}d (${source.tier})`);
    }
  }

  for (const duplicate of duplicates) {
    failures.push(`duplicate source id: ${duplicate}`);
  }

  const sourceIds = new Set(sources.map((item) => item.id));
  const missing = Array.from(new Set(referenced)).filter((id) => !sourceIds.has(id));
  for (const id of missing) failures.push(`missing source reference: ${id}`);

  const unused = sources
    .map((item) => item.id)
    .filter((id) => !referenced.includes(id));
  for (const id of unused) warnings.push(`unused source: ${id}`);

  const crowdsourcedReferenced = Array.from(
    new Set(
      referenced.filter((id) => sources.find((source) => source.id === id)?.tier === "crowdsourced")
    )
  );
  for (const id of crowdsourcedReferenced) {
    warnings.push(`crowdsourced dependency present: ${id}`);
  }

  console.log(`Sources: ${sources.length}`);
  console.log(`Referenced source ids: ${new Set(referenced).size}`);
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) console.log(`- ${warning}`);
  }
  if (failures.length > 0) {
    console.error("Failures:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log("OK: freshness and source integrity baseline passed.");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Проверка truth/freshness завершилась ошибкой."
  );
  process.exit(1);
});
