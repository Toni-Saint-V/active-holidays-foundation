import type { Express } from "express";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";
import { createApp } from "../index";
import { getCatalogsOrThrow, replaceCatalogsForTest } from "../lib/catalogs";
import { getCaseStore } from "../lib/caseStore";
import { caseSummarySchema, type DecisionRecord } from "@shared/contracts";
import { installStableRouteTestClock } from "./routeTestClock";

let app: Express;

function markValidEvidenceFresh(): void {
  const catalogs = getCatalogsOrThrow();
  const refreshedAt = "2026-04-30T00:00:00.000Z";
  for (const source of catalogs.sources) {
    source.lastCheckedAt = refreshedAt;
  }
  for (const record of catalogs.ruleEvidence) {
    if (record.evidenceStatus === "valid") {
      record.lastVerifiedAt = refreshedAt;
    }
  }
}

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

beforeAll(async () => {
  app = await createApp();
  markValidEvidenceFresh();
});

installStableRouteTestClock();

async function requestJson(
  method: "GET" | "POST",
  path: string,
  body?: unknown
) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const socket = new MockSocket();
  const req = new IncomingMessage(socket as never);
  req.method = method;
  req.url = path;
  req.headers = payload
    ? {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(payload))
      }
    : {};
  if (payload) {
    req.push(payload);
  }
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
      if (res.writableEnded) {
        resolveOnce();
      }
    });
    res.on("error", reject);
    app(req as never, res as never, (error?: unknown) => {
      if (error instanceof Error) {
        rejectOnce(error);
        return;
      }
      if (res.writableEnded) {
        resolveOnce();
      }
    });
  });

  const raw = Buffer.concat(socket.chunks).toString("utf8");
  const bodyText = raw.split("\r\n\r\n").slice(1).join("\r\n\r\n");
  const json = bodyText.length > 0 ? JSON.parse(bodyText) : null;
  return { status: res.statusCode, json } as const;
}

async function postJson(path: string, body?: unknown) {
  return requestJson("POST", path, body);
}

async function getJson(path: string) {
  return requestJson("GET", path);
}

