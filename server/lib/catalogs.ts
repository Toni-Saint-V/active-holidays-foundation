import {
  casesSchema,
  countryRestrictionsSchema,
  decisionsLogSchema,
  insuranceProductsCatalogSchema,
  pathsCatalogSchema,
  residencyProgramsCatalogSchema,
  sourcesCatalogSchema,
  visaRulesSchema,
  type Case,
  type CountryRestriction,
  type DecisionLogEntry,
  type InsuranceProductDefinition,
  type PathDefinition,
  type ResidencyProgramDefinition,
  type Source,
  type VisaRule
} from "@shared/contracts";
import { loadSeed } from "./loadSeed";

export type Catalogs = {
  paths: PathDefinition[];
  visaRules: VisaRule[];
  restrictions: CountryRestriction[];
  sources: Source[];
  cases: Case[];
  decisionsLog: DecisionLogEntry[];
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
    cases,
    decisionsLog,
    residencyPrograms,
    insuranceProducts
  ] = await Promise.all([
    loadSeed("db/paths.json", pathsCatalogSchema),
    loadSeed("db/visa_rules.json", visaRulesSchema),
    loadSeed("db/country_restrictions.json", countryRestrictionsSchema),
    loadSeed("db/sources.json", sourcesCatalogSchema),
    loadSeed("db/cases.json", casesSchema),
    loadSeed("db/decisions_log.json", decisionsLogSchema),
    loadSeed("db/residency_programs.json", residencyProgramsCatalogSchema),
    loadSeed("db/insurance_products.json", insuranceProductsCatalogSchema)
  ]);
  cached = {
    paths,
    visaRules,
    restrictions,
    sources,
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
