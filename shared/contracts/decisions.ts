import { z } from "zod";
import { verdictSchema } from "./verdict";

export const decisionLogEntrySchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  verdict: verdictSchema,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  kind: z.enum(["recompute", "override", "fork", "source_update"]),
  changedSignalIds: z.array(z.string()).default([]),
  recordedAt: z.string().datetime()
});
export type DecisionLogEntry = z.infer<typeof decisionLogEntrySchema>;

export const decisionsLogSchema = z.array(decisionLogEntrySchema);
export type DecisionsLog = z.infer<typeof decisionsLogSchema>;
