import { z } from "zod";
import { offerScoringSchema } from "./paths";
import { residencyCitySchema } from "./signals";

export const residencyProgramStatusSchema = z.enum(["active", "closed", "limited"]);
export type ResidencyProgramStatus = z.infer<typeof residencyProgramStatusSchema>;

export const residencyProgramIdSchema = z.enum([
  "nlv_espana",
  "dnv_espana",
  "golden_visa_espana",
  "arraigo_social",
  "student_residency_es"
]);
export type ResidencyProgramId = z.infer<typeof residencyProgramIdSchema>;

export const residencyProgramDefinitionSchema = z.object({
  id: residencyProgramIdSchema,
  nameRu: z.string().min(1),
  eligibilityRequirements: z.array(z.string().min(1)).min(1),
  minIncomeEur: z.number().int().min(0).max(100000),
  processingDays: z.number().int().min(0).max(720),
  costRangeEur: z.tuple([
    z.number().int().min(0).max(100_000),
    z.number().int().min(0).max(100_000)
  ]),
  consulateOptions: z.array(z.string().min(1)),
  successProbability: z.number().min(0).max(1),
  sourceId: z.string().min(1),
  status: residencyProgramStatusSchema,
  statusReason: z.string().min(1).optional(),
  preferredCities: z.array(residencyCitySchema).default([]),
  description: z.string().min(1)
});
export type ResidencyProgramDefinition = z.infer<typeof residencyProgramDefinitionSchema>;

export const residencyProgramsCatalogSchema = z.array(residencyProgramDefinitionSchema);
export type ResidencyProgramsCatalog = z.infer<typeof residencyProgramsCatalogSchema>;

export const residencyOfferSchema = residencyProgramDefinitionSchema
  .extend({ productType: z.literal("residency_es") })
  .merge(offerScoringSchema);
export type ResidencyOffer = z.infer<typeof residencyOfferSchema>;
