import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import type { Server } from "node:http";
import {
  documentUploadResponseSchema,
  publicDocumentCheckSummarySchema
} from "@shared/contracts";
import { createApp } from "../index";
import { getCatalogsOrThrow, replaceCatalogsForTest } from "../lib/catalogs";
import { freshCatalogsForRouteTest } from "./testFreshCatalogs";
import { installStableRouteTestClock } from "./routeTestClock";

let app: Express;
let server: Server;
let baseUrl = "";
let restoreFreshCatalogs: (() => void) | null = null;
const INTERNAL_API_TOKEN = "test-internal-documents-token";
const previousInternalApiToken = process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;

beforeAll(async () => {
  process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = INTERNAL_API_TOKEN;
  app = await createApp();
  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

installStableRouteTestClock();

beforeEach(() => {
  restoreFreshCatalogs = replaceCatalogsForTest(
    freshCatalogsForRouteTest(getCatalogsOrThrow())
  );
});

afterEach(() => {
  restoreFreshCatalogs?.();
  restoreFreshCatalogs = null;
});

afterAll(async () => {
  if (previousInternalApiToken === undefined) {
    delete process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;
  } else {
    process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = previousInternalApiToken;
  }
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
});

function toBase64(bytes: number[] | Uint8Array): string {
  const content = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  return Buffer.from(content).toString("base64");
}

async function requestJson(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  options: { token?: string | null } = {}
) {
  const token = options.token === undefined ? INTERNAL_API_TOKEN : options.token;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body
        ? {
            "content-type": "application/json"
          }
        : {}),
      connection: "close",
      ...(token === null
        ? {}
        : {
            "x-active-holidays-internal-token": token
          })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const json = text.length > 0 ? JSON.parse(text) : null;
  return { status: response.status, json } as const;
}

async function createIsolatedCase(seed = "s1-rf-italy"): Promise<string> {
  const fork = await requestJson("POST", `/api/cases/${seed}/fork`, {
    title: `Документы тест ${Date.now()}-${Math.random()}`
  });
  expect(fork.status).toBe(200);
  expect(typeof fork.json.case.id).toBe("string");
  return fork.json.case.id as string;
}

function expectNoLeak(payload: unknown): void {
  const dumped = JSON.stringify(payload).toLowerCase();
  expect(dumped).not.toMatch(
    /auditreason|internalreason|magic|signature|ftyp|mz|token|verified|подтверждено|готово/i
  );
}

async function upload(caseId: string, payload: {
  kind: string;
  fileName: string;
  mimeType: string;
  contentBase64: string;
  sizeBytes: number;
}) {
  return requestJson("POST", `/api/cases/${caseId}/documents`, {
    ...payload,
    source: "user_file"
  });
}

describe("document intake HTTP surface", () => {
  it("accepts valid PDF upload", async () => {
    const caseId = await createIsolatedCase();
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const response = await upload(caseId, {
      kind: "passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      contentBase64: toBase64(pdf),
      sizeBytes: pdf.byteLength
    });

    expect([200, 201]).toContain(response.status);
    const parsed = documentUploadResponseSchema.parse(response.json);
    expect(parsed.uploadStatus).toBe("accepted");
    expect(["parsing_queued", "needs_review"]).toContain(parsed.status);
    expectNoLeak(parsed);
  });

  it("accepts valid PNG upload", async () => {
    const caseId = await createIsolatedCase();
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const response = await upload(caseId, {
      kind: "photo",
      fileName: "photo.png",
      mimeType: "image/png",
      contentBase64: toBase64(png),
      sizeBytes: png.byteLength
    });

    expect([200, 201]).toContain(response.status);
    const parsed = documentUploadResponseSchema.parse(response.json);
    expect(parsed.uploadStatus).toBe("accepted");
    expect(["parsing_queued", "needs_review"]).toContain(parsed.status);
    expectNoLeak(parsed);
  });

  it("accepts valid JPEG upload", async () => {
    const caseId = await createIsolatedCase();
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
    const response = await upload(caseId, {
      kind: "passport",
      fileName: "passport.jpg",
      mimeType: "image/jpeg",
      contentBase64: toBase64(jpeg),
      sizeBytes: jpeg.byteLength
    });

    expect([200, 201]).toContain(response.status);
    const parsed = documentUploadResponseSchema.parse(response.json);
    expect(parsed.uploadStatus).toBe("accepted");
    expect(["parsing_queued", "needs_review"]).toContain(parsed.status);
    expectNoLeak(parsed);
  });

  it("rejects unsafe filename traversal", async () => {
    const caseId = await createIsolatedCase();
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const response = await upload(caseId, {
      kind: "passport",
      fileName: "../passport.pdf",
      mimeType: "application/pdf",
      contentBase64: toBase64(pdf),
      sizeBytes: pdf.byteLength
    });

    expect(response.status).toBe(200);
    const parsed = documentUploadResponseSchema.parse(response.json);
    expect(parsed.uploadStatus).toBe("rejected");
    expect(parsed.status).toBe("check_failed");
    expectNoLeak(parsed);
  });

  it("rejects renamed executable invoice.exe.pdf", async () => {
    const caseId = await createIsolatedCase();
    const exe = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const response = await upload(caseId, {
      kind: "passport",
      fileName: "invoice.exe.pdf",
      mimeType: "application/pdf",
      contentBase64: toBase64(exe),
      sizeBytes: exe.byteLength
    });

    expect(response.status).toBe(200);
    const parsed = documentUploadResponseSchema.parse(response.json);
    expect(parsed.uploadStatus).toBe("rejected");
    expect(parsed.status).toBe("check_failed");
    expectNoLeak(parsed);
  });

  it("rejects invoice.exe .pdf", async () => {
    const caseId = await createIsolatedCase();
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const response = await upload(caseId, {
      kind: "passport",
      fileName: "invoice.exe .pdf",
      mimeType: "application/pdf",
      contentBase64: toBase64(pdf),
      sizeBytes: pdf.byteLength
    });

    expect(response.status).toBe(200);
    const parsed = documentUploadResponseSchema.parse(response.json);
    expect(parsed.uploadStatus).toBe("rejected");
    expect(parsed.status).toBe("check_failed");
    expectNoLeak(parsed);
  });

  it("rejects invoice.exe NBSP .pdf", async () => {
    const caseId = await createIsolatedCase();
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const response = await upload(caseId, {
      kind: "passport",
      fileName: "invoice.exe\u00A0.pdf",
      mimeType: "application/pdf",
      contentBase64: toBase64(pdf),
      sizeBytes: pdf.byteLength
    });

    expect(response.status).toBe(200);
    const parsed = documentUploadResponseSchema.parse(response.json);
    expect(parsed.uploadStatus).toBe("rejected");
    expect(parsed.status).toBe("check_failed");
    expectNoLeak(parsed);
  });

  it("rejects unsupported MIME", async () => {
    const caseId = await createIsolatedCase();
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const response = await upload(caseId, {
      kind: "passport",
      fileName: "passport.pdf",
      mimeType: "text/plain",
      contentBase64: toBase64(pdf),
      sizeBytes: pdf.byteLength
    });

    expect(response.status).toBe(200);
    const parsed = documentUploadResponseSchema.parse(response.json);
    expect(parsed.uploadStatus).toBe("rejected");
    expect(parsed.status).toBe("check_failed");
    expectNoLeak(parsed);
  });

  it("rejects oversized file", async () => {
    const caseId = await createIsolatedCase();
    const content = new Uint8Array(10 * 1024 * 1024 + 1);
    content.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const response = await upload(caseId, {
      kind: "passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      contentBase64: toBase64(content),
      sizeBytes: content.byteLength
    });

    expect(response.status).toBe(200);
    const parsed = documentUploadResponseSchema.parse(response.json);
    expect(parsed.uploadStatus).toBe("rejected");
    expect(parsed.status).toBe("check_failed");
    expectNoLeak(parsed);
  });

  it("returns safe empty summary", async () => {
    const caseId = await createIsolatedCase();
    const response = await requestJson("GET", `/api/cases/${caseId}/documents/summary`);

    expect(response.status).toBe(200);
    const parsed = publicDocumentCheckSummarySchema.parse(response.json);
    expect(parsed.uploadedCount).toBe(0);
    expect(parsed.acceptedCount).toBe(0);
    expect(parsed.rejectedCount).toBe(0);
    expect(parsed.needsReviewCount).toBe(0);
    expect(parsed.publicEvidenceChips).toContain("Документы: не загружены");
    expectNoLeak(parsed);
  });

  it("returns safe evidence chips after one accepted file", async () => {
    const caseId = await createIsolatedCase();
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

    const uploadResponse = await upload(caseId, {
      kind: "passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      contentBase64: toBase64(pdf),
      sizeBytes: pdf.byteLength
    });
    expect([200, 201]).toContain(uploadResponse.status);

    const summaryResponse = await requestJson("GET", `/api/cases/${caseId}/documents/summary`);
    expect(summaryResponse.status).toBe(200);

    const parsed = publicDocumentCheckSummarySchema.parse(summaryResponse.json);
    expect(parsed.uploadedCount).toBe(1);
    expect(parsed.acceptedCount).toBe(1);
    expect(parsed.documentKindsSeen).toContain("passport");
    expect(parsed.publicEvidenceChips.some((chip) => chip.includes("Документы: 1 файл добавлен"))).toBe(true);
    expect(parsed.publicEvidenceChips).toContain("Источник: файл пользователя");
    expect(parsed.publicEvidenceChips.some((chip) => chip.startsWith("Паспорт:"))).toBe(true);
    expectNoLeak(parsed);
  });

  it("rejects POST upload without internal token", async () => {
    const caseId = await createIsolatedCase();
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const response = await requestJson(
      "POST",
      `/api/cases/${caseId}/documents`,
      {
        kind: "passport",
        fileName: "passport.pdf",
        mimeType: "application/pdf",
        contentBase64: toBase64(pdf),
        sizeBytes: pdf.byteLength,
        source: "user_file"
      },
      { token: null }
    );
    expect(response.status).toBe(403);
    expect(response.json?.error).toBe("internal_api_forbidden");
  });

  it("rejects GET summary with invalid internal token", async () => {
    const caseId = await createIsolatedCase();
    const response = await requestJson(
      "GET",
      `/api/cases/${caseId}/documents/summary`,
      undefined,
      { token: "invalid-test-token" }
    );
    expect(response.status).toBe(403);
    expect(response.json?.error).toBe("internal_api_forbidden");
  });

  it("rejects GET documents list without internal token", async () => {
    const caseId = await createIsolatedCase();
    const response = await requestJson(
      "GET",
      `/api/cases/${caseId}/documents`,
      undefined,
      { token: null }
    );
    expect(response.status).toBe(403);
    expect(response.json?.error).toBe("internal_api_forbidden");
  });

  it("rejects GET documents list with invalid internal token", async () => {
    const caseId = await createIsolatedCase();
    const response = await requestJson(
      "GET",
      `/api/cases/${caseId}/documents`,
      undefined,
      { token: "invalid-test-token" }
    );
    expect(response.status).toBe(403);
    expect(response.json?.error).toBe("internal_api_forbidden");
  });

  it("returns 503 when internal token is not configured", async () => {
    const caseId = await createIsolatedCase();
    const previous = process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;
    delete process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;

    try {
      const response = await requestJson("GET", `/api/cases/${caseId}/documents/summary`);
      expect(response.status).toBe(503);
      expect(response.json?.error).toBe("internal_api_unconfigured");
    } finally {
      if (previous === undefined) {
        delete process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;
      } else {
        process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = previous;
      }
    }
  });
});
