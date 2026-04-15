import { beforeEach, describe, expect, it } from "vitest";
import type { TravelIntakeSubmission } from "@shared/contracts";
import { LocalTravelDecisionRepository } from "@/data/travel/localTravelDecisionRepository";

const repository = new LocalTravelDecisionRepository();

const intake: TravelIntakeSubmission = {
  departureWindow: "more_than_three_months",
  passportStatus: "valid",
  destinationReadiness: "chosen",
  needsVisaSupport: false
};

describe("LocalTravelDecisionRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and loads the latest session", async () => {
    const savedSession = await repository.submitIntake(intake);
    const loadedSession = await repository.getLatestSession();

    expect(loadedSession).toEqual(savedSession);
  });

  it("drops invalid persisted storage safely", async () => {
    window.localStorage.setItem("active-holidays.travel.latest-session", "{");

    const loadedSession = await repository.getLatestSession();

    expect(loadedSession).toBeNull();
    expect(
      window.localStorage.getItem("active-holidays.travel.latest-session")
    ).toBeNull();
  });
});
