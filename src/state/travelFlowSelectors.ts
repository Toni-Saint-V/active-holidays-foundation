import type { TravelDecisionSession } from "@shared/contracts";

export function getActiveTravelSession(
  sessions: TravelDecisionSession[],
  activeSessionId: string | null
): TravelDecisionSession | null {
  return (
    sessions.find((session) => session.id === activeSessionId) ??
    sessions[0] ??
    null
  );
}
