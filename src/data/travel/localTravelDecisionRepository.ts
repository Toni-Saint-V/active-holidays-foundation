import { z } from "zod";
import {
  travelDecisionSessionSchema,
  type TravelDecisionSession,
  type TravelIntakeSubmission
} from "@shared/contracts";
import {
  buildTravelDecisionSession,
  type TravelDecisionRepository,
  type TravelDecisionWorkspace
} from "@/domain/travel";

const STORAGE_KEY = "active-holidays.travel.workspace";
const MAX_STORED_SESSIONS = 5;
const SESSION_ID_PREFIX = "travel-session-";

const travelDecisionWorkspaceStorageSchema = z.object({
  activeSessionId: z.string().nullable(),
  sessions: z.array(travelDecisionSessionSchema).max(MAX_STORED_SESSIONS)
});

function createEmptyWorkspace(): TravelDecisionWorkspace {
  return {
    activeSessionId: null,
    sessions: []
  };
}

function getSessionSequence(sessionId: string): number | null {
  if (!sessionId.startsWith(SESSION_ID_PREFIX)) {
    return null;
  }

  const sequence = Number(sessionId.slice(SESSION_ID_PREFIX.length));

  return Number.isInteger(sequence) && sequence > 0 ? sequence : null;
}

function compareSessions(
  left: TravelDecisionSession,
  right: TravelDecisionSession
): number {
  const leftSequence = getSessionSequence(left.id);
  const rightSequence = getSessionSequence(right.id);

  if (leftSequence !== null && rightSequence !== null) {
    return rightSequence - leftSequence;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

function buildNextSessionId(sessions: TravelDecisionSession[]): string {
  const maxSequence = sessions.reduce((highestSequence, session) => {
    const sessionSequence = getSessionSequence(session.id);

    return sessionSequence === null || sessionSequence < highestSequence
      ? highestSequence
      : sessionSequence;
  }, 0);

  return `${SESSION_ID_PREFIX}${String(maxSequence + 1).padStart(4, "0")}`;
}

function normalizeWorkspace(
  workspace: TravelDecisionWorkspace
): TravelDecisionWorkspace {
  const sessions = workspace.sessions
    .slice()
    .sort(compareSessions)
    .slice(0, MAX_STORED_SESSIONS);

  const hasActiveSession = sessions.some(
    (session) => session.id === workspace.activeSessionId
  );

  return {
    activeSessionId: hasActiveSession ? workspace.activeSessionId : sessions[0]?.id ?? null,
    sessions
  };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export class LocalTravelDecisionRepository implements TravelDecisionRepository {
  private readWorkspace(storage: Storage): TravelDecisionWorkspace {
    const rawValue = storage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return createEmptyWorkspace();
    }

    try {
      const parsed = travelDecisionWorkspaceStorageSchema.safeParse(JSON.parse(rawValue));

      if (!parsed.success) {
        storage.removeItem(STORAGE_KEY);
        return createEmptyWorkspace();
      }

      return normalizeWorkspace(parsed.data);
    } catch {
      storage.removeItem(STORAGE_KEY);
      return createEmptyWorkspace();
    }
  }

  private writeWorkspace(
    storage: Storage | null,
    workspace: TravelDecisionWorkspace
  ): TravelDecisionWorkspace {
    const normalizedWorkspace = normalizeWorkspace(workspace);

    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(normalizedWorkspace));
    }

    return normalizedWorkspace;
  }

  async loadWorkspace(): Promise<TravelDecisionWorkspace> {
    const storage = getStorage();

    if (!storage) {
      return createEmptyWorkspace();
    }

    return this.readWorkspace(storage);
  }

  async submitIntake(
    input: TravelIntakeSubmission
  ): Promise<TravelDecisionWorkspace> {
    const storage = getStorage();
    const previousWorkspace = storage
      ? this.readWorkspace(storage)
      : createEmptyWorkspace();
    const session = buildTravelDecisionSession(input, {
      id: buildNextSessionId(previousWorkspace.sessions)
    });

    return this.writeWorkspace(storage, {
      activeSessionId: session.id,
      sessions: [session, ...previousWorkspace.sessions]
    });
  }

  async setActiveSession(sessionId: string): Promise<TravelDecisionWorkspace> {
    const storage = getStorage();
    const workspace = storage ? this.readWorkspace(storage) : createEmptyWorkspace();

    if (!workspace.sessions.some((session) => session.id === sessionId)) {
      return workspace;
    }

    return this.writeWorkspace(storage, {
      ...workspace,
      activeSessionId: sessionId
    });
  }

  async clearWorkspace(): Promise<TravelDecisionWorkspace> {
    const storage = getStorage();

    storage?.removeItem(STORAGE_KEY);

    return createEmptyWorkspace();
  }
}

export const localTravelDecisionRepository = new LocalTravelDecisionRepository();
