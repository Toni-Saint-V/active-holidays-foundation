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

function makeIntake(
  overrides: Partial<TravelIntakeSubmission> = {}
): TravelIntakeSubmission {
  return {
    ...intake,
    ...overrides
  };
}

describe("LocalTravelDecisionRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores a workspace with an active session and history", async () => {
    const firstWorkspace = await repository.submitIntake(makeIntake());
    const secondWorkspace = await repository.submitIntake(
      makeIntake({ destinationReadiness: "comparing" })
    );
    const loadedWorkspace = await repository.loadWorkspace();

    expect(firstWorkspace.sessions).toHaveLength(1);
    expect(secondWorkspace.sessions).toHaveLength(2);
    expect(loadedWorkspace.activeSessionId).toBe(secondWorkspace.activeSessionId);
    expect(loadedWorkspace.sessions).toHaveLength(2);
    expect(loadedWorkspace.sessions.map((session) => session.id)).toEqual([
      "travel-session-0002",
      "travel-session-0001"
    ]);
  });

  it("drops invalid persisted storage safely", async () => {
    window.localStorage.setItem("active-holidays.travel.workspace", "{");

    const loadedWorkspace = await repository.loadWorkspace();

    expect(loadedWorkspace.sessions).toEqual([]);
    expect(loadedWorkspace.activeSessionId).toBeNull();
    expect(window.localStorage.getItem("active-holidays.travel.workspace")).toBeNull();
  });

  it("allows switching the active session inside history", async () => {
    const firstWorkspace = await repository.submitIntake(makeIntake());
    const secondWorkspace = await repository.submitIntake(
      makeIntake({ passportStatus: "needs_renewal" })
    );

    const switchedWorkspace = await repository.setActiveSession(
      firstWorkspace.activeSessionId ?? ""
    );

    expect(secondWorkspace.activeSessionId).not.toBe(firstWorkspace.activeSessionId);
    expect(switchedWorkspace.activeSessionId).toBe(firstWorkspace.activeSessionId);
  });

  it("caps stored history and keeps newest sessions first", async () => {
    for (let index = 0; index < 7; index += 1) {
      await repository.submitIntake(
        makeIntake({
          destinationReadiness:
            index % 3 === 0
              ? "chosen"
              : index % 3 === 1
                ? "comparing"
                : "undecided",
          needsVisaSupport: index % 2 === 0
        })
      );
    }

    const workspace = await repository.loadWorkspace();

    expect(workspace.sessions).toHaveLength(5);
    expect(workspace.activeSessionId).toBe("travel-session-0007");
    expect(workspace.sessions.map((session) => session.id)).toEqual([
      "travel-session-0007",
      "travel-session-0006",
      "travel-session-0005",
      "travel-session-0004",
      "travel-session-0003"
    ]);
  });
});
