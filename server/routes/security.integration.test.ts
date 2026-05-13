import express, { type Express } from "express";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../index";
import { getCatalogsOrThrow, replaceCatalogsForTest } from "../lib/catalogs";
import { resetRecommendationClientForTests } from "../lib/recommendations";
import { errorHandler } from "../middleware/errorHandler";
import { resetRateLimitBucketsForTests } from "../middleware/rateLimit";
import { freshCatalogsForRouteTest } from "./testFreshCatalogs";

const INTERNAL_API_TOKEN = "test-internal-security-token";
const INTERNAL_HEADERS = {
  "x-active-holidays-internal-token": INTERNAL_API_TOKEN
} as const;

const previousEnv = {
  internalApiToken: process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN,
  corsOrigins: process.env.CORS_ORIGINS,
  allowedOrigins: process.env.ALLOWED_ORIGINS,
  recommendationLimitMax: process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_RECOMMENDATIONS_MAX,
  recommendationLimitWindow: process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_RECOMMENDATIONS_WINDOW_MS,
  openaiApiKey: process.env.OPENAI_API_KEY
};

let app: Express;
let server: Server;
let baseUrl = "";
let restoreFreshCatalogs: (() => void) | null = null;

function restoreEnv(): void {
  const pairs: Array<[string, string | undefined]> = [
    ["ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN", previousEnv.internalApiToken],
    ["CORS_ORIGINS", previousEnv.corsOrigins],
    ["ALLOWED_ORIGINS", previousEnv.allowedOrigins],
    ["ACTIVE_HOLIDAYS_RATE_LIMIT_RECOMMENDATIONS_MAX", previousEnv.recommendationLimitMax],
    ["ACTIVE_HOLIDAYS_RATE_LIMIT_RECOMMENDATIONS_WINDOW_MS", previousEnv.recommendationLimitWindow],
    ["OPENAI_API_KEY", previousEnv.openaiApiKey]
  ];
  for (const [key, value] of pairs) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function listen(target: Express): Promise<{ server: Server; baseUrl: string }> {
  const server = await new Promise<Server>((resolve) => {
    const instance = target.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function close(server: Server): Promise<void> {
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
}

async function requestJson(
  method: "GET" | "POST",
  path: string,
  options: { body?: unknown; headers?: Record<string, string> } = {}
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.headers ?? {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  const json = text.length > 0 ? JSON.parse(text) : null;
  return { response, json } as const;
}

type DenyCaseBoundRoute = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
};

const SENSITIVE_CASE_BOUND_ROUTES: readonly DenyCaseBoundRoute[] = [
  { method: "GET", path: "/api/cases/s1-rf-italy" },
  { method: "GET", path: "/api/cases/s1-rf-italy/result" },
  { method: "GET", path: "/api/cases/s1-rf-italy/recommendations/shortlist" },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/recommendations/detail",
    body: { offerId: "path_it_tourist_90" }
  },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/recommendations/what-if-brief",
    body: {
      candidateCaseId: "s1-rf-italy",
      offerId: "path_it_tourist_90",
      offerLabel: "Italy Tourist 90"
    }
  },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/signals",
    body: { signals: [] }
  },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/recompute",
    body: {}
  },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/override-signal",
    body: {}
  },
  { method: "GET", path: "/api/cases/s1-rf-italy/audit" },
  { method: "GET", path: "/api/cases/s1-rf-italy/documents" },
  { method: "GET", path: "/api/cases/s1-rf-italy/human-review" },
  { method: "GET", path: "/api/cases/s1-rf-italy/human-review/packet" },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/human-review/manager-brief",
    body: {}
  },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/human-review",
    body: {
      channel: "email",
      contact: "security-test@example.com",
      message: "Нужна ручная проверка."
    }
  },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/human-review/transition",
    body: {
      requestId: "hr_test",
      status: "in_queue",
      note: "Без токена."
    }
  },
  { method: "GET", path: "/api/cases/s1-rf-italy/scenario-lab" },
  { method: "GET", path: "/api/cases/s1-rf-italy/scenarios" },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/scenarios/compare",
    body: {
      title: "Security compare",
      signals: []
    }
  },
  { method: "GET", path: "/api/cases/s1-rf-italy/drift" },
  {
    method: "POST",
    path: "/api/cases/s1-rf-italy/fork",
    body: {}
  }
];

