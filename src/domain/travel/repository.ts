import type { TravelDecisionSession, TravelIntakeSubmission } from "@shared/contracts";

export type TravelDecisionWorkspace = {
  activeSessionId: string | null;
  sessions: TravelDecisionSession[];
};

export interface TravelDecisionRepository {
  loadWorkspace(): Promise<TravelDecisionWorkspace>;
  submitIntake(input: TravelIntakeSubmission): Promise<TravelDecisionWorkspace>;
  setActiveSession(sessionId: string): Promise<TravelDecisionWorkspace>;
  clearWorkspace(): Promise<TravelDecisionWorkspace>;
}
