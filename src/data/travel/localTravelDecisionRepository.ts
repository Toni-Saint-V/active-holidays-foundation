import { travelDecisionSessionSchema, type TravelDecisionSession, type TravelIntakeSubmission } from "@shared/contracts";
import { buildTravelDecisionSession, type TravelDecisionRepository } from "@/domain/travel";

const STORAGE_KEY = "active-holidays.travel.latest-session";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export class LocalTravelDecisionRepository implements TravelDecisionRepository {
  async getLatestSession(): Promise<TravelDecisionSession | null> {
    const storage = getStorage();

    if (!storage) {
      return null;
    }

    const rawValue = storage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    try {
      const parsed = travelDecisionSessionSchema.safeParse(JSON.parse(rawValue));

      if (!parsed.success) {
        storage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsed.data;
    } catch {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  async submitIntake(
    input: TravelIntakeSubmission
  ): Promise<TravelDecisionSession> {
    const storage = getStorage();
    const session = buildTravelDecisionSession(input);

    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(session));
    }

    return session;
  }

  async clearLatestSession(): Promise<void> {
    const storage = getStorage();

    storage?.removeItem(STORAGE_KEY);
  }
}

export const localTravelDecisionRepository = new LocalTravelDecisionRepository();
