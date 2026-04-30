import { describe, expect, it } from "vitest";
import type { HumanReviewLearningEvent } from "@shared/contracts";
import {
  HumanReviewLearningConflictError,
  HumanReviewLearningStore
} from "./humanReviewLearningStore";

function event(overrides: Partial<HumanReviewLearningEvent> = {}): HumanReviewLearningEvent {
  const requestId = overrides.requestId ?? "hr_case_1";
  const resolvedAt = overrides.resolvedAt ?? "2026-04-30T10:00:00.000Z";
  return {
    version: "human-review-learning.v1",
    ingestedVia: "terminal_resolution",
    ingestReason: "Captured automatically when operator resolved human review.",
    ingestedAt: resolvedAt,
    eventId: `hrl_${requestId}_${resolvedAt}`,
    requestId,
    caseId: "case_1",
    capturedAt: resolvedAt,
    resolvedAt,
    resolutionSummary: "Оператор закрыл проверку.",
    rootCause: "stale_evidence",
    rootCauseLabel: "Источники устарели",
    fixedSignals: [],
    evidenceGaps: [
      {
        id: "EVIDENCE_GATE:rule_1",
        label: "Evidence gate заблокировал rule_1.",
        detail: "Источник устарел.",
        severity: "high",
        ruleId: "rule_1"
      }
    ],
    verdictDelta: {
      before: "HUMAN_REVIEW",
      after: "HUMAN_REVIEW",
      changed: false
    },
    actionDelta: {
      beforeLabel: "Передать кейс менеджеру",
      afterLabel: "Передать кейс менеджеру",
      beforeType: "send_for_review",
      afterType: "send_for_review",
      changed: false
    },
    confidenceDelta: 0,
    postDecisionRecordId: "dec_case_1_1",
    sourceCatalogMutation: {
      allowed: false,
      applied: false
    },
    ...overrides
  };
}

describe("HumanReviewLearningStore", () => {
  it("dedupes exact replay and rejects conflicting natural-key replay", () => {
    const store = new HumanReviewLearningStore();
    const first = event();

    expect(store.ingest(first).inserted).toBe(true);
    expect(store.ingest(first).inserted).toBe(false);

    const wrongEventId = event({
      requestId: "hr_case_3",
      resolvedAt: "2026-04-30T10:03:00.000Z",
      eventId: "legacy_import_with_wrong_id"
    });
    expect(() => store.ingest(wrongEventId)).toThrow(HumanReviewLearningConflictError);

    expect(() =>
      store.ingest(
        event({
          resolutionSummary: "Другой payload с тем же requestId/resolvedAt."
        })
      )
    ).toThrow(HumanReviewLearningConflictError);
  });

  it("paginates event reads and keeps top blocker root-cause counts", () => {
    const store = new HumanReviewLearningStore();
    store.ingest(event());
    store.ingest(
      event({
        requestId: "hr_case_2",
        resolvedAt: "2026-04-30T10:01:00.000Z",
        eventId: "hrl_hr_case_2_2026-04-30T10:01:00.000Z",
        rootCause: "missing_signal",
        rootCauseLabel: "Не хватает входного сигнала"
      })
    );

    expect(store.page({ limit: 1, offset: 1 })).toMatchObject({
      totalEvents: 2,
      events: [{ requestId: "hr_case_2" }]
    });

    expect(store.topBlockers().blockers[0]).toMatchObject({
      id: "EVIDENCE_GATE:rule_1",
      count: 2,
      dominantRootCause: "missing_signal",
      rootCauseCounts: {
        stale_evidence: 1,
        missing_signal: 1
      }
    });
  });
});
