import { describe, expect, it } from "vitest";
import {
  hasCandidateAccessToken,
  isCrossCaseAccess,
  requiresCandidateAccessTokenForCrossCase
} from "./caseAccess";

describe("case access helpers", () => {
  it("marks candidate access as required only for cross-case requests", () => {
    expect(isCrossCaseAccess("case-a", "case-a")).toBe(false);
    expect(isCrossCaseAccess("case-a", "case-b")).toBe(true);
    expect(requiresCandidateAccessTokenForCrossCase("case-a", "case-a")).toBe(false);
    expect(requiresCandidateAccessTokenForCrossCase("case-a", "case-b")).toBe(true);
  });

  it("accepts only non-empty candidate access tokens", () => {
    expect(hasCandidateAccessToken(undefined)).toBe(false);
    expect(hasCandidateAccessToken("")).toBe(false);
    expect(hasCandidateAccessToken("   ")).toBe(false);
    expect(hasCandidateAccessToken("token-123")).toBe(true);
  });
});
