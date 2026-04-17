import { z } from "zod";
import { sourceRefSchema } from "./sources";

export const confidenceFactorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
  value: z.number().min(-1).max(1),
  weight: z.number().min(0).max(1),
  children: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        value: z.number().min(-1).max(1)
      })
    )
    .default([])
});
export type ConfidenceFactor = z.infer<typeof confidenceFactorSchema>;

export const confidenceBreakdownSchema = z.object({
  value: z.number().min(0).max(1),
  base: z.number().min(0).max(1),
  capsApplied: z.array(z.string().min(1)),
  factors: z.array(confidenceFactorSchema)
});
export type ConfidenceBreakdown = z.infer<typeof confidenceBreakdownSchema>;

export const trustSchema = z.object({
  confidence: z.number().min(0).max(1),
  confidenceBreakdown: confidenceBreakdownSchema,
  volatilityScore: z.number().min(0).max(1),
  sources: z.array(sourceRefSchema),
  lastCheckedAt: z.string().datetime()
});
export type Trust = z.infer<typeof trustSchema>;
