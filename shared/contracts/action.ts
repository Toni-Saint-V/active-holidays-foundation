import { z } from "zod";

export const actionTypeSchema = z.enum([
  "start_application",
  "book_appointment",
  "upload_missing_docs",
  "wait_for_window",
  "switch_path",
  "send_for_review",
  "collect_financial_docs",
  "apostille_documents",
  "schedule_consulate_appointment",
  "buy_policy",
  "request_medical_questionnaire",
  "upgrade_coverage"
]);
export type ActionType = z.infer<typeof actionTypeSchema>;

export const actionPrioritySchema = z.enum([
  "human_review",
  "blocking",
  "path",
  "advisory",
  "fallback"
]);
export type ActionPriority = z.infer<typeof actionPrioritySchema>;

export const nextActionSchema = z.object({
  type: actionTypeSchema,
  priority: actionPrioritySchema,
  label: z.string().min(1),
  detail: z.string().min(1),
  targetScreen: z.enum([
    "intake",
    "result",
    "documents",
    "trust",
    "human-review",
    "notifications",
    "profile",
    "residency-es",
    "insurance-adult"
  ]),
  triggeredBy: z.array(z.string().min(1))
});
export type NextAction = z.infer<typeof nextActionSchema>;
