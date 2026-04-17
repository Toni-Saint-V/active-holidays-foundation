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
  SignalId
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
  cases: Case[];
  scenarios: ScenarioCard[];
  paths: Offer[];
  intakeQueue: IntakeQueue | null;
  intakePreview: IntakePreview | null;
  audit: AuditSnapshot | null;
  sources: Source[];
  decisions: DecisionLogEntry[];
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
};

function nowIso(): string {
  return new Date().toISOString();
}

export const useCaseStore = create<CaseStoreState>((set, get) => ({
  status: "idle",
  errorMessage: null,
  activeCaseId: null,
  activeCase: null,
  activeResult: null,
  cases: [],
  scenarios: [],
  paths: [],
  intakeQueue: null,
  intakePreview: null,
  audit: null,
  sources: [],
  decisions: [],

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
    set({ status: "loading", errorMessage: null });
    try {
      const [caseData, result, paths, intakeQueue, preview] = await Promise.all([
        apiClient.getCase(id),
        apiClient.getResult(id),
        apiClient.paths(id),
        apiClient.nextQuestion(id),
        apiClient.preview(id)
      ]);
      set({
        activeCaseId: id,
        activeCase: caseData,
        activeResult: result,
        paths,
        intakeQueue,
        intakePreview: preview,
        status: "ready"
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
      const response = await apiClient.patchSignals(id, signals);
      const [paths, intakeQueue, preview] = await Promise.all([
        apiClient.paths(id),
        apiClient.nextQuestion(id),
        apiClient.preview(id)
      ]);
      set({
        activeCase: response.case,
        activeResult: response.result,
        paths,
        intakeQueue,
        intakePreview: preview
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
      const response = await apiClient.recompute(id, preferences);
      const paths = await apiClient.paths(id);
      set({
        activeCase: response.case,
        activeResult: response.result,
        paths
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
      const response = await apiClient.overrideSignal(id, override);
      const [paths, intakeQueue] = await Promise.all([
        apiClient.paths(id),
        apiClient.nextQuestion(id)
      ]);
      set({
        activeCase: response.case,
        activeResult: response.result,
        paths,
        intakeQueue
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
      const response = await apiClient.recompute(id);
      set({ activeCase: response.case, activeResult: response.result });
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
  }
}));
