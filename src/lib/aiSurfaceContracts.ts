import { z } from 'zod'

export const countryCodeSchema = z.enum(['IT', 'ES', 'FR', 'GR'])
export const verdictKindSchema = z.enum(['GO', 'GO_WITH_CONDITIONS', 'NOT_NOW', 'HUMAN_REVIEW'])
export const aiSourceSchema = z.enum(['openai', 'fallback'])
export const aiQualitySchema = z.object({
  score: z.number().int().min(0).max(100),
  threshold: z.literal(90),
  status: z.enum(['expert_ready', 'fallback_upgraded']),
  label: z.string().min(1),
  criteria: z
    .array(
      z.object({
        name: z.string().min(1),
        score: z.number().int().min(0).max(100),
        evidence: z.string().min(1),
      })
    )
    .min(6)
    .max(6),
})

export const landingAiInputSchema = z.object({
  country: countryCodeSchema.nullable().optional(),
})

export const landingAiOutputSchema = z.object({
  source: aiSourceSchema,
  title: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(3).max(3),
  note: z.string().min(1),
  quality: aiQualitySchema,
})

export const intakeAiInputSchema = z.object({
  country: countryCodeSchema.nullable().optional(),
  purpose: z.string().min(1).max(120).optional(),
  refusalContext: z.string().min(4).max(1800),
})

export const intakeAiOutputSchema = z.object({
  source: aiSourceSchema,
  title: z.string().min(1),
  rewrite: z.string().min(1),
  proofPoints: z.array(z.string().min(1)).min(2).max(3),
  riskAngle: z.string().min(1),
  quality: aiQualitySchema,
})

export const resultAiInputSchema = z.object({
  country: countryCodeSchema,
  verdict: verdictKindSchema,
  daysToTrip: z.number().int().min(0).max(500),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  topRisk: z.string().min(1).max(600),
  missingItems: z.array(z.string().min(1)).max(6).optional(),
})

export const resultAiOutputSchema = z.object({
  source: aiSourceSchema,
  title: z.string().min(1),
  timeline: z
    .array(
      z.object({
        horizon: z.string().min(1),
        action: z.string().min(1),
      })
    )
    .min(3)
    .max(3),
  contrarian: z.string().min(1),
  tripwire: z.string().min(1),
  quality: aiQualitySchema,
})

export const humanReviewAiInputSchema = z.object({
  country: countryCodeSchema.nullable().optional(),
  verdict: verdictKindSchema.optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  fullName: z.string().min(1).max(120),
  contact: z.string().min(3).max(220),
  context: z.string().max(1800).optional(),
})

export const humanReviewAiOutputSchema = z.object({
  source: aiSourceSchema,
  title: z.string().min(1),
  urgency: z.string().min(1),
  blockers: z.array(z.string().min(1)).min(2).max(3),
  expertQuestions: z.array(z.string().min(1)).min(3).max(3),
  packetSummary: z.string().min(1),
  quality: aiQualitySchema,
})

export type LandingAiInput = z.infer<typeof landingAiInputSchema>
export type AiQuality = z.infer<typeof aiQualitySchema>
export type LandingAiOutput = z.infer<typeof landingAiOutputSchema>
export type IntakeAiInput = z.infer<typeof intakeAiInputSchema>
export type IntakeAiOutput = z.infer<typeof intakeAiOutputSchema>
export type ResultAiInput = z.infer<typeof resultAiInputSchema>
export type ResultAiOutput = z.infer<typeof resultAiOutputSchema>
export type HumanReviewAiInput = z.infer<typeof humanReviewAiInputSchema>
export type HumanReviewAiOutput = z.infer<typeof humanReviewAiOutputSchema>
