import type { Express } from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { Duplex } from "node:stream";
import { createApp } from "../index";
import { getCatalogsOrThrow, loadCatalogs, replaceCatalogsForTest } from "../lib/catalogs";
import { freshCatalogsForRouteTest } from "./testFreshCatalogs";
import { installStableRouteTestClock } from "./routeTestClock";

let app: Express;
let humanReviewTempDir: string;
let restoreFreshCatalogs: (() => void) | null = null;
const previousHumanReviewsFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;

class MockSocket extends Duplex {
  readonly chunks: Buffer[] = [];
  remoteAddress = "127.0.0.1";

  _read(): void {}

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setTimeout(): this {
    return this;
  }

  setNoDelay(): this {
    return this;
  }

  setKeepAlive(): this {
    return this;
  }

  connect(): this {
    return this;
  }

  resetAndDestroy(): void {
    this.destroy();
  }

  address() {
    return { address: "127.0.0.1", family: "IPv4", port: 0 };
  }

  ref(): this {
    return this;
  }

  unref(): this {
    return this;
  }

  destroySoon(): void {
    this.destroy();
  }
}

installStableRouteTestClock();

beforeEach(async () => {
  humanReviewTempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-packet-"));
  process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
    humanReviewTempDir,
    "human-reviews.json"
  );
  app = await createApp();
  restoreFreshCatalogs = replaceCatalogsForTest(
    freshCatalogsForRouteTest(getCatalogsOrThrow())
  );
});

afterEach(async () => {
  restoreFreshCatalogs?.();
  restoreFreshCatalogs = null;
  if (previousHumanReviewsFile) {
    process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previousHumanReviewsFile;
  } else {
    delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
  }
  if (humanReviewTempDir) {
    await rm(humanReviewTempDir, { recursive: true, force: true });
  }
});

async function requestJson(
  method: "GET" | "POST",
  route: string,
  body?: unknown
) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const socket = new MockSocket();
  const req = new IncomingMessage(socket as never);
  req.method = method;
  req.url = route;
  req.headers = payload
    ? {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(payload))
      }
    : {};
  if (payload) req.push(payload);
  req.push(null);

  const res = new ServerResponse(req);
  res.assignSocket(socket as never);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    res.on("finish", resolveOnce);
    res.on("close", () => {
      if (res.writableEnded) resolveOnce();
    });
    res.on("error", rejectOnce);
    app(req as never, res as never, (error?: unknown) => {
      if (error instanceof Error) {
        rejectOnce(error);
        return;
      }
      if (res.writableEnded) resolveOnce();
    });
  });

  const raw = Buffer.concat(socket.chunks).toString("utf8");
  const bodyText = raw.split("\r\n\r\n").slice(1).join("\r\n\r\n");
  const json = bodyText.length > 0 ? JSON.parse(bodyText) : null;
  return { status: res.statusCode, json } as const;
}

async function createReview(caseId: string, scenarioId?: string) {
  return requestJson("POST", `/api/cases/${caseId}/human-review`, {
    channel: "email",
    contact: `${caseId}@example.com`,
    message: "Нужно передать кейс оператору без автоматических обещаний.",
    ...(scenarioId ? { scenarioId } : {})
  });
}

async function recommendedScenarioId(caseId: string): Promise<string> {
  const lab = await requestJson("GET", `/api/cases/${caseId}/scenario-lab`);
  expect(lab.status).toBe(200);
  const scenarioId = lab.json.recommendedScenarioId ?? lab.json.scenarios[0]?.id;
  expect(scenarioId).toEqual(expect.any(String));
  return scenarioId;
}

