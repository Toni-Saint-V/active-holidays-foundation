import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it, vi } from "vitest";
import type { Express } from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import {
  CASE_ACCESS_HEADER,
  resultPayloadSchema,
  recommendationWhatIfBriefSchema,
  recommendationDetailSchema,
  recommendationShortlistSchema
} from "@shared/contracts";
import { createApp } from "../index";
import { getCatalogsOrThrow, replaceCatalogsForTest } from "../lib/catalogs";
import { resetRecommendationClientForTests } from "../lib/recommendations";
import { freshCatalogsForRouteTest } from "./testFreshCatalogs";
import { installStableRouteTestClock } from "./routeTestClock";

const { createResponseMock } = vi.hoisted(() => ({
  createResponseMock: vi.fn()
}));

vi.mock("openai", () => {
  class OpenAIMock {
    readonly responses = {
      create: createResponseMock
    };
  }

  return { default: OpenAIMock };
});

let app: Express;
let server: Server;
let baseUrl = "";
const previousApiKey = process.env.OPENAI_API_KEY;
let restoreFreshCatalogs: (() => void) | null = null;

beforeAll(async () => {
  delete process.env.OPENAI_API_KEY;
  app = await createApp();
  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

installStableRouteTestClock();

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  restoreFreshCatalogs = replaceCatalogsForTest(
    freshCatalogsForRouteTest(getCatalogsOrThrow())
  );
  createResponseMock.mockReset();
  resetRecommendationClientForTests();
});

afterEach(() => {
  restoreFreshCatalogs?.();
  restoreFreshCatalogs = null;
});

afterAll(async () => {
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  if (previousApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
    return;
  }
  process.env.OPENAI_API_KEY = previousApiKey;
});

