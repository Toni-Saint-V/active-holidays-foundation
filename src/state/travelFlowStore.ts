import { create } from "zustand";
import type { TravelDecisionSession, TravelIntakeSubmission } from "@shared/contracts";
import { localTravelDecisionRepository } from "@/data/travel/localTravelDecisionRepository";

type TravelFlowStatus = "idle" | "loading" | "submitting" | "ready" | "error";

type TravelFlowState = {
  latestSession: TravelDecisionSession | null;
  status: TravelFlowStatus;
  errorMessage: string | null;
  hydrateLatestSession: () => Promise<void>;
  submitIntake: (input: TravelIntakeSubmission) => Promise<TravelDecisionSession>;
  clearSession: () => Promise<void>;
};

export const useTravelFlowStore = create<TravelFlowState>((set) => ({
  latestSession: null,
  status: "idle",
  errorMessage: null,
  async hydrateLatestSession() {
    set((state) => ({
      status: state.latestSession ? state.status : "loading",
      errorMessage: null
    }));

    try {
      const latestSession = await localTravelDecisionRepository.getLatestSession();

      set({
        latestSession,
        status: latestSession ? "ready" : "idle",
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
      const latestSession = await localTravelDecisionRepository.submitIntake(input);

      set({
        latestSession,
        status: "ready",
        errorMessage: null
      });

      return latestSession;
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
  async clearSession() {
    await localTravelDecisionRepository.clearLatestSession();
    set({
      latestSession: null,
      status: "idle",
      errorMessage: null
    });
  }
}));
