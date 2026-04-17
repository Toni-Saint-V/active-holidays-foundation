import { create } from "zustand";
import type { TravelDecisionSession, TravelIntakeSubmission } from "@shared/contracts";
import { localTravelDecisionRepository } from "@/data/travel/localTravelDecisionRepository";

type TravelFlowStatus = "idle" | "loading" | "submitting" | "ready" | "error";

type TravelFlowState = {
  activeSessionId: string | null;
  sessions: TravelDecisionSession[];
  status: TravelFlowStatus;
  errorMessage: string | null;
  hydrateWorkspace: () => Promise<void>;
  submitIntake: (input: TravelIntakeSubmission) => Promise<TravelDecisionSession>;
  setActiveSession: (sessionId: string) => Promise<void>;
  clearWorkspace: () => Promise<void>;
};

export const useTravelFlowStore = create<TravelFlowState>((set) => ({
  activeSessionId: null,
  sessions: [],
  status: "idle",
  errorMessage: null,
  async hydrateWorkspace() {
    set((state) => ({
      status: state.sessions.length > 0 ? state.status : "loading",
      errorMessage: null
    }));

    try {
      const workspace = await localTravelDecisionRepository.loadWorkspace();

      set({
        activeSessionId: workspace.activeSessionId,
        sessions: workspace.sessions,
        status: workspace.sessions.length > 0 ? "ready" : "idle",
        errorMessage: null
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить последнюю сессию."
      });
    }
  },
  async submitIntake(input) {
    set({ status: "submitting", errorMessage: null });

    try {
      const workspace = await localTravelDecisionRepository.submitIntake(input);
      const activeSession =
        workspace.sessions.find((session) => session.id === workspace.activeSessionId) ??
        workspace.sessions[0];

      set({
        activeSessionId: workspace.activeSessionId,
        sessions: workspace.sessions,
        status: "ready",
        errorMessage: null
      });

      return activeSession;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить анкету.";

      set({
        status: "error",
        errorMessage
      });

      throw error;
    }
  },
  async setActiveSession(sessionId) {
    try {
      const workspace = await localTravelDecisionRepository.setActiveSession(sessionId);
      set({
        activeSessionId: workspace.activeSessionId,
        sessions: workspace.sessions,
        status: workspace.sessions.length > 0 ? "ready" : "idle",
        errorMessage: null
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Не удалось переключить активную сессию."
      });
    }
  },
  async clearWorkspace() {
    const workspace = await localTravelDecisionRepository.clearWorkspace();
    set({
      activeSessionId: workspace.activeSessionId,
      sessions: workspace.sessions,
      status: "idle",
      errorMessage: null
    });
  }
}));