async function requestJson(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body
        ? {
            "content-type": "application/json"
          }
        : {}),
      connection: "close",
      ...(headers ?? {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const json = text.length > 0 ? JSON.parse(text) : null;
  return { status: response.status, json } as const;
}

describe("recommendation HTTP surface", () => {
  it("returns a structured shortlist for the current main recommendation flow", async () => {
    const response = await requestJson(
      "GET",
      "/api/cases/s1-rf-italy/recommendations/shortlist"
    );

    expect(response.status).toBe(200);

    const parsed = recommendationShortlistSchema.parse(response.json);
    expect(parsed.source).toBe("rule_based");
    expect(parsed.items.length).toBeGreaterThan(0);
    expect(parsed.recommendedOfferId).toBeTruthy();
    expect(parsed.uncertainty.reasons).toContain("assistant_limited");
    expect(JSON.stringify(parsed)).not.toMatch(
      /confidence|score|quality|\/100|\d{1,3}%|fallback|openai|provider|deterministic_recovery|generation_unavailable|generation_unusable/i
    );
  });

  it("returns a structured detail view for a shortlisted offer", async () => {
    const shortlist = await requestJson(
      "GET",
      "/api/cases/s1-rf-italy/recommendations/shortlist"
    );
    const offerId = shortlist.json.items[0].offerId as string;

    const response = await requestJson(
      "POST",
      "/api/cases/s1-rf-italy/recommendations/detail",
      { offerId }
    );

    expect(response.status).toBe(200);

    const parsed = recommendationDetailSchema.parse(response.json);
    expect(parsed.offerId).toBe(offerId);
    expect(parsed.source).toBe("rule_based");
    expect(parsed.whyThisFits.length).toBeGreaterThan(0);
    expect(parsed.uncertainty.reasons).toContain("assistant_limited");
    expect(JSON.stringify(parsed)).not.toMatch(
      /confidence|score|quality|\/100|\d{1,3}%|fallback|openai|provider|deterministic_recovery|generation_unavailable|generation_unusable/i
    );
  });

  it("does not expose baseline nextAction steps in alternative detail", async () => {
    const caseId = "s5-rf-italy-insurance";
    const resultResponse = await requestJson("GET", `/api/cases/${caseId}/result`);
    expect(resultResponse.status).toBe(200);
    const result = resultPayloadSchema.parse(resultResponse.json);

    const shortlistResponse = await requestJson(
      "GET",
      `/api/cases/${caseId}/recommendations/shortlist`
    );
    expect(shortlistResponse.status).toBe(200);
    const shortlist = recommendationShortlistSchema.parse(shortlistResponse.json);
    const alternative = shortlist.items.find((item) => item.offerId !== shortlist.recommendedOfferId);
    expect(alternative).toBeTruthy();

    const detailResponse = await requestJson(
      "POST",
      `/api/cases/${caseId}/recommendations/detail`,
      { offerId: alternative?.offerId }
    );
    expect(detailResponse.status).toBe(200);
    const detail = recommendationDetailSchema.parse(detailResponse.json);

    expect(detail.nextSteps).not.toContain(result.nextAction.label);
    expect(detail.nextSteps).not.toContain(result.nextAction.detail);
  });

  it("rejects details for offers outside the current shortlist", async () => {
    const response = await requestJson(
      "POST",
      "/api/cases/s1-rf-italy/recommendations/detail",
      { offerId: "unknown_offer" }
    );

    expect(response.status).toBe(404);
    expect(response.json.error).toBe("recommendation_offer_not_found");
  });

  it("preserves deterministic recommendation boundary in openai route mode", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    resetRecommendationClientForTests();

    const caseId = "s5-rf-italy-insurance";
    const resultResponse = await requestJson("GET", `/api/cases/${caseId}/result`);
    expect(resultResponse.status).toBe(200);
    const result = resultPayloadSchema.parse(resultResponse.json);
    const primaryOfferId = result.primaryPath?.id;
    const alternativeOfferId = result.alternativePaths.find(
      (offer) => offer && offer.id !== primaryOfferId
    )?.id;
    expect(primaryOfferId).toBeTruthy();
    expect(alternativeOfferId).toBeTruthy();

    createResponseMock
      .mockResolvedValueOnce({
        output: [],
        output_text: JSON.stringify({
          recommendedOfferId: alternativeOfferId,
          items: [
            {
              offerId: alternativeOfferId,
              title: "Модель пытается поднять альтернативу",
              summary: "Неправильный приоритет от модели.",
              fitReason: "Модель считает это лучшим.",
              caution: "Сомнительно."
            },
            {
              offerId: primaryOfferId,
              title: "Primary",
              summary: "Вторым у модели.",
              fitReason: "Занижение приоритета.",
              caution: "Нет."
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        output: [],
        output_text: JSON.stringify({
          title: "Detail по альтернативе",
          summary: "Текст модели.",
          whyThisFits: ["Есть альтернативный путь."],
          watchouts: ["Нужно проверить условия."],
          nextSteps: [result.nextAction.label, result.nextAction.detail],
          trustSignals: ["Нужна верификация."]
        })
      });

    const shortlistResponse = await requestJson(
      "GET",
      `/api/cases/${caseId}/recommendations/shortlist`
    );
    expect(shortlistResponse.status).toBe(200);
    const shortlist = recommendationShortlistSchema.parse(shortlistResponse.json);
    expect(shortlist.source).toBe("ai_structured");
    expect(shortlist.recommendedOfferId).toBe(primaryOfferId);
    expect(shortlist.items[0]?.offerId).toBe(primaryOfferId);
    expect(shortlist.items[0]?.fit).toBe("best_match");

    const detailResponse = await requestJson(
      "POST",
      `/api/cases/${caseId}/recommendations/detail`,
      { offerId: alternativeOfferId }
    );
    expect(detailResponse.status).toBe(200);
    const detail = recommendationDetailSchema.parse(detailResponse.json);
    expect(detail.source).toBe("ai_structured");
    expect(detail.fit).not.toBe("best_match");
    expect(detail.nextSteps).not.toContain(result.nextAction.label);
    expect(detail.nextSteps).not.toContain(result.nextAction.detail);
    const mergedDetailCopy = [
      detail.title,
      detail.summary,
      ...detail.whyThisFits,
      ...detail.watchouts,
      ...detail.trustSignals
    ].join(" ");
    expect(mergedDetailCopy).not.toContain(result.nextAction.label);
    expect(mergedDetailCopy).not.toContain(result.nextAction.detail);
    expect(mergedDetailCopy).not.toMatch(/confidence|score|quality|\/100|\d{1,3}%/i);
  });

  it("builds what-if brief only when candidate credential matches candidate case", async () => {
    const baselineFork = await requestJson("POST", "/api/cases/s1-rf-italy/fork", {});
    expect(baselineFork.status).toBe(200);
    const baselineId = baselineFork.json.case.id as string;
    const baselineToken = baselineFork.json.access.accessToken as string;

    const candidateFork = await requestJson("POST", "/api/cases/s1-rf-italy/fork", {});
    expect(candidateFork.status).toBe(200);
    const candidateId = candidateFork.json.case.id as string;
    const candidateToken = candidateFork.json.access.accessToken as string;

    const shortlist = await requestJson(
      "GET",
      `/api/cases/${baselineId}/recommendations/shortlist`,
      undefined,
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(shortlist.status).toBe(200);
    const offerId = shortlist.json.items[0].offerId as string;

    const success = await requestJson(
      "POST",
      `/api/cases/${baselineId}/recommendations/what-if-brief`,
      {
        candidateCaseId: candidateId,
        candidateAccessToken: candidateToken,
        offerId
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(success.status).toBe(200);
    const parsed = recommendationWhatIfBriefSchema.parse(success.json);
    expect(parsed.caseId).toBe(baselineId);
    expect(parsed.candidateCaseId).toBe(candidateId);

    const missing = await requestJson(
      "POST",
      `/api/cases/${baselineId}/recommendations/what-if-brief`,
      {
        candidateCaseId: candidateId,
        offerId
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(missing.status).toBe(403);
    expect(missing.json.error).toBe("case_access_forbidden");

    const invalid = await requestJson(
      "POST",
      `/api/cases/${baselineId}/recommendations/what-if-brief`,
      {
        candidateCaseId: candidateId,
        candidateAccessToken: `${candidateToken}-tampered`,
        offerId
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(invalid.status).toBe(403);
    expect(invalid.json.error).toBe("case_access_forbidden");

    const thirdFork = await requestJson("POST", "/api/cases/s1-rf-italy/fork", {});
    expect(thirdFork.status).toBe(200);
    const thirdToken = thirdFork.json.access.accessToken as string;
    const wrongCaseToken = await requestJson(
      "POST",
      `/api/cases/${baselineId}/recommendations/what-if-brief`,
      {
        candidateCaseId: candidateId,
        candidateAccessToken: thirdToken,
        offerId
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(wrongCaseToken.status).toBe(403);
    expect(wrongCaseToken.json.error).toBe("case_access_forbidden");
  });

  it("allows same-case what-if brief without candidate credential when baseline token is valid", async () => {
    const baselineFork = await requestJson("POST", "/api/cases/s1-rf-italy/fork", {});
    expect(baselineFork.status).toBe(200);
    const baselineId = baselineFork.json.case.id as string;
    const baselineToken = baselineFork.json.access.accessToken as string;

    const shortlist = await requestJson(
      "GET",
      `/api/cases/${baselineId}/recommendations/shortlist`,
      undefined,
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(shortlist.status).toBe(200);
    const offerId = shortlist.json.items[0].offerId as string;

    const response = await requestJson(
      "POST",
      `/api/cases/${baselineId}/recommendations/what-if-brief`,
      {
        candidateCaseId: baselineId,
        offerId
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );

    expect(response.status).toBe(200);
    const parsed = recommendationWhatIfBriefSchema.parse(response.json);
    expect(parsed.caseId).toBe(baselineId);
    expect(parsed.candidateCaseId).toBe(baselineId);
  });
});
