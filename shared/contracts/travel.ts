import { z } from "zod";

export const departureWindowSchema = z.enum([
  "lt_30_days",
  "one_to_three_months",
  "more_than_three_months"
]);

export const passportStatusSchema = z.enum([
  "valid",
  "needs_renewal",
  "missing"
]);

export const destinationReadinessSchema = z.enum([
  "chosen",
  "comparing",
  "undecided"
]);

export const travelIntakeSubmissionSchema = z.object({
  departureWindow: departureWindowSchema,
  passportStatus: passportStatusSchema,
  destinationReadiness: destinationReadinessSchema,
  needsVisaSupport: z.boolean()
});

export const travelDecisionOutcomeSchema = z.enum([
  "ready_to_plan",
  "needs_documents",
  "needs_review"
]);

export const travelDocumentReadinessSchema = z.enum([
  "ready",
  "attention_needed",
  "blocked"
]);

export const travelDecisionReasonCodeSchema = z.enum([
  "passport_missing",
  "passport_renewal",
  "destination_not_final",
  "visa_support_required",
  "urgent_timeline"
]);

export const travelDecisionSeveritySchema = z.enum(["blocker", "warning", "info"]);

export const travelDecisionSurfaceSchema = z.enum([
  "intake",
  "result",
  "documents",
  "trust"
]);

export const travelDecisionNextStepStatusSchema = z.enum(["pending", "done"]);

export const travelDecisionInsightSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  severity: travelDecisionSeveritySchema
});

export const travelDecisionNextStepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: travelDecisionNextStepStatusSchema,
  target: travelDecisionSurfaceSchema
});

export const travelDocumentItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: travelDocumentReadinessSchema,
  detail: z.string().min(1)
});

export const travelTrustCheckStatusSchema = z.enum(["clear", "review", "blocked"]);

export const travelTrustCheckSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: travelTrustCheckStatusSchema,
  detail: z.string().min(1)
});

export const travelTrustReadinessSchema = z.enum([
  "ready",
  "attention_needed",
  "blocked"
]);

export const travelDocumentsSectionSchema = z.object({
  readiness: travelDocumentReadinessSchema,
  summary: z.string().min(1),
  items: z.array(travelDocumentItemSchema).min(1)
});

export const travelTrustSectionSchema = z.object({
  readiness: travelTrustReadinessSchema,
  summary: z.string().min(1),
  checks: z.array(travelTrustCheckSchema).min(1),
  explanations: z.array(travelDecisionInsightSchema).min(1)
});

// `documents.readiness` and `trust.readiness` are the source of truth.
// Top-level readiness fields mirror them for summary/list consumers.
export const travelDecisionResultSchema = z.object({
  outcome: travelDecisionOutcomeSchema,
  documentReadiness: travelDocumentReadinessSchema,
  trustReadiness: travelTrustReadinessSchema,
  summary: z.string().min(1),
  nextStepLabel: z.string().min(1),
  reasonCodes: z.array(travelDecisionReasonCodeSchema),
  nextSteps: z.array(travelDecisionNextStepSchema).min(1),
  documents: travelDocumentsSectionSchema,
  trust: travelTrustSectionSchema
});

export const travelDecisionSessionSchema = z.object({
  id: z.string().min(1),
  intake: travelIntakeSubmissionSchema,
  result: travelDecisionResultSchema,
  createdAt: z.string().datetime()
});

export type DepartureWindow = z.infer<typeof departureWindowSchema>;
export type PassportStatus = z.infer<typeof passportStatusSchema>;
export type DestinationReadiness = z.infer<typeof destinationReadinessSchema>;
export type TravelIntakeSubmission = z.infer<typeof travelIntakeSubmissionSchema>;
export type TravelDecisionOutcome = z.infer<typeof travelDecisionOutcomeSchema>;
export type TravelDecisionReasonCode = z.infer<typeof travelDecisionReasonCodeSchema>;
export type TravelDecisionSeverity = z.infer<typeof travelDecisionSeveritySchema>;
export type TravelDecisionSurface = z.infer<typeof travelDecisionSurfaceSchema>;
export type TravelDecisionNextStepStatus = z.infer<
  typeof travelDecisionNextStepStatusSchema
>;
export type TravelDecisionInsight = z.infer<typeof travelDecisionInsightSchema>;
export type TravelDecisionNextStep = z.infer<typeof travelDecisionNextStepSchema>;
export type TravelDocumentItem = z.infer<typeof travelDocumentItemSchema>;
export type TravelTrustCheckStatus = z.infer<typeof travelTrustCheckStatusSchema>;
export type TravelTrustCheck = z.infer<typeof travelTrustCheckSchema>;
export type TravelTrustReadiness = z.infer<typeof travelTrustReadinessSchema>;
export type TravelDocumentsSection = z.infer<typeof travelDocumentsSectionSchema>;
export type TravelTrustSection = z.infer<typeof travelTrustSectionSchema>;
export type TravelDecisionResult = z.infer<typeof travelDecisionResultSchema>;
export type TravelDecisionSession = z.infer<typeof travelDecisionSessionSchema>;
