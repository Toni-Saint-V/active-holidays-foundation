import type { TravelDecisionSession, TravelIntakeSubmission } from "@shared/contracts";

export interface TravelDecisionRepository {
  getLatestSession(): Promise<TravelDecisionSession | null>;
  submitIntake(input: TravelIntakeSubmission): Promise<TravelDecisionSession>;
  clearLatestSession(): Promise<void>;
}
