import { z } from "zod";

export const verdictSchema = z.enum([
  "GO",
  "GO_WITH_CONDITIONS",
  "NOT_NOW",
  "HUMAN_REVIEW"
]);

export type Verdict = z.infer<typeof verdictSchema>;

export const verdictToneSchema = z.enum(["positive", "warning", "negative", "review"]);
export type VerdictTone = z.infer<typeof verdictToneSchema>;

export const verdictToneByVerdict: Record<Verdict, VerdictTone> = {
  GO: "positive",
  GO_WITH_CONDITIONS: "warning",
  NOT_NOW: "negative",
  HUMAN_REVIEW: "review"
};
