import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it, vi } from "vitest";
import type { Express } from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import {
  resultPayloadSchema,
  recommendationDetailSchema,
  recommendationShortlistSchema
} from "@shared/contracts";
import { createApp } from "../index";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { resetRecommendationClientForTests } from "../lib/recommendations";
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
let originalSourceChecks: Map<string, string> | null = null;
let originalRuleEvidenceChecks: Map<number, string | null> | null = null;

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
  const catalogs = getCatalogsOrThrow();
  originalSourceChecks = new Map(
    catalogs.sources.map((source) => [source.id, source.lastCheckedAt])
  );
  originalRuleEvidenceChecks = new Map(
    catalogs.ruleEvidence.map((record, index) => [index, record.lastVerifiedAt])
  );
  const refreshedAt = new Date().toISOString();
  for (const source of catalogs.sources) {
    source.lastCheckedAt = refreshedAt;
  }
  for (const record of catalogs.ruleEvidence) {
    if (record.evidenceStatus === "valid") {
      record.lastVerifiedAt = refreshedAt;
    }
  }
  createResponseMock.mockReset();
  resetRecommendationClientForTests();
});

afterEach(() => {
  const catalogs = getCatalogsOrThrow();
  if (originalSourceChecks) {
    for (const source of catalogs.sources) {
      const original = originalSourceChecks.get(source.id);
      if (original) source.lastCheckedAt = original;
    }
  }
  if (originalRuleEvidenceChecks) {
    for (const [index, original] of originalRuleEvidenceChecks) {
      const record = catalogs.ruleEvidence[index];
      if (record) record.lastVerifiedAt = original;
    }
  }
  originalSourceChecks = null;
  originalRuleEvidenceChecks = null;
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
  body?: unknown
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body
      ? {
          "content-type": "application/json",
          connection: "close"
        }
      : { connection: "close" },
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
    expect(parsed.source).toBe("fallback");
    expect(parsed.items.length).toBeGreaterThan(0);
    expect(parsed.recommendedOfferId).toBeTruthy();
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
    expect(parsed.source).toBe("fallback");
    expect(parsed.whyThisFits.length).toBeGreaterThan(0);
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
    expect(shortlist.source).toBe("openai");
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
    expect(detail.source).toBe("openai");
    expect(detail.fit).not.toBe("best_match");
    expect(detail.nextSteps).not.toContain(result.nextAction.label);
    expect(detail.nextSteps).not.toContain(result.nextAction.detail);
  });
});