describe("decision integrity HTTP surface", () => {
  it("GET /api/cases returns shared case summaries with productType", async () => {
    const response = await getJson("/api/cases");
    expect(response.status).toBe(200);
    const parsed = caseSummarySchema.array().parse(response.json.cases);
    const residency = parsed.find((item) => item.id === "s4-rf-residency-dnv");
    const insurance = parsed.find((item) => item.id === "s5-rf-italy-insurance");

    expect(residency?.productType).toBe("residency_es");
    expect(insurance?.productType).toBe("insurance_adult");
  });

  it("POST /api/cases/:id/recompute returns a decisionRecordId and makes it fetchable", async () => {
    const recompute = await postJson("/api/cases/s1-rf-italy/recompute");
    expect(recompute.status).toBe(200);
    const recordId = recompute.json.decisionRecordId as string;
    expect(typeof recordId).toBe("string");
    expect(recordId).toMatch(/^dec_s1-rf-italy_\d+$/);

    const fetched = await getJson(`/api/decisions/${recordId}`);
    expect(fetched.status).toBe(200);
    expect(fetched.json.record.decisionId).toBe(recordId);
    expect(fetched.json.record.replayableSnapshot).toBeTruthy();
    expect(fetched.json.record.result).toBeTruthy();
  });

  it("POST /api/cases/:id/recompute fails closed when referenced evidence source is stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T09:00:00.000Z"));
    const staleCatalogs = structuredClone(getCatalogsOrThrow());
    staleCatalogs.sources = staleCatalogs.sources.map((source) =>
      source.id === "src_russia_mfa_tr"
        ? { ...source, lastCheckedAt: "2026-03-01T09:00:00.000Z" }
        : source
    );
    staleCatalogs.ruleEvidence = staleCatalogs.ruleEvidence.map((record) =>
      record.ruleId === "R12"
        ? {
            ...record,
            evidenceStatus: "valid",
            rationale: "Test fixture: valid evidence with stale source freshness."
          }
        : record
    );
    const restoreCatalogs = replaceCatalogsForTest(staleCatalogs);
    try {
      const recompute = await postJson("/api/cases/s2-tr-spb/recompute");

      expect(recompute.status).toBe(200);
      expect(recompute.json.result.verdict).toBe("HUMAN_REVIEW");
      expect(recompute.json.result.nextAction.type).toBe("send_for_review");
      expect(recompute.json.result.trust.confidence).toBe(0);
      expect(
        recompute.json.result.ruleResults.find(
          (rule: { ruleId: string }) => rule.ruleId === "EVIDENCE_GATE:R12"
        )?.explanation
      ).toContain("stale");
    } finally {
      restoreCatalogs();
      vi.useRealTimers();
    }
  });

  it("POST /api/decisions/:id/replay returns diff:null on a fresh record", async () => {
    const recompute = await postJson("/api/cases/s2-tr-spb/recompute");
    const recordId = recompute.json.decisionRecordId as string;

    const replay = await postJson(`/api/decisions/${recordId}/replay`);
    expect(replay.status).toBe(200);
    expect(replay.json.drifted).toBe(false);
    expect(replay.json.diff).toBeNull();
    expect(replay.json.replay.resultFingerprint).toBe(replay.json.original.resultFingerprint);
  });

  it("GET /api/cases/:id/drift returns drifted:false right after recompute", async () => {
    await postJson("/api/cases/s4-rf-residency-dnv/recompute");
    const drift = await getJson("/api/cases/s4-rf-residency-dnv/drift");
    expect(drift.status).toBe(200);
    expect(drift.json.drifted).toBe(false);
    expect(drift.json.diff).toBeNull();
    expect(drift.json.latestResultFingerprint).toBe(drift.json.replayResultFingerprint);
  });

  it("GET /api/cases/:id/drift surfaces a structured diff when the stored record is stale", async () => {
    const recompute = await postJson("/api/cases/s1-rf-italy/recompute");
    const store = getCaseStore();
    const fresh = store.getRecord(recompute.json.decisionRecordId);
    expect(fresh).not.toBeNull();
    if (!fresh || !fresh.result) return;

    const stale: DecisionRecord = {
      ...fresh,
      decisionId: `${fresh.decisionId}_stale`,
      recordedAt: "2099-01-01T00:00:00.000Z",
      verdict: "HUMAN_REVIEW",
      result: {
        ...fresh.result,
        verdict: "HUMAN_REVIEW",
        primaryPath: null,
        nextAction: {
          ...fresh.result.nextAction,
          type: "send_for_review",
          label: "Передать менеджеру"
        }
      }
    };
    store.insertRecordForTest(stale);

    const drift = await getJson("/api/cases/s1-rf-italy/drift");
    expect(drift.status).toBe(200);
    expect(drift.json.drifted).toBe(true);
    expect(drift.json.diff.verdict).toEqual({
      before: "HUMAN_REVIEW",
      after: fresh.result.verdict
    });
    expect(drift.json.diff.nextActionType).toBeDefined();
    expect(drift.json.diff.primaryPathId).toBeDefined();

    store.insertRecordForTest({
      ...fresh,
      decisionId: `${fresh.decisionId}_restore`,
      recordedAt: "2099-01-01T00:00:01.000Z"
    });
  });

  it("GET /api/cases/:id/drift flags drift by fingerprint even when driftDiff returns null", async () => {
    const recompute = await postJson("/api/cases/s2-tr-spb/recompute");
    const store = getCaseStore();
    const fresh = store.getRecord(recompute.json.decisionRecordId);
    expect(fresh).not.toBeNull();
    if (!fresh || !fresh.result) return;

    // Stale record has the same result payload (so driftDiff === null) but
    // an obviously wrong stored resultFingerprint. Replay must still report
    // drifted: true.
    const stale = {
      ...fresh,
      decisionId: `${fresh.decisionId}_fp_only`,
      recordedAt: "2099-02-02T00:00:00.000Z",
      resultFingerprint: "0".repeat(64)
    };
    store.insertRecordForTest(stale);

    const drift = await getJson("/api/cases/s2-tr-spb/drift");
    expect(drift.status).toBe(200);
    expect(drift.json.drifted).toBe(true);
    expect(drift.json.diff).toBeNull();
    expect(drift.json.latestResultFingerprint).toBe("0".repeat(64));
    expect(drift.json.replayResultFingerprint).not.toBe("0".repeat(64));
  });

  it("GET /api/cases/:id/drift compares against current catalogs, while /replay stays historical", async () => {
    const recompute = await postJson("/api/cases/s1-rf-italy/recompute");
    const recordId = recompute.json.decisionRecordId as string;
    const primaryPathId = recompute.json.result.primaryPath?.id as string | undefined;
    expect(primaryPathId).toBeTruthy();
    if (!primaryPathId) return;

    const catalogs = getCatalogsOrThrow();
    const currentPath = catalogs.paths.find((path) => path.id === primaryPathId);
    expect(currentPath).toBeDefined();
    if (!currentPath) return;

    const originalTitle = currentPath.title;
    currentPath.title = `${originalTitle} (updated)`;
    try {
      const drift = await getJson("/api/cases/s1-rf-italy/drift");
      expect(drift.status).toBe(200);
      expect(drift.json.drifted).toBe(true);
      expect(drift.json.diff).toBeNull();
      expect(drift.json.latestResultFingerprint).not.toBe(drift.json.replayResultFingerprint);

      const replay = await postJson(`/api/decisions/${recordId}/replay`);
      expect(replay.status).toBe(200);
      expect(replay.json.drifted).toBe(false);
      expect(replay.json.diff).toBeNull();
    } finally {
      currentPath.title = originalTitle;
    }
  });

  it("POST /api/decisions/:id/replay flags drift by fingerprint even when driftDiff returns null", async () => {
    const recompute = await postJson("/api/cases/s4-rf-residency-dnv/recompute");
    const store = getCaseStore();
    const fresh = store.getRecord(recompute.json.decisionRecordId);
    expect(fresh).not.toBeNull();
    if (!fresh || !fresh.result) return;

    const stale = {
      ...fresh,
      decisionId: `${fresh.decisionId}_fp_replay`,
      recordedAt: "2099-02-02T00:00:00.000Z",
      resultFingerprint: "0".repeat(64)
    };
    store.insertRecordForTest(stale);

    const replay = await postJson(`/api/decisions/${stale.decisionId}/replay`);
    expect(replay.status).toBe(200);
    expect(replay.json.diff).toBeNull();
    expect(replay.json.drifted).toBe(true);
    expect(replay.json.original.resultFingerprint).toBe("0".repeat(64));
    expect(replay.json.replay.resultFingerprint).not.toBe("0".repeat(64));
  });

  it("POST /api/decisions/:id/replay returns 409 for pre-evidence snapshots", async () => {
    const recompute = await postJson("/api/cases/s1-rf-italy/recompute");
    const store = getCaseStore();
    const fresh = store.getRecord(recompute.json.decisionRecordId);
    expect(fresh).not.toBeNull();
    if (!fresh?.replayableSnapshot) return;

    const preEvidenceSnapshot = structuredClone(fresh.replayableSnapshot) as Record<string, unknown> & {
      catalogs: Record<string, unknown>;
    };
    delete preEvidenceSnapshot.catalogs.ruleEvidence;
    delete preEvidenceSnapshot.evidenceContractCaptured;
    const preEvidence = {
      ...fresh,
      decisionId: `${fresh.decisionId}_pre_evidence`,
      recordedAt: "2099-02-03T00:00:00.000Z",
      replayableSnapshot: preEvidenceSnapshot
    } as unknown as DecisionRecord;
    store.insertRecordForTest(preEvidence);

    const replay = await postJson(`/api/decisions/${preEvidence.decisionId}/replay`);
    expect(replay.status).toBe(409);
    expect(replay.json.error).toBe("evidence_contract_missing");
  });

  it("GET /api/decisions/:id returns 404 with Russian message for unknown id", async () => {
    const response = await getJson("/api/decisions/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.json.error).toBe("decision_not_found");
    expect(response.json.message).toMatch(/не найдено/);
  });

  it("POST /api/decisions/:id/replay returns 409 for legacy seed rows", async () => {
    const response = await postJson("/api/decisions/log_s1_init/replay");
    expect(response.status).toBe(409);
    expect(response.json.error).toBe("replay_unavailable");
  });
});
