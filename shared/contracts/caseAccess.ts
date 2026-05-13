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

// Candidate token comes from untrusted request payload and is validated by
// ownership guard to keep cross-case authorization failures on a consistent
// 403 boundary (instead of schema-driven 400 divergence).
export const candidateAccessTokenInputSchema = z.string().optional();
export type CandidateAccessTokenInput = z.infer<
  typeof candidateAccessTokenInputSchema
>;

export function isCrossCaseAccess(
  baselineCaseId: string,
  candidateCaseId: string
): boolean {
  return baselineCaseId !== candidateCaseId;
}

export function requiresCandidateAccessTokenForCrossCase(
  baselineCaseId: string,
  candidateCaseId: string
): boolean {
  return isCrossCaseAccess(baselineCaseId, candidateCaseId);
}

export function hasCandidateAccessToken(token: string | undefined): boolean {
  return Boolean(token?.trim());
}
