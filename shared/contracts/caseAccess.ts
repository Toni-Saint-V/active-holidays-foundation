import { z } from "zod";

export const CASE_ACCESS_HEADER = "x-active-holidays-case-access" as const;
export const DEV_SEED_ACCESS_HEADER = "x-active-holidays-dev-seed-access" as const;

export const caseAccessCredentialSchema = z.object({
  caseId: z.string().min(1),
  accessToken: z.string().min(24),
  issuedAt: z.string().datetime(),
  transport: z.literal(CASE_ACCESS_HEADER)
});
export type CaseAccessCredential = z.infer<typeof caseAccessCredentialSchema>;
