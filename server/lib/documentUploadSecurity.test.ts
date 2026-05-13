import { describe, expect, it } from "vitest";
import {
  validateDocumentUpload,
  type DocumentUploadValidationInput
} from "./documentUploadSecurity";
import {
  applyDeterministicStatusUpdate,
  runDocumentParserStub
} from "./documentParserStub";

function bytes(values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

function buildInput(
  overrides: Partial<DocumentUploadValidationInput> = {}
): DocumentUploadValidationInput {
  const content = overrides.content ?? bytes([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  return {
    filename: overrides.filename ?? "passport.pdf",
    mimeType: overrides.mimeType ?? "application/pdf",
    content,
    sizeLimitBytes: overrides.sizeLimitBytes ?? 5 * 1024 * 1024
  };
}

describe("document upload security and trust boundary", () => {
  it("valid PDF accepted", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "passport.pdf",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])
      })
    );
    expect(result.status).toBe("accepted");
  });

  it("valid PNG accepted", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "photo.png",
        mimeType: "image/png",
        content: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      })
    );
    expect(result.status).toBe("accepted");
  });

  it("valid JPEG accepted", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        content: bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])
      })
    );
    expect(result.status).toBe("accepted");
  });

  it("WEBP accepted", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "doc.webp",
        mimeType: "image/webp",
        content: bytes([0x52, 0x49, 0x46, 0x46, 0x18, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
      })
    );
    expect(result.status).toBe("accepted");
  });

  it("HEIC best-effort accepted when signature fits", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "doc.heic",
        mimeType: "image/heic",
        content: bytes([
          0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0x00, 0x00,
          0x00, 0x00
        ])
      })
    );
    expect(result.status).toBe("accepted");
  });

  it("unsafe filename rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "../secrets/passport.pdf"
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("unsafe_filename");
  });

  it(".exe rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "payload.exe",
        mimeType: "application/x-msdownload",
        content: bytes([0x4d, 0x5a, 0x90, 0x00])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("unsupported_extension");
  });

  it("renamed exe.pdf rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "payload.exe.pdf",
        mimeType: "application/pdf",
        content: bytes([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("unsafe_filename");
    }
  });

  it("invoice.exe .pdf rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "invoice.exe .pdf",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("unsafe_filename");
    }
  });

  it("invoice.exe NBSP .pdf rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "invoice.exe\u00A0.pdf",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("unsafe_filename");
    }
  });

  it("invoice.ExE .pdf rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "invoice.ExE .pdf",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("unsafe_filename");
    }
  });

  it("invoice.exe zero-width-space .pdf rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "invoice.exe\u200B.pdf",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("unsafe_filename");
    }
  });

  it("invoice.e x e.pdf rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "invoice.e x e.pdf",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("unsafe_filename");
    }
  });

  it("invoice.cyrillic-еxе.pdf rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "invoice.\u0435x\u0435.pdf",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("unsafe_filename");
    }
  });

  it("invoice.greek-εxε.pdf rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "invoice.\u03B5x\u03B5.pdf",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("unsafe_filename");
    }
  });

  it("executable tail extension rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "payload.pdf.exe",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("unsupported_extension");
    }
  });

  it("unsupported MIME rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "passport.pdf",
        mimeType: "text/plain"
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("unsupported_mime");
  });

  it("oversized file rejected", () => {
    const largePdf = new Uint8Array(1024 * 1024 + 1);
    largePdf.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const result = validateDocumentUpload(
      buildInput({
        filename: "passport.pdf",
        mimeType: "application/pdf",
        content: largePdf,
        sizeLimitBytes: 1024 * 1024
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("file_too_large");
  });

  it("invalid size limit rejected", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "passport.pdf",
        mimeType: "application/pdf",
        content: bytes([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]),
        sizeLimitBytes: Number.NaN
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("file_too_large");
    }
  });

  it("unknown document kind safe", () => {
    const parseResult = runDocumentParserStub({
      documentId: "doc-1",
      documentKind: "unknown",
      uploadStatus: "accepted"
    });
    expect(parseResult.status).toBe("needs_review");
    expect(parseResult.outcome).toBe("unsupported");
    expect(parseResult.verified).toBe(false);
    expect(parseResult.ocrPerformed).toBe(false);
  });

  it("rejected upload becomes check_failed in parser stub", () => {
    const parseResult = runDocumentParserStub({
      documentId: "doc-2",
      documentKind: "passport",
      uploadStatus: "rejected"
    });
    expect(parseResult.status).toBe("check_failed");
    expect(parseResult.outcome).toBe("upload_rejected");
    expect(parseResult.verified).toBe(false);
    expect(parseResult.ocrPerformed).toBe(false);
  });

  it("public messages leak no internal details", () => {
    const result = validateDocumentUpload(
      buildInput({
        filename: "payload.exe.pdf",
        mimeType: "application/pdf",
        content: bytes([0x4d, 0x5a, 0x90, 0x00])
      })
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.publicMessage.length).toBeGreaterThan(0);
      expect(result.auditReason.length).toBeGreaterThan(0);
      expect(result.publicMessage).not.toBe(result.auditReason);
      expect(result.publicMessage).not.toMatch(
        /signature|magic|mismatch|ftyp|mz|internal|audit|reason/i
      );
    }
  });

  it("AI cannot mark deterministic fields verified", () => {
    const current = "rejected";
    const aiRequested = "accepted";
    const protectedStatus = applyDeterministicStatusUpdate({
      currentStatus: current,
      requestedStatus: aiRequested,
      owner: "ai"
    });
    expect(protectedStatus).toBe("rejected");
  });
});
