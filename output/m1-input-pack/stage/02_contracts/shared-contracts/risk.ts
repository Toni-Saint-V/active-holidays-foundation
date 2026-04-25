import { z } from "zod";

export const riskSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type RiskSeverity = z.infer<typeof riskSeveritySchema>;

export const riskSchema = z.object({
  id: z.string().min(1),
  severity: riskSeveritySchema,
  label: z.string().min(1),
  detail: z.string().min(1),
  triggeredBy: z.array(z.string().min(1)),
  pulseAmplitude: z.number().min(0).max(1)
});
export type Risk = z.infer<typeof riskSchema>;

export const risksSchema = z.array(riskSchema);
export type Risks = z.infer<typeof risksSchema>;

export const criticalRiskSchema = riskSchema.nullable();
export type CriticalRisk = z.infer<typeof criticalRiskSchema>;
