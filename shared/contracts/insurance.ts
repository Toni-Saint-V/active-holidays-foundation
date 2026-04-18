import { z } from "zod";
import { iso2Schema } from "./signals";
import { offerScoringSchema } from "./paths";

export const insuranceTrustLevelSchema = z.enum(["a_plus", "a", "b"]);
export type InsuranceTrustLevel = z.infer<typeof insuranceTrustLevelSchema>;

export const insuranceIncludesSchema = z.object({
  covid: z.boolean(),
  chronic: z.boolean(),
  extreme_sports: z.boolean(),
  pregnancy: z.boolean(),
  evacuation: z.boolean(),
  dental_emergency: z.boolean()
});
export type InsuranceIncludes = z.infer<typeof insuranceIncludesSchema>;

export const insuranceProductIdSchema = z.enum([
  "alfa_standard",
  "alfa_plus",
  "ingos_schengen",
  "sogaz_premium",
  "tinkoff_basic",
  "rosgosstrakh_family"
]);
export type InsuranceProductId = z.infer<typeof insuranceProductIdSchema>;

export const insuranceProductDefinitionSchema = z.object({
  id: insuranceProductIdSchema,
  providerNameRu: z.string().min(1),
  productNameRu: z.string().min(1),
  coverageAmountEur: z.number().int().min(0).max(1_000_000),
  coverageAreas: z.array(z.enum(["schengen", "europe", "worldwide", "asia", "russia"])).min(1),
  includes: insuranceIncludesSchema,
  pricePerDayEur: z.number().min(0).max(100),
  minDurationDays: z.number().int().min(1).max(365),
  maxDurationDays: z.number().int().min(1).max(365),
  ageMin: z.number().int().min(0).max(120),
  ageMax: z.number().int().min(0).max(120),
  payoutSpeedDays: z.number().int().min(0).max(90),
  schengenCompliant: z.boolean(),
  acceptedByConsulates: z.array(iso2Schema),
  sourceId: z.string().min(1),
  trustLevel: insuranceTrustLevelSchema,
  description: z.string().min(1)
});
export type InsuranceProductDefinition = z.infer<typeof insuranceProductDefinitionSchema>;

export const insuranceProductsCatalogSchema = z.array(insuranceProductDefinitionSchema);
export type InsuranceProductsCatalog = z.infer<typeof insuranceProductsCatalogSchema>;

export const insuranceOfferSchema = insuranceProductDefinitionSchema
  .extend({ productType: z.literal("insurance_adult") })
  .merge(offerScoringSchema);
export type InsuranceOffer = z.infer<typeof insuranceOfferSchema>;
