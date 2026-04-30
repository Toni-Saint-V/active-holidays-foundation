import { z } from "zod";
import { evidenceStatusSchema } from "./evidence";
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

const TRUST_EVIDENCE_LEGACY_DEFAULTS = {
  evidenceStatus: "missing",
  freshnessStatus: "unknown",
  blockingReason: "Историческая запись создана до evidence gate; источник доверия неизвестен.",
  humanReviewReason: null
} as const;

export const freshnessStatusSchema = z.enum(["fresh", "stale", "unknown"]);

const strictTrustSchema = z.object({
  confidence: z.number().min(0).max(1),
  confidenceBreakdown: confidenceBreakdownSchema,
  evidenceStatus: evidenceStatusSchema,
  freshnessStatus: freshnessStatusSchema,
  blockingReason: z.string().min(1).nullable(),
  humanReviewReason: z.string().min(1).nullable(),
  volatilityScore: z.number().min(0).max(1),
  sources: z.array(sourceRefSchema),
  lastCheckedAt: z.string().datetime()
});

export const trustSchema = strictTrustSchema;
export type Trust = z.infer<typeof trustSchema>;

export const legacyTrustSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const trust = value as Record<string, unknown>;
  return {
    ...TRUST_EVIDENCE_LEGACY_DEFAULTS,
    ...trust
  };
}, strictTrustSchema);
