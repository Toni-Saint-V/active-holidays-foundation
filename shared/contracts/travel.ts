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

export const travelDecisionChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  done: z.boolean()
});

export const travelDecisionResultSchema = z.object({
  outcome: travelDecisionOutcomeSchema,
  documentReadiness: travelDocumentReadinessSchema,
  summary: z.string().min(1),
  nextStepLabel: z.string().min(1),
  reasonCodes: z.array(travelDecisionReasonCodeSchema),
  checklist: z.array(travelDecisionChecklistItemSchema)
});

export const travelDecisionSessionSchema = z.object({
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
export type TravelDecisionResult = z.infer<typeof travelDecisionResultSchema>;
export type TravelDecisionSession = z.infer<typeof travelDecisionSessionSchema>;
