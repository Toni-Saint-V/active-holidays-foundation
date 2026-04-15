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
    expect(result.reasonCodes).toContain("visa_support_required");
  });

  it("returns ready_to_plan for a stable intake", () => {
    const result = buildTravelDecisionResult(makeIntake());

    expect(result.outcome).toBe("ready_to_plan");
    expect(result.documentReadiness).toBe("ready");
    expect(result.reasonCodes).toHaveLength(0);
  });
});
