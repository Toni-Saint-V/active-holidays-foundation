import { z } from "zod";

export const signalIdSchema = z.enum([
  "citizenship",
  "destination",
  "travel_purpose",
  "passport_validity_months",
  "previous_schengen_visa",
  "timeline_weeks",
  "insurance_ok",
  "payment_cards_ok",
  "sanctions_exposure",
  "registration_on_arrival_ok",
  "documents_ready_count",
  "documents_required_count",
  "slot_available_weeks",
  // residency_es
  "income_monthly_eur",
  "income_source",
  "savings_eur",
  "has_dependents",
  "dependents_count",
  "spanish_language_level",
  "criminal_record_clean",
  "health_insurance_type",
  "target_residency_city",
  "intended_stay_years",
  "remote_employer_country",
  // insurance_adult
  "traveler_age",
  "has_chronic_conditions",
  "chronic_list",
  "planned_activities",
  "trip_duration_days",
  "coverage_amount_needed_eur",
  "schengen_compliance_required"
]);
export type SignalId = z.infer<typeof signalIdSchema>;

export const travelPurposeSchema = z.enum([
  "tourism",
  "business",
  "study",
  "family",
  "transit"
]);
export type TravelPurpose = z.infer<typeof travelPurposeSchema>;

export const iso2Schema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Код страны должен быть двухбуквенным ISO2 кодом.");

export const incomeSourceSchema = z.enum([
  "remote_tech",
  "remote_other",
  "freelance",
  "local_employment",
  "savings",
  "business_owner",
  "pension"
]);
export type IncomeSource = z.infer<typeof incomeSourceSchema>;

export const spanishLevelSchema = z.enum(["none", "A1", "A2", "B1", "B2", "C1"]);
export type SpanishLevel = z.infer<typeof spanishLevelSchema>;

export const healthInsuranceTypeSchema = z.enum([
  "none",
  "travel_only",
  "private_basic",
  "private_comprehensive",
  "public_es"
]);
export type HealthInsuranceType = z.infer<typeof healthInsuranceTypeSchema>;

export const residencyCitySchema = z.enum([
  "MAD",
  "BCN",
  "VAL",
  "SVQ",
  "BIO",
  "MLG"
]);
export type ResidencyCity = z.infer<typeof residencyCitySchema>;

export const chronicConditionSchema = z.enum([
  "hypertension",
  "diabetes_type2",
  "asthma",
  "heart_disease",
  "arthritis",
  "thyroid"
]);
export type ChronicCondition = z.infer<typeof chronicConditionSchema>;

export const activitySchema = z.enum([
  "city_tour",
  "beach",
  "ski",
  "diving",
  "hiking",
  "motorsport",
  "cycling"
]);
export type Activity = z.infer<typeof activitySchema>;

export const signalValueSchema = z.union([
  z.object({ id: z.literal("citizenship"), value: iso2Schema }),
  z.object({ id: z.literal("destination"), value: iso2Schema }),
  z.object({ id: z.literal("travel_purpose"), value: travelPurposeSchema }),
  z.object({ id: z.literal("passport_validity_months"), value: z.number().int().min(0).max(120) }),
  z.object({ id: z.literal("previous_schengen_visa"), value: z.boolean() }),
  z.object({ id: z.literal("timeline_weeks"), value: z.number().int().min(0).max(104) }),
  z.object({ id: z.literal("insurance_ok"), value: z.boolean() }),
  z.object({ id: z.literal("payment_cards_ok"), value: z.boolean() }),
  z.object({ id: z.literal("sanctions_exposure"), value: z.boolean() }),
  z.object({ id: z.literal("registration_on_arrival_ok"), value: z.boolean() }),
  z.object({ id: z.literal("documents_ready_count"), value: z.number().int().min(0).max(50) }),
  z.object({ id: z.literal("documents_required_count"), value: z.number().int().min(0).max(50) }),
  z.object({ id: z.literal("slot_available_weeks"), value: z.number().int().min(0).max(104) }),
  z.object({ id: z.literal("income_monthly_eur"), value: z.number().int().min(0).max(100000) }),
  z.object({ id: z.literal("income_source"), value: incomeSourceSchema }),
  z.object({ id: z.literal("savings_eur"), value: z.number().int().min(0).max(10_000_000) }),
  z.object({ id: z.literal("has_dependents"), value: z.boolean() }),
  z.object({ id: z.literal("dependents_count"), value: z.number().int().min(0).max(20) }),
  z.object({ id: z.literal("spanish_language_level"), value: spanishLevelSchema }),
  z.object({ id: z.literal("criminal_record_clean"), value: z.boolean() }),
  z.object({ id: z.literal("health_insurance_type"), value: healthInsuranceTypeSchema }),
  z.object({ id: z.literal("target_residency_city"), value: residencyCitySchema }),
  z.object({ id: z.literal("intended_stay_years"), value: z.number().int().min(1).max(30) }),
  z.object({ id: z.literal("remote_employer_country"), value: iso2Schema }),
  z.object({ id: z.literal("traveler_age"), value: z.number().int().min(0).max(120) }),
  z.object({ id: z.literal("has_chronic_conditions"), value: z.boolean() }),
  z.object({ id: z.literal("chronic_list"), value: z.array(chronicConditionSchema) }),
  z.object({ id: z.literal("planned_activities"), value: z.array(activitySchema) }),
  z.object({ id: z.literal("trip_duration_days"), value: z.number().int().min(1).max(365) }),
  z.object({ id: z.literal("coverage_amount_needed_eur"), value: z.number().int().min(0).max(1_000_000) }),
  z.object({ id: z.literal("schengen_compliance_required"), value: z.boolean() })
]);
export type SignalValue = z.infer<typeof signalValueSchema>;

export const signalSourceSchema = z.enum(["user", "autopilot", "override", "seed"]);
export type SignalSource = z.infer<typeof signalSourceSchema>;

export const signalRecordSchema = z.object({
  id: signalIdSchema,
  value: z.unknown(),
  source: signalSourceSchema,
  capturedAt: z.string().datetime()
});
export type SignalRecord = z.infer<typeof signalRecordSchema>;

export const caseSignalsSchema = z.array(signalRecordSchema);
export type CaseSignals = z.infer<typeof caseSignalsSchema>;

export const signalDefinitionSchema = z.object({
  id: signalIdSchema,
  label: z.string().min(1),
  kind: z.enum(["enum", "boolean", "number", "enum_multi"]),
  mandatory: z.boolean(),
  productTypes: z.array(z.enum(["travel", "residency_es", "insurance_adult"])),
  prompt: z.string().min(1),
  options: z
    .array(z.object({ value: z.string(), label: z.string().min(1) }))
    .optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  helper: z.string().min(1).optional()
});
export type SignalDefinition = z.infer<typeof signalDefinitionSchema>;

export const signalsRegistrySchema = z.array(signalDefinitionSchema);
export type SignalsRegistry = z.infer<typeof signalsRegistrySchema>;
