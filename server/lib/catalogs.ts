import {
  casesSchema,
  countryRestrictionsSchema,
  decisionLedgerSchema,
  insuranceProductsCatalogSchema,
  pathsCatalogSchema,
  residencyProgramsCatalogSchema,
  ruleEvidenceCatalogSchema,
  sourcesCatalogSchema,
  visaRulesSchema,
  type Case,
  type CountryRestriction,
  type DecisionLedgerEntry,
  type InsuranceProductDefinition,
  type PathDefinition,
  type ResidencyProgramDefinition,
  type RuleEvidenceRecord,
  type Source,
  type VisaRule
} from "@shared/contracts";
import { loadSeed } from "./loadSeed";

export type Catalogs = {
  paths: PathDefinition[];
  visaRules: VisaRule[];
  restrictions: CountryRestriction[];
  sources: Source[];
  ruleEvidence: RuleEvidenceRecord[];
  cases: Case[];
  decisionsLog: DecisionLedgerEntry[];
  residencyPrograms: ResidencyProgramDefinition[];
  insuranceProducts: InsuranceProductDefinition[];
};

let cached: Catalogs | null = null;

export async function loadCatalogs(): Promise<Catalogs> {
  if (cached) return cached;
  const [
    paths,
    visaRules,
    restrictions,
    sources,
    ruleEvidence,
    cases,
    decisionsLog,
    residencyPrograms,
    insuranceProducts
  ] = await Promise.all([
    loadSeed("db/paths.json", pathsCatalogSchema),
    loadSeed("db/visa_rules.json", visaRulesSchema),
    loadSeed("db/country_restrictions.json", countryRestrictionsSchema),
    loadSeed("db/sources.json", sourcesCatalogSchema),
    loadSeed("db/rule_evidence.json", ruleEvidenceCatalogSchema),
    loadSeed("db/cases.json", casesSchema),
    loadSeed("db/decisions_log.json", decisionLedgerSchema),
    loadSeed("db/residency_programs.json", residencyProgramsCatalogSchema),
    loadSeed("db/insurance_products.json", insuranceProductsCatalogSchema)
  ]);
  cached = {
    paths,
    visaRules,
    restrictions,
    sources,
    ruleEvidence,
    cases,
    decisionsLog,
    residencyPrograms,
    insuranceProducts
  };
  return cached;
}

export function getCatalogsOrThrow(): Catalogs {
  if (!cached) throw new Error("Каталоги ещё не инициализированы. Вызовите loadCatalogs().");
  return cached;
}

export function resetCatalogsCache(): void {
  cached = null;
}

export function replaceCatalogsForTest(next: Catalogs): () => void {
  const previous = cached;
  cached = structuredClone(next);
  return () => {
    cached = previous;
  };
}
