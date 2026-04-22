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
      note: "Проверка завершена."
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
});
