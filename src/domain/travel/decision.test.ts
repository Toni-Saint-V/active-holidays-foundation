import { describe, expect, it } from "vitest";
import type { TravelIntakeSubmission } from "@shared/contracts";
import { buildTravelDecisionResult } from "@/domain/travel";

function makeIntake(
  overrides: Partial<TravelIntakeSubmission> = {}
): TravelIntakeSubmission {
  return {
    departureWindow: "one_to_three_months",
    passportStatus: "valid",
    destinationReadiness: "chosen",
    needsVisaSupport: false,
    ...overrides
  };
}

describe("buildTravelDecisionResult", () => {
  it("returns a document blocker when passport is missing", () => {
    const result = buildTravelDecisionResult(
      makeIntake({ passportStatus: "missing" })
    );

    expect(result.outcome).toBe("needs_documents");
    expect(result.documentReadiness).toBe("blocked");
    expect(result.documentReadiness).toBe(result.documents.readiness);
    expect(result.trustReadiness).toBe(result.trust.readiness);
    expect(result.documents.items[0]?.status).toBe("blocked");
    expect(result.trust.readiness).toBe("blocked");
    expect(result.reasonCodes).toContain("passport_missing");
  });

  it("returns review when timeline is urgent and visa support is needed", () => {
    const result = buildTravelDecisionResult(
      makeIntake({
        departureWindow: "lt_30_days",
        needsVisaSupport: true
      })
    );

    expect(result.outcome).toBe("needs_review");
    expect(result.documentReadiness).toBe("attention_needed");
    expect(result.documentReadiness).toBe(result.documents.readiness);
    expect(result.trustReadiness).toBe(result.trust.readiness);
    expect(result.trust.readiness).toBe("attention_needed");
    expect(result.reasonCodes).toContain("visa_support_required");
    expect(result.nextSteps.some((step) => step.target === "trust")).toBe(true);
  });

  it("returns ready_to_plan for a stable intake", () => {
    const result = buildTravelDecisionResult(makeIntake());

    expect(result.outcome).toBe("ready_to_plan");
    expect(result.documentReadiness).toBe("ready");
    expect(result.trustReadiness).toBe("ready");
    expect(result.documentReadiness).toBe(result.documents.readiness);
    expect(result.trustReadiness).toBe(result.trust.readiness);
    expect(result.reasonCodes).toHaveLength(0);
    expect(result.nextSteps.every((step) => step.status === "done")).toBe(true);
    expect(result.trust.explanations[0]?.severity).toBe("info");
  });
});
