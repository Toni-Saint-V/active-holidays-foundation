import { z } from "zod";
import { caseSignalsSchema } from "./signals";
import { pathPreferencesSchema } from "./paths";
import { productTypeSchema } from "./product";

export const caseOverrideSchema = z.object({
  signalId: z.string().min(1),
  value: z.unknown(),
  reason: z.string().min(1),
  appliedAt: z.string().datetime()
});
export type CaseOverride = z.infer<typeof caseOverrideSchema>;

export const caseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  productType: productTypeSchema.default("travel"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  signals: caseSignalsSchema,
  overrides: z.array(caseOverrideSchema).default([]),
  preferences: pathPreferencesSchema.default([]),
  forkedFrom: z.string().nullable().default(null)
});
export type Case = z.infer<typeof caseSchema>;

export const casesSchema = z.array(caseSchema);
export type Cases = z.infer<typeof casesSchema>;

export const caseSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  productType: productTypeSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  signalCount: z.number().int().min(0),
  forkedFrom: z.string().nullable()
});
export type CaseSummary = z.infer<typeof caseSummarySchema>;
