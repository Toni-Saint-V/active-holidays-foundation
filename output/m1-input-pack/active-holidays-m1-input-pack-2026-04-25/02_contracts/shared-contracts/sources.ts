import { z } from "zod";

export const sourceTierSchema = z.enum(["official", "operator", "crowdsourced"]);
export type SourceTier = z.infer<typeof sourceTierSchema>;

export const sourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
  tier: sourceTierSchema,
  lastCheckedAt: z.string().datetime(),
  volatilityScore: z.number().min(0).max(1),
  summary: z.string().min(1)
});
export type Source = z.infer<typeof sourceSchema>;

export const sourcesCatalogSchema = z.array(sourceSchema);
export type SourcesCatalog = z.infer<typeof sourcesCatalogSchema>;

export const sourceRefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
  tier: sourceTierSchema,
  lastCheckedAt: z.string().datetime(),
  volatilityScore: z.number().min(0).max(1)
});
export type SourceRef = z.infer<typeof sourceRefSchema>;
