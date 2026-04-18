import type { AuditStep, AuditStepName, AuditTrail } from "@shared/contracts";

export type AuditBuilder = {
  start(name: AuditStepName, inputs: string): (summary: string, notes?: string[], firedRuleIds?: string[]) => void;
  finalize(options: { caseId: string; preview: boolean }): AuditTrail;
  now(): string;
};

export function createAuditBuilder(nowFn: () => Date = () => new Date()): AuditBuilder {
  const steps: AuditStep[] = [];
  const startedAt = nowFn();
  let stepIndex = 0;

  return {
    start(name, inputs) {
      const beganAt = nowFn();
      const index = stepIndex;
      stepIndex += 1;
      return (summary, notes = [], firedRuleIds = []) => {
        const finishedAt = nowFn();
        steps.push({
          index,
          name,
          tookMs: Math.max(0, finishedAt.getTime() - beganAt.getTime()),
          inputsSummary: inputs,
          outputSummary: summary,
          firedRuleIds,
          notes
        });
      };
    },
    finalize({ caseId, preview }) {
      const finishedAt = nowFn();
      return {
        version: "rdc.v1",
        caseId,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        totalMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
        steps: steps.slice().sort((a, b) => a.index - b.index),
        preview
      };
    },
    now() {
      return nowFn().toISOString();
    }
  };
}