describe("human review case packet HTTP surface", () => {
  it("returns 404 when no active human review request exists", async () => {
    const packet = await requestJson("GET", "/api/cases/s1-rf-italy/human-review/packet");

    expect(packet.status).toBe(404);
    expect(packet.json.error).toBe("human_review_packet_not_found");
  });

  it("builds an operator-ready packet for a valid active review", async () => {
    const created = await createReview("s5-rf-italy-insurance");
    expect(created.status).toBe(200);

    const packet = await requestJson(
      "GET",
      "/api/cases/s5-rf-italy-insurance/human-review/packet"
    );

    expect(packet.status).toBe(200);
    expect(packet.json.packet).toMatchObject({
      version: "human-review-packet.v1",
      case: { id: "s5-rf-italy-insurance", productType: "insurance_adult" },
      request: { id: created.json.request.id },
      submittedSnapshot: created.json.request.snapshot,
      scenario: null,
      evidence: {
        evidenceStatus: "valid",
        freshnessStatus: "fresh"
      }
    });
    expect(packet.json.packet.reviewReason).toEqual(expect.any(String));
    expect(packet.json.packet.currentResult).toMatchObject({
      verdict: expect.any(String),
      confidence: expect.any(Number)
    });
    expect(packet.json.packet.resultDrift).toEqual({
      changed: expect.any(Boolean),
      verdictChanged: expect.any(Boolean),
      confidenceDelta: expect.any(Number),
      computedAtChanged: expect.any(Boolean),
      lastCheckedAtChanged: expect.any(Boolean),
      nextActionChanged: expect.any(Boolean)
    });
    expect(packet.json.packet.operatorChecklist[0]).toMatchObject({
      id: "review-reason",
      priority: "critical"
    });
    expect(packet.json.packet.doNotAutoDecideNotes.at(-1)).toContain("Не обещать");
  });

  it("includes no-helpful scenario handoff context in the packet", async () => {
    const scenarioId = await recommendedScenarioId("s3-us-spb-business");
    const created = await createReview("s3-us-spb-business", scenarioId);
    expect(created.status).toBe(200);

    const packet = await requestJson(
      "GET",
      "/api/cases/s3-us-spb-business/human-review/packet"
    );

    expect(packet.status).toBe(200);
    expect(packet.json.packet.scenario).toMatchObject({
      id: scenarioId,
      safetyStatus: "human_review_only",
      operatorNextAction: expect.stringContaining("Оператор должен")
    });
    expect(
      packet.json.packet.operatorChecklist.some(
        (item: { id: string }) => item.id === `scenario:${scenarioId}`
      )
    ).toBe(true);
    expect(packet.json.packet.doNotAutoDecideNotes.join(" ")).toContain("ручной проверки");
  });

  it("separates submitted snapshot from current recompute when the case changes after submission", async () => {
    const created = await createReview("s5-rf-italy-insurance");
    expect(created.status).toBe(200);

    const patched = await requestJson("POST", "/api/cases/s5-rf-italy-insurance/signals", {
      signals: [
        {
          id: "has_chronic_conditions",
          value: false,
          source: "user",
          capturedAt: "2026-04-30T12:00:00.000Z"
        }
      ]
    });
    expect(patched.status).toBe(200);

    const packet = await requestJson(
      "GET",
      "/api/cases/s5-rf-italy-insurance/human-review/packet"
    );

    expect(packet.status).toBe(200);
    expect(packet.json.packet.submittedSnapshot).toMatchObject(created.json.request.snapshot);
    expect(packet.json.packet.currentResult.confidence).toBe(patched.json.result.trust.confidence);
    expect(packet.json.packet.resultDrift.changed).toBe(true);
    expect(packet.json.packet.resultDrift.nextActionChanged).toBe(true);
  });

  it("preserves stale evidence in the operator packet", async () => {
    const catalogs = structuredClone(await loadCatalogs());
    const staleRecord = catalogs.ruleEvidence.find(
      (record) => record.ruleId === "R02" && record.countryOrScope === "RU->IT"
    );
    expect(staleRecord).toBeDefined();
    if (!staleRecord) return;
    staleRecord.lastVerifiedAt = "2025-01-01T00:00:00.000Z";

    const restore = replaceCatalogsForTest(catalogs);
    try {
      const scenarioId = await recommendedScenarioId("s1-rf-italy");
      const created = await createReview("s1-rf-italy", scenarioId);
      expect(created.status).toBe(200);

      const packet = await requestJson("GET", "/api/cases/s1-rf-italy/human-review/packet");

      expect(packet.status).toBe(200);
      expect(packet.json.packet.evidence).toMatchObject({
        evidenceStatus: "stale",
        freshnessStatus: "stale"
      });
      expect(packet.json.packet.evidence.blockingReason).toContain("R02");
      expect(packet.json.packet.doNotAutoDecideNotes.join(" ")).toContain("Источники устарели");
    } finally {
      restore();
    }
  });

  it("preserves missing evidence in the operator packet", async () => {
    const catalogs = structuredClone(await loadCatalogs());
    catalogs.ruleEvidence = catalogs.ruleEvidence.filter((record) => record.ruleId !== "R17");

    const restore = replaceCatalogsForTest(catalogs);
    try {
      const scenarioId = await recommendedScenarioId("s4-rf-residency-dnv");
      const created = await createReview("s4-rf-residency-dnv", scenarioId);
      expect(created.status).toBe(200);

      const packet = await requestJson(
        "GET",
        "/api/cases/s4-rf-residency-dnv/human-review/packet"
      );

      expect(packet.status).toBe(200);
      expect(packet.json.packet.evidence.evidenceStatus).toBe("missing");
      expect(packet.json.packet.evidence.blockingReason).toContain("R17");
      expect(packet.json.packet.doNotAutoDecideNotes.join(" ")).toContain("отсутствуют");
    } finally {
      restore();
    }
  });

  it("preserves conflicting evidence in the operator packet", async () => {
    const scenarioId = await recommendedScenarioId("s2-tr-spb");
    const created = await createReview("s2-tr-spb", scenarioId);
    expect(created.status).toBe(200);

    const packet = await requestJson("GET", "/api/cases/s2-tr-spb/human-review/packet");

    expect(packet.status).toBe(200);
    expect(packet.json.packet.evidence.evidenceStatus).toBe("conflicting");
    expect(packet.json.packet.scenario.safetyStatus).toBe("evidence_blocked");
    expect(packet.json.packet.doNotAutoDecideNotes.join(" ")).toContain("конфликтуют");
  });
});
