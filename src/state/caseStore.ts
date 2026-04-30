import { create } from "zustand";
import type {
  Case,
  DecisionLogEntry,
  IntakePreview,
  IntakeQueue,
  Offer,
  PathPreference,
  ResultPayload,
  Source,
  AuditTrail,
  CaseSignals,
  CaseOverride,
  SignalId,
  ScenarioLabPayload,
  HumanReviewChannel,
  HumanReviewCasePacket,
  HumanReviewRequest
} from "@shared/contracts";
import { apiClient, type ScenarioCard } from "@/lib/apiClient";

type Status = "idle" | "loading" | "ready" | "error";

type AuditSnapshot = {
  trail: AuditTrail;
  decisions: DecisionLogEntry[];
};

type CaseStoreState = {
  status: Status;
  errorMessage: string | null;
  activeCaseId: string | null;
  activeCase: Case | null;
  activeResult: ResultPayload | null;
  activeScenarioLab: ScenarioLabPayload | null;
  cases: Case[];
  scenarios: ScenarioCard[];
  paths: Offer[];
  intakeQueue: IntakeQueue | null;
  intakePreview: IntakePreview | null;
  audit: AuditSnapshot | null;
  activeHumanReview: HumanReviewRequest | null;
  activeHumanReviewPacket: HumanReviewCasePacket | null;
  humanReviewCaseId: string | null;
  humanReviewRequestToken: number;
  sources: Source[];
  decisions: DecisionLogEntry[];
  scenarioLabStatus: Status;
  scenarioLabError: string | null;
  humanReviewStatus: Status;
  humanReviewError: string | null;
  bootstrap: () => Promise<void>;
  loadCase: (id: string) => Promise<void>;
  patchSignal: (id: string, signalId: SignalId, value: unknown) => Promise<void>;
  patchSignals: (id: string, signals: CaseSignals) => Promise<void>;
  setPreferences: (id: string, preferences: PathPreference[]) => Promise<void>;
  overrideSignal: (id: string, override: CaseOverride) => Promise<void>;
  recompute: (id: string) => Promise<void>;
  fork: (id: string, title?: string) => Promise<string | null>;
  refreshIntake: (id: string) => Promise<void>;
  loadAudit: (id: string) => Promise<void>;
  loadHumanReview: (id: string) => Promise<void>;
  loadHumanReviewPacket: (id: string) => Promise<void>;
  submitHumanReview: (
    id: string,
    payload: { channel: HumanReviewChannel; contact: string; message: string }
  ) => Promise<{ reused: boolean }>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function scenarioLabRequest(id: string, fallbackMessage: string) {
  return apiClient
    .decisionScenarioLab(id)
    .then((lab) => ({ ok: true as const, lab }))
    .catch((error) => ({
      ok: false as const,
      errorMessage: error instanceof Error ? error.message : fallbackMessage
    }));
}

function preservedScenarioLab(
  current: ScenarioLabPayload | null,
  caseId: string,
  next:
    | { ok: true; lab: ScenarioLabPayload }
    | { ok: false; errorMessage: string }
) {
  if (next.ok) return next.lab;
  return current?.caseId === caseId ? current : null;
}

export const useCaseStore = create<CaseStoreState>((set, get) => ({
  status: "idle",
  errorMessage: null,
  activeCaseId: null,
  activeCase: null,
  activeResult: null,
  activeScenarioLab: null,
  cases: [],
  scenarios: [],
  paths: [],
  intakeQueue: null,
  intakePreview: null,
  audit: null,
  activeHumanReview: null,
  activeHumanReviewPacket: null,
  humanReviewCaseId: null,
  humanReviewRequestToken: 0,
  sources: [],
  decisions: [],
  scenarioLabStatus: "idle",
  scenarioLabError: null,
  humanReviewStatus: "idle",
  humanReviewError: null,

  async bootstrap() {
    set({ status: "loading", errorMessage: null });
    try {
      const [scenarios, sources, decisions] = await Promise.all([
        apiClient.scenarios(),
        apiClient.sources(),
        apiClient.decisions()
      ]);
      set({ scenarios, sources, decisions, status: "ready" });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось загрузить начальные данные."
      });
    }
  },

  async loadCase(id) {
    const currentLab = get().activeScenarioLab;
    const currentReview = get().activeHumanReview;
    const currentPacket = get().activeHumanReviewPacket;
    const nextHumanReviewToken = get().humanReviewRequestToken + 1;
    set({
      status: "loading",
      errorMessage: null,
      scenarioLabStatus: "loading",
      scenarioLabError: null,
      activeScenarioLab: currentLab?.caseId === id ? currentLab : null,
      activeHumanReview: currentReview?.caseId === id ? currentReview : null,
      activeHumanReviewPacket: currentPacket?.case.id === id ? currentPacket : null,
      humanReviewCaseId: id,
      humanReviewRequestToken: nextHumanReviewToken,
      humanReviewStatus: currentReview?.caseId === id ? get().humanReviewStatus : "idle",
      humanReviewError: null
    });
    try {
      const [caseData, result, paths, intakeQueue, preview, scenarioLabResult] = await Promise.all([
        apiClient.getCase(id),
        apiClient.getResult(id),
        apiClient.paths(id),
        apiClient.nextQuestion(id),
        apiClient.preview(id),
        scenarioLabRequest(id, "Не удалось собрать сценарную лабораторию.")
      ]);
      set({
        activeCaseId: id,
        activeCase: caseData,
        activeResult: result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        paths,
        intakeQueue,
        intakePreview: preview,
        status: "ready",
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage,
        humanReviewCaseId: id,
        humanReviewError: null
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось загрузить кейс."
      });
    }
  },

  async patchSignal(id, signalId, value) {
    await get().patchSignals(id, [
      { id: signalId, value, source: "user", capturedAt: nowIso() }
    ]);
  },

  async patchSignals(id, signals) {
    try {
      const currentLab = get().activeScenarioLab;
      set({ scenarioLabStatus: "loading", scenarioLabError: null });
      const response = await apiClient.patchSignals(id, signals);
      const [paths, intakeQueue, preview, scenarioLabResult] = await Promise.all([
        apiClient.paths(id),
        apiClient.nextQuestion(id),
        apiClient.preview(id),
        scenarioLabRequest(id, "Не удалось обновить сценарную лабораторию.")
      ]);
      set({
        activeCase: response.case,
        activeResult: response.result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        paths,
        intakeQueue,
        intakePreview: preview,
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось сохранить сигналы."
      });
    }
  },

  async setPreferences(id, preferences) {
    try {
      const currentLab = get().activeScenarioLab;
      set({ scenarioLabStatus: "loading", scenarioLabError: null });
      const response = await apiClient.recompute(id, preferences);
      const [paths, scenarioLabResult] = await Promise.all([
        apiClient.paths(id),
        scenarioLabRequest(id, "Не удалось обновить сценарную лабораторию.")
      ]);
      set({
        activeCase: response.case,
        activeResult: response.result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        paths,
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось применить предпочтения."
      });
    }
  },

  async overrideSignal(id, override) {
    try {
      const currentLab = get().activeScenarioLab;
      set({ scenarioLabStatus: "loading", scenarioLabError: null });
      const response = await apiClient.overrideSignal(id, override);
      const [paths, intakeQueue, scenarioLabResult] = await Promise.all([
        apiClient.paths(id),
        apiClient.nextQuestion(id),
        scenarioLabRequest(id, "Не удалось обновить сценарную лабораторию.")
      ]);
      set({
        activeCase: response.case,
        activeResult: response.result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        paths,
        intakeQueue,
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось применить override."
      });
    }
  },

  async recompute(id) {
    try {
      const currentLab = get().activeScenarioLab;
      set({ scenarioLabStatus: "loading", scenarioLabError: null });
      const response = await apiClient.recompute(id);
      const scenarioLabResult = await scenarioLabRequest(
        id,
        "Не удалось обновить сценарную лабораторию."
      );
      set({
        activeCase: response.case,
        activeResult: response.result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось пересчитать решение."
      });
    }
  },

  async fork(id, title) {
    try {
      const response = await apiClient.fork(id, title);
      set((state) => ({ cases: [response.case, ...state.cases] }));
      return response.case.id;
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось форкнуть кейс."
      });
      return null;
    }
  },

  async refreshIntake(id) {
    try {
      const [queue, preview] = await Promise.all([
        apiClient.nextQuestion(id),
        apiClient.preview(id)
      ]);
      set({ intakeQueue: queue, intakePreview: preview });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось обновить очередь вопросов."
      });
    }
  },

  async loadAudit(id) {
    try {
      const audit = await apiClient.audit(id);
      set({ audit });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось загрузить аудит."
      });
    }
  },

  async loadHumanReview(id) {
    const requestToken = get().humanReviewRequestToken + 1;
    set({
      humanReviewStatus: "loading",
      humanReviewError: null,
      humanReviewCaseId: id,
      humanReviewRequestToken: requestToken
    });
    try {
      const request = await apiClient.humanReview(id);
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              activeHumanReview: request,
              activeHumanReviewPacket: request ? state.activeHumanReviewPacket : null,
              humanReviewStatus: "ready",
              humanReviewError: null
            }
          : {}
      );
    } catch (error) {
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              humanReviewStatus: "error",
              humanReviewError:
                error instanceof Error ? error.message : "Не удалось загрузить ручную проверку."
            }
          : {}
      );
    }
  },

  async loadHumanReviewPacket(id) {
    const requestToken = get().humanReviewRequestToken + 1;
    set({
      humanReviewStatus: "loading",
      humanReviewError: null,
      humanReviewCaseId: id,
      humanReviewRequestToken: requestToken
    });
    try {
      const packet = await apiClient.humanReviewCasePacket(id);
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              activeHumanReviewPacket: packet,
              humanReviewStatus: "ready",
              humanReviewError: null
            }
          : {}
      );
    } catch (error) {
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              activeHumanReviewPacket: null,
              humanReviewStatus: "error",
              humanReviewError:
                error instanceof Error ? error.message : "Не удалось загрузить пакет оператора."
            }
          : {}
      );
    }
  },

  async submitHumanReview(id, payload) {
    const requestToken = get().humanReviewRequestToken + 1;
    set({
      humanReviewStatus: "loading",
      humanReviewError: null,
      humanReviewCaseId: id,
      humanReviewRequestToken: requestToken
    });
    try {
      const response = await apiClient.submitHumanReview(id, payload);
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              activeHumanReview: response.request,
              activeHumanReviewPacket: null,
              humanReviewStatus: "ready",
              humanReviewError: null
            }
          : {}
      );
      return { reused: response.reused };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось отправить ручную проверку.";
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              humanReviewStatus: "error",
              humanReviewError: message
            }
          : {}
      );
      throw error instanceof Error ? error : new Error(message);
    }
  }
}));