beforeAll(async () => {
  process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = INTERNAL_API_TOKEN;
  process.env.CORS_ORIGINS = "http://localhost:3000";
  process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_RECOMMENDATIONS_MAX = "2";
  process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_RECOMMENDATIONS_WINDOW_MS = "60000";
  delete process.env.ALLOWED_ORIGINS;
  delete process.env.OPENAI_API_KEY;
  resetRecommendationClientForTests();

  app = await createApp();
  const listening = await listen(app);
  server = listening.server;
  baseUrl = listening.baseUrl;
});

beforeEach(() => {
  resetRateLimitBucketsForTests();
  resetRecommendationClientForTests();
  delete process.env.OPENAI_API_KEY;
  restoreFreshCatalogs = replaceCatalogsForTest(
    freshCatalogsForRouteTest(getCatalogsOrThrow())
  );
});

afterEach(() => {
  restoreFreshCatalogs?.();
  restoreFreshCatalogs = null;
});

afterAll(async () => {
  await close(server);
  restoreEnv();
});

describe("Express API security hardening", () => {
  it("keeps public allowlisted routes accessible without the internal token", async () => {
    const health = await requestJson("GET", "/api/health");

    expect(health.response.status).toBe(200);
    expect(health.json.status).toBe("ok");
  });

  it("blocks unauthenticated case list enumeration and does not leak case payload keys", async () => {
    const response = await requestJson("GET", "/api/cases");
    const serialized = JSON.stringify(response.json);

    expect(response.response.status).toBe(403);
    expect(response.json.error).toBe("internal_api_forbidden");
    expect(response.json.cases).toBeUndefined();
    expect(serialized).not.toMatch(
      /caseId|accessToken|resultPayload|travelProfile|readiness|documentsUploaded/i
    );
  });

  it("blocks unauthenticated case-bound reads and does not leak private state", async () => {
    const caseResponse = await requestJson("GET", "/api/cases/s1-rf-italy");
    const resultResponse = await requestJson("GET", "/api/cases/s1-rf-italy/result");
    const documentsResponse = await requestJson("GET", "/api/cases/s1-rf-italy/documents");
    const reviewResponse = await requestJson("GET", "/api/cases/s1-rf-italy/human-review");
    const serialized = [
      JSON.stringify(caseResponse.json),
      JSON.stringify(resultResponse.json),
      JSON.stringify(documentsResponse.json),
      JSON.stringify(reviewResponse.json)
    ].join("\n");

    expect(caseResponse.response.status).toBe(403);
    expect(resultResponse.response.status).toBe(403);
    expect(documentsResponse.response.status).toBe(403);
    expect(reviewResponse.response.status).toBe(403);
    expect(serialized).not.toMatch(
      /caseId|accessToken|resultPayload|travelProfile|readiness|documentsUploaded/i
    );
  });

  it("blocks unauthenticated recommendation endpoints", async () => {
    const shortlist = await requestJson("GET", "/api/cases/s1-rf-italy/recommendations/shortlist");
    const detail = await requestJson(
      "POST",
      "/api/cases/s1-rf-italy/recommendations/detail",
      { body: { offerId: "path_it_tourist_90" } }
    );

    expect(shortlist.response.status).toBe(403);
    expect(shortlist.json.error).toBe("internal_api_forbidden");
    expect(detail.response.status).toBe(403);
    expect(detail.json.error).toBe("internal_api_forbidden");
  });

  it("denies all sensitive case-bound routes without internal token (table-driven)", async () => {
    for (const route of SENSITIVE_CASE_BOUND_ROUTES) {
      const request = await requestJson(route.method, route.path, {
        body: route.body
      });
      expect(request.response.status, `${route.method} ${route.path}`).toBe(403);
      expect(request.json.error, `${route.method} ${route.path}`).toBe("internal_api_forbidden");
    }
  });

  it("requires the internal API token for decision and case-operator routes", async () => {
    const decisionsWithoutToken = await requestJson("GET", "/api/decisions");
    expect(decisionsWithoutToken.response.status).toBe(403);
    expect(decisionsWithoutToken.json.error).toBe("internal_api_forbidden");

    const decisionsWithToken = await requestJson("GET", "/api/decisions", {
      headers: INTERNAL_HEADERS
    });
    expect(decisionsWithToken.response.status).toBe(200);
    expect(Array.isArray(decisionsWithToken.json.decisions)).toBe(true);

    const auditWithoutToken = await requestJson("GET", "/api/cases/s1-rf-italy/audit");
    expect(auditWithoutToken.response.status).toBe(403);
    expect(auditWithoutToken.json.error).toBe("internal_api_forbidden");

    const auditWithToken = await requestJson("GET", "/api/cases/s1-rf-italy/audit", {
      headers: INTERNAL_HEADERS
    });
    expect(auditWithToken.response.status).toBe(200);
  });

  it("fails closed for human-review packet and manager brief routes without token", async () => {
    const review = await requestJson("GET", "/api/cases/s2-tr-spb/human-review");
    expect(review.response.status).toBe(403);
    expect(review.json.error).toBe("internal_api_forbidden");

    const createReview = await requestJson("POST", "/api/cases/s2-tr-spb/human-review", {
      body: {
        channel: "email",
        contact: "security-test@example.com",
        message: "Нужна ручная проверка."
      }
    });
    expect(createReview.response.status).toBe(403);
    expect(createReview.json.error).toBe("internal_api_forbidden");

    const packet = await requestJson("GET", "/api/cases/s2-tr-spb/human-review/packet");
    expect(packet.response.status).toBe(403);
    expect(packet.json.error).toBe("internal_api_forbidden");

    const managerBrief = await requestJson(
      "POST",
      "/api/cases/s2-tr-spb/human-review/manager-brief",
      { body: {} }
    );
    expect(managerBrief.response.status).toBe(403);
    expect(managerBrief.json.error).toBe("internal_api_forbidden");
  });

  it("only emits CORS allow-origin for configured browser origins", async () => {
    const allowed = await requestJson("GET", "/api/health", {
      headers: { origin: "http://localhost:3000" }
    });
    expect(allowed.response.status).toBe(200);
    expect(allowed.response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000"
    );

    const rejected = await requestJson("GET", "/api/health", {
      headers: { origin: "https://evil.example" }
    });
    expect(rejected.response.status).toBe(200);
    expect(rejected.response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rate-limits recommendation generation endpoints for internal callers", async () => {
    const headers = { "x-forwarded-for": "198.51.100.10" };

    const first = await requestJson("GET", "/api/cases/s1-rf-italy/recommendations/shortlist", {
      headers: {
        ...headers,
        ...INTERNAL_HEADERS
      }
    });
    const second = await requestJson("GET", "/api/cases/s1-rf-italy/recommendations/shortlist", {
      headers: {
        ...headers,
        ...INTERNAL_HEADERS
      }
    });
    const third = await requestJson("GET", "/api/cases/s1-rf-italy/recommendations/shortlist", {
      headers: {
        ...headers,
        ...INTERNAL_HEADERS
      }
    });

    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);
    expect(third.response.status).toBe(429);
    expect(third.json.error).toBe("rate_limited");
  });

  it("does not expose raw error messages, stacks, or provider diagnostics for generic 500s", async () => {
    const unsafeApp = express();
    unsafeApp.get("/boom", () => {
      throw new Error("OpenAI provider stack secret at unsafe frame");
    });
    unsafeApp.use(errorHandler);

    const isolated = await listen(unsafeApp);
    try {
      const response = await fetch(`${isolated.baseUrl}/boom`);
      const json = await response.json();
      const serialized = JSON.stringify(json);

      expect(response.status).toBe(500);
      expect(serialized).not.toMatch(/OpenAI|provider|stack|secret|unsafe frame/i);
      expect(json.error).toBe("server_error");
    } finally {
      await close(isolated.server);
    }
  });

  it("keeps recommendation payloads free of internal fallback and provider diagnostics", async () => {
    const shortlist = await requestJson(
      "GET",
      "/api/cases/s1-rf-italy/recommendations/shortlist",
      {
        headers: {
          "x-forwarded-for": "198.51.100.20",
          "x-active-holidays-internal-token": INTERNAL_API_TOKEN
        }
      }
    );
    const serialized = JSON.stringify(shortlist.json);

    expect(shortlist.response.status).toBe(200);
    expect(serialized).not.toMatch(
      /confidence|score|quality|\/100|\d{1,3}%|fallback|openai|provider|deterministic_recovery|generation_unavailable|generation_unusable/i
    );
  });
});
