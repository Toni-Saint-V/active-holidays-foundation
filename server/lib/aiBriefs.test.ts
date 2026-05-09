import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildHumanReviewManagerBrief,
  buildRecommendationWhatIfBrief,
  resetAiBriefClientForTests
} from "./aiBriefs";

const previousApiKey = process.env.OPENAI_API_KEY;

describe("aiBriefs", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    resetAiBriefClientForTests();
  });

  afterEach(() => {
    if (previousApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousApiKey;
    }
    resetAiBriefClientForTests();
  });

  it("builds what-if brief in fallback mode", async () => {
    const response = await buildRecommendationWhatIfBrief({
      caseId: "s1-rf-italy",
      candidateCaseId: "s1-rf-italy-fork-1",
      offerId: "italy_d_digital_nomad",
      offerLabel: "Digital Nomad",
      comparison: {
        baseline: {
          outcome: {
            verdict: "GO",
            confidence: 0.74,
            primaryPathLabel: "Шенген C"
          }
        },
        candidate: {
          outcome: {
            verdict: "HUMAN_REVIEW",
            confidence: 0.61,
            primaryPathLabel: "Digital Nomad"
          },
          actionPlan: {
            headline: "Нужна ручная сверка по доходу.",
            detail: "Сначала проверьте, проходит ли нижний порог по доходу.",
            escalationReason: "Доход на границе порога.",
            steps: [
              {
                label: "Сверить доход",
                detail: "Проверить подтверждения за 6 месяцев."
              }
            ]
          }
        },
        delta: {
          confidenceDelta: -0.13,
          humanReviewChanged: true
        }
      } as any
    });

    expect(response.source).toBe("fallback");
    expect(response.caseId).toBe("s1-rf-italy");
    expect(response.candidateCaseId).toBe("s1-rf-italy-fork-1");
    expect(response.priorityActions.length).toBeGreaterThan(0);
  });

  it("builds manager brief in fallback mode", async () => {
    const response = await buildHumanReviewManagerBrief({
      caseData: {
        id: "s3-us-spb-business",
        title: "S3 — США → СПб (бизнес)",
        productType: "travel"
      } as any,
      request: {
        id: "hr_123",
        caseId: "s3-us-spb-business"
      } as any,
      packet: {
        reviewReason: "Evidence gate blocked R02.",
        operatorChecklist: [
          {
            title: "Проверить evidence",
            detail: "Источник устарел.",
            priority: "critical",
            source: "evidence"
          }
        ],
        doNotAutoDecideNotes: ["Не обещать пользователю исход до решения оператора."],
        scenario: null,
        currentResult: {
          verdict: "HUMAN_REVIEW",
          nextAction: {
            label: "Передать менеджеру"
          }
        },
        evidence: {
          evidenceStatus: "stale",
          freshnessStatus: "stale"
        }
      } as any,
      operatorContext: "Клиент просит срочно закрыть кейс"
    });

    expect(response.source).toBe("fallback");
    expect(response.caseId).toBe("s3-us-spb-business");
    expect(response.requestId).toBe("hr_123");
    expect(response.firstChecks.length).toBeGreaterThan(0);
    expect(response.userReplyDraft.length).toBeGreaterThan(10);
  });
});
