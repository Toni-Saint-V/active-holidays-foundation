import { z } from "zod";
import { caseSchema } from "./case";
import { countryRestrictionsSchema, visaRulesSchema } from "./visa";
import { pathsCatalogSchema } from "./paths";
import { sourcesCatalogSchema } from "./sources";
import { ruleEvidenceCatalogSchema } from "./evidence";
import { residencyProgramsCatalogSchema } from "./residency";
import { insuranceProductsCatalogSchema } from "./insurance";

export const orchestratorCatalogsSchema = z.object({
  paths: pathsCatalogSchema,
  visaRules: visaRulesSchema,
  restrictions: countryRestrictionsSchema,
  sources: sourcesCatalogSchema,
  ruleEvidence: ruleEvidenceCatalogSchema,
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

const replayableSnapshotWithEvidenceSchema = z.object({
  case: caseSchema,
  catalogs: orchestratorCatalogsSchema,
  now: z.string().datetime(),
  evidenceContractCaptured: z.boolean().default(true)
});

const preEvidenceReplayableSnapshotSchema = z
  .object({
    case: caseSchema,
    catalogs: orchestratorCatalogsSchema.omit({ ruleEvidence: true }),
    now: z.string().datetime()
  })
  .transform((snapshot) => ({
    ...snapshot,
    catalogs: {
      ...snapshot.catalogs,
      ruleEvidence: []
    },
    evidenceContractCaptured: false
  }));

export const replayableSnapshotSchema = z.union([
  replayableSnapshotWithEvidenceSchema,
  preEvidenceReplayableSnapshotSchema
]);
export type ReplayableSnapshot = z.infer<typeof replayableSnapshotSchema>;
