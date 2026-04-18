import { z } from "zod";
import { iso2Schema } from "./signals";

export const visaRegimeSchema = z.enum([
  "visa_free",
  "visa_on_arrival",
  "e_visa",
  "consular_visa",
  "not_admissible"
]);
export type VisaRegime = z.infer<typeof visaRegimeSchema>;

export const visaRuleSchema = z.object({
  citizenship: iso2Schema,
  destination: iso2Schema,
  regime: visaRegimeSchema,
  maxStayDays: z.number().int().min(0).max(365),
  processingWeeks: z.number().int().min(0).max(52),
  feeEur: z.number().int().min(0).max(5000),
  registrationRequired: z.boolean(),
  sourceId: z.string().min(1),
  note: z.string().min(1)
});
export type VisaRule = z.infer<typeof visaRuleSchema>;

export const visaRulesSchema = z.array(visaRuleSchema);
export type VisaRules = z.infer<typeof visaRulesSchema>;

export const countryRestrictionSchema = z.object({
  citizenship: iso2Schema,
  destination: iso2Schema,
  severity: z.enum(["advisory", "payment", "sanctions", "blocking"]),
  label: z.string().min(1),
  detail: z.string().min(1),
  sourceId: z.string().min(1)
});
export type CountryRestriction = z.infer<typeof countryRestrictionSchema>;

export const countryRestrictionsSchema = z.array(countryRestrictionSchema);
export type CountryRestrictions = z.infer<typeof countryRestrictionsSchema>;
