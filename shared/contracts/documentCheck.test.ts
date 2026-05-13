import { describe, expect, it } from "vitest";
import {
  documentKindSchema,
  documentCheckRunSchema,
  documentCheckStatusSchema,
  publicDocumentCheckItemSchema,
  documentUploadRequestSchema,
  documentUploadResponseSchema,
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
    const parsed = publicDocumentCheckItemSchema.parse({
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

  it("defines public-safe upload request and response contracts", () => {
    const request = documentUploadRequestSchema.parse({
      kind: "passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1200,
      contentBase64: "JVBERi0xLjc=",
      source: "user_file"
    });
    expect(request.kind).toBe("passport");

    const response = documentUploadResponseSchema.parse({
      caseId: "case-1",
      runId: "run-1",
      assetId: "asset-1",
      kind: "passport",
      uploadStatus: "accepted",
      status: "parsing_queued",
      publicMessage: "Документ принят в очередь на технический разбор.",
      nextStep: "human_review",
      source: "user_file",
      uploadedAt: "2026-05-13T08:00:00.000Z",
      deterministicOwner: "engine",
      aiBoundary: "explanation_only"
    });
    expect(response.uploadStatus).toBe("accepted");
  });

  it("defines public-safe summary shape for UI evidence chips", () => {
    const summary = publicDocumentCheckSummarySchema.parse({
      caseId: "case-1",
      uploadedCount: 1,
      acceptedCount: 1,
      rejectedCount: 0,
      needsReviewCount: 1,
      documentKindsSeen: ["passport"],
      items: [
        {
          kind: "passport",
          status: "parsing_queued",
          publicMessage: "Документ принят в очередь на технический разбор.",
          nextStep: "human_review",
          deterministicOwner: "engine",
          aiBoundary: "explanation_only"
        }
      ],
      publicEvidenceChips: [
        "Документы: 1 файл добавлен",
        "Паспорт: ожидает проверки",
        "Источник: файл пользователя"
      ],
      deterministicOwner: "engine",
      aiBoundary: "explanation_only"
    });
    expect(summary.uploadedCount).toBe(1);
    expect(summary.publicEvidenceChips).toContain("Источник: файл пользователя");
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
