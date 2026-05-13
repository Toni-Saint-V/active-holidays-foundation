import { describe, expect, it } from "vitest";
import {
  documentKindSchema,
  documentCheckRunSchema,
  documentCheckStatusSchema,
  publicDocumentCheckSummarySchema
} from "./documentCheck";

describe("document check contract", () => {
  it("defines the document kind set exactly", () => {
    expect(documentKindSchema.options).toEqual([
      "passport",
      "bank_statement",
      "hotel_booking",
      "insurance",
      "flight_or_route",
      "visa_form",
      "photo",
      "unknown"
    ]);
  });

  it("defines the deterministic status set exactly", () => {
    expect(documentCheckStatusSchema.options).toEqual([
      "accepted",
      "rejected",
      "needs_review",
      "parsing_queued",
      "parsed",
      "check_failed"
    ]);
  });

  it("keeps deterministic ownership with the engine and AI explanation-only", () => {
    const parsed = publicDocumentCheckSummarySchema.parse({
      kind: "passport",
      status: "needs_review",
      publicMessage: "Нужна ручная проверка качества изображения.",
      nextStep: "human_review",
      deterministicOwner: "engine",
      aiBoundary: "explanation_only"
    });

    expect(parsed.deterministicOwner).toBe("engine");
    expect(parsed.aiBoundary).toBe("explanation_only");
  });

  it("rejects non-contract deterministic status like verified", () => {
    const parsed = documentCheckRunSchema.safeParse({
      runId: "run-1",
      caseId: "case-1",
      asset: {
        id: "asset-1",
        caseId: "case-1",
        kind: "passport",
        originalFileName: "passport.pdf",
        normalizedFileName: "passport.pdf",
        extension: "pdf",
        mimeType: "application/pdf",
        sizeBytes: 1000,
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        uploadedAt: "2026-05-13T08:00:00.000Z"
      },
      requirement: null,
      provider: {
        id: "deterministic_stub",
        mode: "local",
        supportsOcr: false,
        supportsCloudStorage: false,
        canVerifyAuthenticity: false
      },
      status: "verified",
      findings: [],
      extractedFields: [],
      publicMessage: "ok",
      internalReason: "ok",
      deterministicOwner: "engine",
      aiBoundary: "explanation_only",
      createdAt: "2026-05-13T08:00:00.000Z",
      completedAt: null
    });

    expect(parsed.success).toBe(false);
  });
});
