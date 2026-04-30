import { z } from "zod";

export const evidenceStatusSchema = z.enum([
  "valid",
  "stale",
  "missing",
  "conflicting",
  "manual_only"
]);
export type EvidenceStatus = z.infer<typeof evidenceStatusSchema>;

export const automationClassSchema = z.enum(["safe_auto", "assisted", "manual_only"]);
export type AutomationClass = z.infer<typeof automationClassSchema>;

export const evidenceSourceKindSchema = z.enum([
  "official",
  "operator",
  "crowdsourced",
  "internal_note"
]);
export type EvidenceSourceKind = z.infer<typeof evidenceSourceKindSchema>;

export const ruleEvidenceRecordSchema = z.object({
  ruleId: z.string().min(1),
  countryOrScope: z.string().min(1),
  sourceUrlOrRef: z.string().min(1),
  sourceKind: evidenceSourceKindSchema,
  lastVerifiedAt: z.string().datetime().nullable(),
  freshnessWindowDays: z.number().int().min(0),
  automationClass: automationClassSchema,
  evidenceStatus: evidenceStatusSchema,
  rationale: z.string().min(1)
});
export type RuleEvidenceRecord = z.infer<typeof ruleEvidenceRecordSchema>;

export const ruleEvidenceCatalogSchema = z.array(ruleEvidenceRecordSchema);
export type RuleEvidenceCatalog = z.infer<typeof ruleEvidenceCatalogSchema>;

export const ruleEvidenceDecisionSchema = z.object({
  ruleId: z.string().min(1),
  countryOrScope: z.string().min(1),
  sourceUrlOrRef: z.string().min(1).nullable(),
  sourceKind: evidenceSourceKindSchema.nullable(),
  lastVerifiedAt: z.string().datetime().nullable(),
  freshnessWindowDays: z.number().int().min(0).nullable(),
  automationClass: automationClassSchema,
  evidenceStatus: evidenceStatusSchema,
  rationale: z.string().min(1),
  blocksAutomation: z.boolean()
});
export type RuleEvidenceDecision = z.infer<typeof ruleEvidenceDecisionSchema>;
