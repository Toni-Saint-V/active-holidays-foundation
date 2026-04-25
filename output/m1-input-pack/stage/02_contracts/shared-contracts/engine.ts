import { z } from "zod";
import { caseSchema } from "./case";
import { countryRestrictionsSchema, visaRulesSchema } from "./visa";
import { pathsCatalogSchema } from "./paths";
import { sourcesCatalogSchema } from "./sources";
import { residencyProgramsCatalogSchema } from "./residency";
import { insuranceProductsCatalogSchema } from "./insurance";

export const orchestratorCatalogsSchema = z.object({
  paths: pathsCatalogSchema,
  visaRules: visaRulesSchema,
  restrictions: countryRestrictionsSchema,
  sources: sourcesCatalogSchema,
  residencyPrograms: residencyProgramsCatalogSchema,
  insuranceProducts: insuranceProductsCatalogSchema
});
export type OrchestratorCatalogsPayload = z.infer<typeof orchestratorCatalogsSchema>;

// Engine version families. "legacy" is reserved for records migrated from the
// pre-integrity-layer decisions_log.json seed; they lack fingerprints/snapshot.
export const engineVersionSchema = z.enum(["rdc.v1", "legacy"]);
export type EngineVersion = z.infer<typeof engineVersionSchema>;

// SHA-256 hex digest (64 chars) or a "legacy:<id>" placeholder for migrated rows.
export const engineFingerprintSchema = z
  .string()
  .min(1)
  .refine(
    (value) => /^[0-9a-f]{64}$/.test(value) || value.startsWith("legacy:"),
    "Ожидался SHA-256 hex или legacy-плейсхолдер."
  );
export type EngineFingerprint = z.infer<typeof engineFingerprintSchema>;

export const replayableSnapshotSchema = z.object({
  case: caseSchema,
  catalogs: orchestratorCatalogsSchema,
  now: z.string().datetime()
});
export type ReplayableSnapshot = z.infer<typeof replayableSnapshotSchema>;
