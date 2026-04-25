import { z } from "zod";
import { signalIdSchema } from "./signals";
import { productTypeSchema } from "./product";

export const ruleCategorySchema = z.enum([
  "document",
  "visa",
  "slot",
  "timeline",
  "sanctions",
  "advisory",
  "payment",
  "insurance",
  "path_strategy",
  "cost",
  "transit",
  "registration",
  "seasonal",
  "completeness",
  "residency_eligibility",
  "residency_program",
  "residency_compliance",
  "insurance_coverage",
  "insurance_age",
  "insurance_chronic",
  "insurance_compliance",
  "insurance_activities"
]);
export type RuleCategory = z.infer<typeof ruleCategorySchema>;

export const ruleOutputTypeSchema = z.enum([
  "blocker",
  "warning",
  "advisory",
  "path_boost",
  "path_penalty",
  "human_review_trigger",
  "confidence_modifier"
]);
export type RuleOutputType = z.infer<typeof ruleOutputTypeSchema>;

export const ruleOutputSchema = z.object({
  type: ruleOutputTypeSchema,
  pathIds: z.array(z.string()).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  delta: z.number().optional(),
  confidenceDelta: z.number().optional()
});
export type RuleOutput = z.infer<typeof ruleOutputSchema>;

export const ruleMetadataSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().min(0).max(100),
  category: ruleCategorySchema,
  productType: productTypeSchema.default("travel"),
  consumes_signal_ids: z.array(signalIdSchema),
  output_type: ruleOutputTypeSchema,
  output_value: ruleOutputSchema,
  explanation_template: z.string().min(1),
  title: z.string().min(1)
});
export type RuleMetadata = z.infer<typeof ruleMetadataSchema>;

export const rulesCatalogSchema = z.array(ruleMetadataSchema);
export type RulesCatalog = z.infer<typeof rulesCatalogSchema>;

export const ruleResultSchema = z.object({
  ruleId: z.string().min(1),
  fired: z.boolean(),
  category: ruleCategorySchema,
  priority: z.number().int().min(0).max(100),
  productType: productTypeSchema.default("travel"),
  output: ruleOutputSchema,
  consumedSignals: z.array(signalIdSchema),
  explanation: z.string().min(1)
});
export type RuleResult = z.infer<typeof ruleResultSchema>;

export const ruleResultsSchema = z.array(ruleResultSchema);
export type RuleResults = z.infer<typeof ruleResultsSchema>;
