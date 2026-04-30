import type { Express } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { Duplex } from "node:stream";
import { createApp } from "../index";

let app: Express;
let humanReviewTempDir: string;
const previousInternalApiToken = process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;
const INTERNAL_API_TOKEN = "test-internal-human-review-token";

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
  humanReviewTempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-http-"));
  process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
    humanReviewTempDir,
    "human-reviews.json"
  );
  process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = INTERNAL_API_TOKEN;
  app = await createApp();
});

afterAll(async () => {
  delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
  if (previousInternalApiToken) {
    process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = previousInternalApiToken;
  } else {
    delete process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;
  }
  if (humanReviewTempDir) {
    await rm(humanReviewTempDir, { recursive: true, force: true });
  }
});

async function requestJson(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  targetApp: Express = app,
  headers?: Record<string, string>
) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const socket = new MockSocket();
  const req = new IncomingMessage(socket as never);
  req.method = method;
  req.url = path;
  req.headers = {
    ...(payload
      ? {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(payload))
        }
      : {}),
    ...(headers ?? {})
  };
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
    res.on("error", reject);
    targetApp(req as never, res as never, (error?: unknown) => {
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

describe("human review HTTP surface", () => {
  it("rejects operator workbench reads without the internal token", async () => {
    const response = await requestJson("GET", "/api/human-review/ops/queue");

    expect(response.status).toBe(403);
    expect(response.json.error).toBe("internal_api_forbidden");
  });

  it("returns an empty operator queue when no active review exists", async () => {
    const isolatedTempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-ops-empty-"));
    const previous = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;

    try {
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
        isolatedTempDir,
        "human-reviews.json"
      );
      const isolatedApp = await createApp();
      const response = await requestJson(
        "GET",
        "/api/human-review/ops/queue",
        undefined,
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );

      expect(response.status).toBe(200);
      expect(response.json.queue).toEqual([]);
      expect(response.json.capabilities.learningFeedback).toBe("available");
    } finally {
      if (previous) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previous;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
      }
      await rm(isolatedTempDir, { recursive: true, force: true });
    }
  });

  it("returns active operator queue and detail read models from existing review state", async () => {
    const created = await requestJson("POST", "/api/cases/s2-tr-spb/human-review", {
      channel: "email",
      contact: "ops@example.com",
      message: "Нужна операторская проверка evidence по кейсу."
    });
    expect(created.status).toBe(200);

    const queue = await requestJson(
      "GET",
      "/api/human-review/ops/queue",
      undefined,
      app,
      { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
    );
    expect(queue.status).toBe(200);
    const item = queue.json.queue.find(
      (entry: { requestId: string }) => entry.requestId === created.json.request.id
    );
    expect(item).toBeTruthy();
    expect(item.currentVerdict).toBe("HUMAN_REVIEW");
    expect(item.currentEvidenceStatus).toBe("conflicting");
    expect(item.blockerCount).toBeGreaterThan(0);

    const detail = await requestJson(
      "GET",
      `/api/human-review/ops/requests/${created.json.request.id}`,
      undefined,
      app,
      { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
    );
    expect(detail.status).toBe(200);
    expect(detail.json.detail.request.id).toBe(created.json.request.id);
    expect(detail.json.detail.currentResult.verdict).toBe("HUMAN_REVIEW");
    expect(detail.json.detail.blockingReasons.length).toBeGreaterThan(0);
    expect(detail.json.detail.learning.source).toBe("learning_api");
    const moveInReview = detail.json.detail.operatorNextActions.find(
      (action: { id: string }) => action.id === "move_in_review"
    );
    expect(moveInReview.transitionStatus).toBe("in_review");
  });

  it("executes operator workbench actions and captures learning on terminal resolve", async () => {
    const isolatedTempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-ops-action-"));
    const previousReviewFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
    const previousLearningFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;

    try {
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
        isolatedTempDir,
        "human-reviews.json"
      );
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = path.join(
        isolatedTempDir,
        "human-review-learning.json"
      );
      const isolatedApp = await createApp();
      const created = await requestJson(
        "POST",
        "/api/cases/s2-tr-spb/human-review",
        {
          channel: "email",
          contact: "ops-action@example.com",
          message: "Нужно проверить конфликтующие evidence-источники оператором."
        },
        isolatedApp
      );
      expect(created.status).toBe(200);

      const inReview = await requestJson(
        "POST",
        `/api/human-review/ops/requests/${created.json.request.id}/actions`,
        {
          actionId: "move_in_review",
          transitionStatus: "in_review",
          note: "Оператор взял кейс в работу."
        },
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(inReview.status).toBe(200);
      expect(inReview.json.detail.request.status).toBe("in_review");
      expect(inReview.json.detail.request.events.at(-1).changedBy).toBe("ops");
      expect(inReview.json.decisionRecordId).toBeNull();
      expect(inReview.json.learningFeedback).toBeNull();

      const resolved = await requestJson(
        "POST",
        `/api/human-review/ops/requests/${created.json.request.id}/actions`,
        {
          actionId: "mark_resolved",
          transitionStatus: "resolved",
          note: "Оператор закрыл конфликт evidence.",
          resolution: {
            summary: "Оператор подтвердил: автоматический совет не выдаём из-за конфликта источников."
          }
        },
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(resolved.status).toBe(200);
      expect(resolved.json.detail.request.status).toBe("resolved");
      expect(resolved.json.detail.request.resolution.changedBy).toBe("ops");
      expect(resolved.json.detail.request.resolution.postDecisionRecordId).toBe(
        resolved.json.decisionRecordId
      );
      expect(resolved.json.detail.operatorNextActions).toEqual([]);
      expect(resolved.json.decisionRecordId).toMatch(/^dec_s2-tr-spb_\d+$/);
      expect(resolved.json.learningFeedback.inserted).toBe(true);
      expect(resolved.json.learningFeedback.event.ingestedVia).toBe("terminal_resolution");
      expect(resolved.json.learningFeedback.event.rootCause).toBe("conflicting_evidence");

      const repeatedResolve = await requestJson(
        "POST",
        `/api/human-review/ops/requests/${created.json.request.id}/actions`,
        {
          actionId: "mark_resolved",
          transitionStatus: "resolved",
          note: "Повторная доставка того же действия.",
          resolution: {
            summary: "Оператор подтвердил: автоматический совет не выдаём из-за конфликта источников."
          }
        },
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(repeatedResolve.status).toBe(200);
      expect(repeatedResolve.json.decisionRecordId).toBe(resolved.json.decisionRecordId);
      expect(repeatedResolve.json.learningFeedback.inserted).toBe(false);
      expect(repeatedResolve.json.detail.request.status).toBe("resolved");

      const queue = await requestJson(
        "GET",
        "/api/human-review/ops/queue",
        undefined,
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(queue.status).toBe(200);
      expect(
        queue.json.queue.some(
          (entry: { requestId: string }) => entry.requestId === created.json.request.id
        )
      ).toBe(false);

      const learningSummary = await requestJson(
        "GET",
        "/api/human-review/learning/summary",
        undefined,
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(learningSummary.status).toBe(200);
      expect(learningSummary.json.totalEvents).toBe(1);
      expect(learningSummary.json.rootCauseCounts.conflicting_evidence).toBe(1);
    } finally {
      if (previousReviewFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previousReviewFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
      }
      if (previousLearningFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = previousLearningFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;
      }
      await rm(isolatedTempDir, { recursive: true, force: true });
    }
  });

  it("keeps the operator queue available when persisted review points to a missing case", async () => {
    const isolatedTempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-ops-orphan-"));
    const previous = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;

    try {
      const filePath = path.join(isolatedTempDir, "human-reviews.json");
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = filePath;
      await writeFile(
        filePath,
        `${JSON.stringify(
          [
            {
              id: "hr_missing-case_1",
              caseId: "missing-case",
              status: "submitted",
              channel: "email",
              contact: "ops@example.com",
              message: "Этот запрос ссылается на удалённый кейс.",
              createdAt: "2026-04-30T09:00:00.000Z",
              updatedAt: "2026-04-30T09:00:00.000Z",
              closedAt: null,
              durability: "persisted",
              snapshot: {
                decisionId: null,
                verdict: "HUMAN_REVIEW",
                confidence: 0,
                computedAt: "2026-04-30T09:00:00.000Z",
                lastCheckedAt: "2026-04-30T09:00:00.000Z",
                nextActionLabel: "Передать кейс менеджеру",
                summary: "Нужна ручная проверка."
              },
              events: [
                {
                  id: "hr_missing-case_1_submitted",
                  at: "2026-04-30T09:00:00.000Z",
                  type: "submitted",
                  status: "submitted",
                  changedBy: "traveler",
                  note: null
                }
              ]
            }
          ],
          null,
          2
        )}\n`,
        "utf8"
      );
      const isolatedApp = await createApp();

      const queue = await requestJson(
        "GET",
        "/api/human-review/ops/queue",
        undefined,
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );

      expect(queue.status).toBe(200);
      expect(queue.json.queue[0].itemStatus).toBe("orphaned_case");
      expect(queue.json.queue[0].caseId).toBe("missing-case");
      expect(queue.json.queue[0].recoveryLabel).toContain("кейс не найден");

      const detail = await requestJson(
        "GET",
        "/api/human-review/ops/requests/hr_missing-case_1",
        undefined,
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );

      expect(detail.status).toBe(404);
      expect(detail.json.error).toBe("case_not_found");
    } finally {
      if (previous) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previous;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
      }
      await rm(isolatedTempDir, { recursive: true, force: true });
    }
  });

  it("keeps terminal reviews out of the active queue while preserving operator detail", async () => {
    const created = await requestJson("POST", "/api/cases/s4-rf-residency-dnv/human-review", {
      channel: "telegram",
      contact: "@ops",
      message: "Закрываем ручную проверку через текущий transition-only lifecycle."
    });
    expect(created.status).toBe(200);

    const terminal = await requestJson(
      "POST",
      "/api/cases/s4-rf-residency-dnv/human-review/transition",
      {
        requestId: created.json.request.id,
        status: "resolved",
        note: "Оператор закрыл проверку.",
        resolution: {
          summary: "Оператор завершил проверку без автоматического пересчёта."
        }
      },
      app,
      { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
    );
    expect(terminal.status).toBe(200);

    const queue = await requestJson(
      "GET",
      "/api/human-review/ops/queue",
      undefined,
      app,
      { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
    );
    expect(queue.status).toBe(200);
    expect(
      queue.json.queue.some(
        (entry: { requestId: string }) => entry.requestId === created.json.request.id
      )
    ).toBe(false);

    const detail = await requestJson(
      "GET",
      `/api/human-review/ops/requests/${created.json.request.id}`,
      undefined,
      app,
      { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
    );
    expect(detail.status).toBe(200);
    expect(detail.json.detail.resolution.status).toBe("resolved");
    expect(detail.json.detail.resolution.mode).toBe("transition_only");
    expect(detail.json.detail.resolution.recompute).toBeNull();
  });

  it("creates one active request and reuses it on repeated submit", async () => {
    const first = await requestJson("POST", "/api/cases/s3-us-spb-business/human-review", {
      channel: "email",
      contact: "user@example.com",
      message: "Был отказ, хочу проверить кейс вручную."
    });
    expect(first.status).toBe(200);
    expect(first.json.reused).toBe(false);
    expect(first.json.request.status).toBe("submitted");

    const second = await requestJson("POST", "/api/cases/s3-us-spb-business/human-review", {
      channel: "telegram",
      contact: "@other_contact",
      message: "Повторная отправка не должна пересоздать запрос."
    });
    expect(second.status).toBe(200);
    expect(second.json.reused).toBe(true);
    expect(second.json.request.id).toBe(first.json.request.id);
    expect(second.json.request.contact).toBe("user@example.com");

    const fetched = await requestJson("GET", "/api/cases/s3-us-spb-business/human-review");
    expect(fetched.status).toBe(200);
    expect(fetched.json.request.id).toBe(first.json.request.id);
    expect(fetched.json.request.durability).toBe("persisted");

    const recomputed = await requestJson("POST", "/api/cases/s3-us-spb-business/recompute", {});
    expect(recomputed.status).toBe(200);

    const afterRecompute = await requestJson("GET", "/api/cases/s3-us-spb-business/human-review");
    expect(afterRecompute.status).toBe(200);
    expect(afterRecompute.json.request.id).toBe(first.json.request.id);
    expect(afterRecompute.json.request.durability).toBe("persisted");

    app = await createApp();

    const restarted = await requestJson("GET", "/api/cases/s3-us-spb-business/human-review");
    expect(restarted.status).toBe(200);
    expect(restarted.json.request.id).toBe(first.json.request.id);
    expect(restarted.json.request.durability).toBe("persisted");
  });

  it("rejects client-supplied changedBy at the public boundary", async () => {
    const response = await requestJson("POST", "/api/cases/s1-rf-italy/human-review", {
      channel: "email",
      contact: "user@example.com",
      message: "Проверьте спорный кейс.",
      changedBy: "ops"
    });

    expect(response.status).toBe(400);
  });

  it("allows the server-owned transition surface to move the request lifecycle", async () => {
    const created = await requestJson("POST", "/api/cases/s1-rf-italy/human-review", {
      channel: "email",
      contact: "ops@example.com",
      message: "Нужен ручной прогон кейса по внутреннему каналу."
    });

    expect(created.status).toBe(200);

    const inQueue = await requestJson("POST", "/api/cases/s1-rf-italy/human-review/transition", {
      requestId: created.json.request.id,
      status: "in_queue",
      note: "Передали в очередь."
    }, app, {
      "x-active-holidays-internal-token": INTERNAL_API_TOKEN
    });
    expect(inQueue.status).toBe(200);
    expect(inQueue.json.request.status).toBe("in_queue");
    expect(inQueue.json.request.events.at(-1).changedBy).toBe("system");

    const resolved = await requestJson("POST", "/api/cases/s1-rf-italy/human-review/transition", {
      requestId: created.json.request.id,
      status: "resolved",
      note: "Проверка завершена.",
      resolution: {
        summary: "Оператор завершил проверку и подтвердил следующий безопасный шаг."
      }
    }, app, {
      "x-active-holidays-internal-token": INTERNAL_API_TOKEN
    });
    expect(resolved.status).toBe(200);
    expect(resolved.json.request.status).toBe("resolved");
    expect(resolved.json.request.closedAt).toBeTruthy();

    const invalid = await requestJson("POST", "/api/cases/s1-rf-italy/human-review/transition", {
      requestId: created.json.request.id,
      status: "cancelled",
      note: "После terminal state менять нельзя."
    }, app, {
      "x-active-holidays-internal-token": INTERNAL_API_TOKEN
    });
    expect(invalid.status).toBe(409);
    expect(invalid.json.error).toBe("human_review_invalid_transition");
  });

  it("returns a recomputed canonical result when operator resolves a scenario handoff", async () => {
    const created = await requestJson("POST", "/api/cases/s2-tr-spb/human-review", {
      channel: "email",
      contact: "resolution@example.com",
      message: "Нужно проверить human-review-only сценарий и вернуть честный итог.",
      scenarioId: "human-review"
    });

    expect(created.status).toBe(200);
    expect(created.json.request.handoff.scenarioId).toBe("human-review");

    const resolved = await requestJson("POST", "/api/cases/s2-tr-spb/human-review/transition", {
      requestId: created.json.request.id,
      status: "resolved",
      note: "Оператор проверил кейс. Автоматический совет не выдаём.",
      resolution: {
        summary: "Проверка завершена: кейс остаётся только для ручного сопровождения."
      }
    }, app, {
      "x-active-holidays-internal-token": INTERNAL_API_TOKEN
    });

    expect(resolved.status).toBe(200);
    expect(resolved.json.request.status).toBe("resolved");
    expect(resolved.json.request.resolution.summary).toContain("Проверка завершена");
    expect(resolved.json.result.version).toBe("rdc.v1");
    expect(resolved.json.result.caseId).toBe("s2-tr-spb");
    expect(resolved.json.decisionRecordId).toMatch(/^dec_s2-tr-spb_\d+$/);
  });

  it("rejects transition requests without the internal token", async () => {
    const created = await requestJson("POST", "/api/cases/s2-tr-spb/human-review", {
      channel: "email",
      contact: "user@example.com",
      message: "Нужна повторная проверка спорного кейса."
    });

    expect(created.status).toBe(200);

    const forbidden = await requestJson("POST", "/api/cases/s2-tr-spb/human-review/transition", {
      requestId: created.json.request.id,
      status: "in_queue",
      note: "Попытка без внутреннего токена."
    });

    expect(forbidden.status).toBe(403);
    expect(forbidden.json.error).toBe("internal_api_forbidden");
  });

  it("starts with an empty review state when persisted storage is corrupted", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-corrupt-"));
    const corruptFile = path.join(tempDir, "human-reviews.json");
    const previous = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;

    try {
      await writeFile(corruptFile, "{broken json", "utf8");
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = corruptFile;

      const corruptedApp = await createApp();
      const response = await requestJson(
        "GET",
        "/api/cases/s2-tr-spb/human-review",
        undefined,
        corruptedApp
      );

      expect(response.status).toBe(200);
      expect(response.json.request).toBeNull();

      const entries = await readdir(tempDir);
      expect(entries.some((entry) => entry.startsWith("human-reviews.json.corrupt-"))).toBe(true);
    } finally {
      if (previous) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previous;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("captures learning feedback when operator resolves a review and keeps repeated resolve idempotent", async () => {
    const isolatedTempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-learning-"));
    const previousReviewFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
    const previousLearningFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;

    try {
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
        isolatedTempDir,
        "human-reviews.json"
      );
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = path.join(
        isolatedTempDir,
        "human-review-learning.json"
      );
      const isolatedApp = await createApp();

      const created = await requestJson(
        "POST",
        "/api/cases/s2-tr-spb/human-review",
        {
          channel: "email",
          contact: "learning@example.com",
          message: "Нужно разобрать конфликт источников и сохранить learning feedback."
        },
        isolatedApp
      );
      expect(created.status).toBe(200);

      const resolved = await requestJson(
        "POST",
        "/api/cases/s2-tr-spb/human-review/transition",
        {
          requestId: created.json.request.id,
          status: "resolved",
          note: "Оператор проверил конфликт источников.",
          resolution: {
            summary: "Причина закрытия: источники конфликтуют, автоматический совет не выдаём."
          }
        },
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(resolved.status).toBe(200);
      expect(resolved.json.learningFeedback.event.ingestedVia).toBe("terminal_resolution");
      expect(resolved.json.learningFeedback.event.rootCause).toBe("conflicting_evidence");
      expect(resolved.json.learningFeedback.inserted).toBe(true);

      const laterRecompute = await requestJson(
        "POST",
        "/api/cases/s2-tr-spb/recompute",
        {},
        isolatedApp
      );
      expect(laterRecompute.status).toBe(200);

      const repeated = await requestJson(
        "POST",
        "/api/cases/s2-tr-spb/human-review/transition",
        {
          requestId: created.json.request.id,
          status: "resolved",
          note: "Оператор проверил конфликт источников.",
          resolution: {
            summary: "Причина закрытия: источники конфликтуют, автоматический совет не выдаём."
          }
        },
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(repeated.status).toBe(200);
      expect(repeated.json.request.id).toBe(created.json.request.id);
      expect(repeated.json.decisionRecordId).toBe(resolved.json.decisionRecordId);
      expect(repeated.json.learningFeedback.inserted).toBe(false);
      expect(repeated.json.learningFeedback.event.eventId).toBe(
        resolved.json.learningFeedback.event.eventId
      );

      const events = await requestJson(
        "GET",
        "/api/human-review/learning/events",
        undefined,
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(events.status).toBe(200);
      expect(events.json.totalEvents).toBe(1);
      expect(events.json.limit).toBe(50);
      expect(events.json.offset).toBe(0);
      expect(events.json.events).toHaveLength(1);
      expect(events.json.events[0].sourceCatalogMutation.applied).toBe(false);
    } finally {
      if (previousReviewFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previousReviewFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
      }
      if (previousLearningFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = previousLearningFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;
      }
      await rm(isolatedTempDir, { recursive: true, force: true });
    }
  });

  it("keeps manual learning ingest idempotent and rejects conflicting replay payloads", async () => {
    const isolatedTempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-ingest-"));
    const previousReviewFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
    const previousLearningFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;

    const event = {
      version: "human-review-learning.v1",
      ingestedVia: "admin_import",
      ingestReason: "Verified test import.",
      ingestedAt: "2026-04-30T10:01:00.000Z",
      requestId: "hr_manual_1",
      caseId: "case_manual",
      capturedAt: "2026-04-30T10:01:00.000Z",
      resolvedAt: "2026-04-30T10:00:00.000Z",
      eventId: "hrl_hr_manual_1_2026-04-30T10:00:00.000Z",
      resolutionSummary: "Оператор закрыл проверку после ручного разбора.",
      rootCause: "missing_evidence",
      rootCauseLabel: "Не хватает доказательной базы",
      fixedSignals: [],
      evidenceGaps: [],
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
      postDecisionRecordId: null,
      sourceCatalogMutation: {
        allowed: false,
        applied: false
      }
    };

    try {
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
        isolatedTempDir,
        "human-reviews.json"
      );
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = path.join(
        isolatedTempDir,
        "human-review-learning.json"
      );
      const isolatedApp = await createApp();

      const first = await requestJson(
        "POST",
        "/api/human-review/learning/ingest",
        { mode: "admin_import", reason: "Verified test import.", event },
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(first.status).toBe(200);
      expect(first.json.inserted).toBe(true);
      expect(first.json.event.ingestedVia).toBe("admin_import");
      expect(first.json.event.ingestReason).toBe("Verified test import.");

      const duplicate = await requestJson(
        "POST",
        "/api/human-review/learning/ingest",
        { mode: "admin_import", reason: "Verified test import.", event },
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(duplicate.status).toBe(200);
      expect(duplicate.json.inserted).toBe(false);

      const conflict = await requestJson(
        "POST",
        "/api/human-review/learning/ingest",
        {
          event: {
            ...event,
            resolutionSummary: "Другой payload с тем же eventId."
          },
          mode: "admin_import",
          reason: "Verified test import."
        },
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(conflict.status).toBe(409);
      expect(conflict.json.error).toBe("human_review_learning_conflict");
    } finally {
      if (previousReviewFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previousReviewFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
      }
      if (previousLearningFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = previousLearningFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;
      }
      await rm(isolatedTempDir, { recursive: true, force: true });
    }
  });

  it("returns deterministic learning aggregates and top blockers", async () => {
    const isolatedTempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-aggregates-"));
    const previousReviewFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
    const previousLearningFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;

    try {
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
        isolatedTempDir,
        "human-reviews.json"
      );
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = path.join(
        isolatedTempDir,
        "human-review-learning.json"
      );
      const isolatedApp = await createApp();

      for (const [index, rootCause] of ["stale_evidence", "stale_evidence", "missing_signal"].entries()) {
        const resolvedAt = `2026-04-30T10:0${index}:00.000Z`;
        const requestId = `hr_aggregate_${index}`;
        const event = {
          version: "human-review-learning.v1",
          ingestedVia: "admin_import",
          ingestReason: "Verified aggregate test import.",
          ingestedAt: resolvedAt,
          eventId: `hrl_${requestId}_${resolvedAt}`,
          requestId,
          caseId: `case_aggregate_${index}`,
          capturedAt: resolvedAt,
          resolvedAt,
          resolutionSummary: "Оператор закрыл проверку.",
          rootCause,
          rootCauseLabel: rootCause === "stale_evidence" ? "Источники устарели" : "Не хватает сигнала",
          fixedSignals: rootCause === "missing_signal" ? ["income"] : [],
          evidenceGaps: [
            {
              id: "EVIDENCE_GATE:visa_rule",
              label: "Evidence gate заблокировал visa_rule.",
              detail: "Повторяющийся blocker.",
              severity: "high",
              ruleId: "visa_rule"
            }
          ],
          verdictDelta: {
            before: "HUMAN_REVIEW",
            after: "HUMAN_REVIEW",
            changed: false
          },
          actionDelta: {
            beforeLabel: "Передать кейс менеджеру",
            afterLabel: index === 2 ? "Обновить данные" : "Передать кейс менеджеру",
            beforeType: "send_for_review",
            afterType: index === 2 ? "upload_missing_docs" : "send_for_review",
            changed: index === 2
          },
          confidenceDelta: 0,
          postDecisionRecordId: null,
          sourceCatalogMutation: {
            allowed: false,
            applied: false
          }
        };

        const response = await requestJson(
          "POST",
          "/api/human-review/learning/ingest",
          { mode: "admin_import", reason: "Verified aggregate test import.", event },
          isolatedApp,
          { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
        );
        expect(response.status).toBe(200);
      }

      const summary = await requestJson(
        "GET",
        "/api/human-review/learning/summary",
        undefined,
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(summary.status).toBe(200);
      expect(summary.json.totalEvents).toBe(3);
      expect(summary.json.rootCauseCounts.stale_evidence).toBe(2);
      expect(summary.json.actionDeltaCounts.changed).toBe(1);
      expect(summary.json.sourceCatalogMutationsApplied).toBe(0);

      const blockers = await requestJson(
        "GET",
        "/api/human-review/learning/top-blockers",
        undefined,
        isolatedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );
      expect(blockers.status).toBe(200);
      expect(blockers.json.blockers[0]).toMatchObject({
        id: "EVIDENCE_GATE:visa_rule",
        count: 3,
        severity: "high",
        dominantRootCause: "stale_evidence",
        rootCauseCounts: expect.objectContaining({
          stale_evidence: 2,
          missing_signal: 1
        })
      });
    } finally {
      if (previousReviewFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previousReviewFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
      }
      if (previousLearningFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = previousLearningFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;
      }
      await rm(isolatedTempDir, { recursive: true, force: true });
    }
  });

  it("starts with an empty learning log when persisted learning storage is corrupted", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-learning-corrupt-"));
    const corruptFile = path.join(tempDir, "human-review-learning.json");
    const previousReviewFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
    const previousLearningFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;

    try {
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
        tempDir,
        "human-reviews.json"
      );
      await writeFile(corruptFile, "{broken json", "utf8");
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = corruptFile;

      const corruptedApp = await createApp();
      const response = await requestJson(
        "GET",
        "/api/human-review/learning/events",
        undefined,
        corruptedApp,
        { "x-active-holidays-internal-token": INTERNAL_API_TOKEN }
      );

      expect(response.status).toBe(200);
      expect(response.json.totalEvents).toBe(0);
      expect(response.json.events).toEqual([]);

      const entries = await readdir(tempDir);
      expect(entries.some((entry) => entry.startsWith("human-review-learning.json.corrupt-"))).toBe(true);
    } finally {
      if (previousReviewFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previousReviewFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
      }
      if (previousLearningFile) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE = previousLearningFile;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
