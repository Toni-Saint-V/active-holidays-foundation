import { z } from "zod";
import { iso2Schema } from "./signals";

export const pathKindSchema = z.enum([
  "domestic",
  "visa_free",
  "visa_on_arrival",
  "e_visa",
  "consular_visa",
  "transit"
]);
export type PathKind = z.infer<typeof pathKindSchema>;

export const pathRequirementSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  mandatory: z.boolean()
});
export type PathRequirement = z.infer<typeof pathRequirementSchema>;

export const pathDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: pathKindSchema,
  citizenship: iso2Schema,
  destination: iso2Schema,
  processingWeeks: z.number().int().min(0).max(52),
  estCostRub: z.number().int().min(0).max(10_000_000),
  description: z.string().min(1),
  requirements: z.array(pathRequirementSchema).min(1)
});
export type PathDefinition = z.infer<typeof pathDefinitionSchema>;

export const pathsCatalogSchema = z.array(pathDefinitionSchema);
export type PathsCatalog = z.infer<typeof pathsCatalogSchema>;

export const offerScoringSchema = z.object({
  score: z.number(),
  baseScore: z.number(),
  ruleBoosts: z.array(z.object({ ruleId: z.string(), delta: z.number() })),
  blockers: z.array(z.object({ ruleId: z.string(), text: z.string().min(1) })),
  eligible: z.boolean()
});
export type OfferScoring = z.infer<typeof offerScoringSchema>;

export const travelOfferSchema = pathDefinitionSchema
  .extend({ productType: z.literal("travel") })
  .merge(offerScoringSchema);
export type TravelOffer = z.infer<typeof travelOfferSchema>;

// Keep rankedPathSchema alias for backward-compatible imports.
export const rankedPathSchema = travelOfferSchema;
export type RankedPath = TravelOffer;

export const rankedPathsSchema = z.array(rankedPathSchema);
export type RankedPaths = z.infer<typeof rankedPathsSchema>;

export const pathPreferenceSchema = z.object({
  id: z.string().min(1),
  weight: z.number().min(-1).max(1)
});
export type PathPreference = z.infer<typeof pathPreferenceSchema>;

export const pathPreferencesSchema = z.array(pathPreferenceSchema);
export type PathPreferences = z.infer<typeof pathPreferencesSchema>;
