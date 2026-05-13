import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import {
  DOCUMENT_UPLOAD_ALLOWED_EXTENSIONS,
  validateDocumentUpload
} from "./documentUploadSecurity";
import { runDocumentParserStub } from "./documentParserStub";
import type { StoredDocumentIntakeEntry } from "./caseStore";
import type {
  DocumentAsset,
  DocumentCheckRun,
  DocumentCheckStatus,
  DocumentKind,
  DocumentRequirement,
  DocumentUploadRequest,
  DocumentUploadResponse,
  PublicDocumentCheckItem,
  PublicDocumentCheckSummary
} from "@shared/contracts";

const DEFAULT_UPLOAD_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;

const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  passport: "Паспорт",
  bank_statement: "Банковская выписка",
  hotel_booking: "Бронь отеля",
  insurance: "Страховка",
  flight_or_route: "Перелёт/маршрут",
  visa_form: "Визовая анкета",
  photo: "Фото",
  unknown: "Документ"
};

type BuildIntakeEntryInput = {
  caseId: string;
  request: DocumentUploadRequest;
  now?: Date;
};

export class DocumentIntakeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentIntakeInputError";
  }
}

function buildRequirement(kind: DocumentKind): DocumentRequirement {
  return {
    id: `doc_req_${kind}`,
    kind,
    label: DOCUMENT_KIND_LABELS[kind],
    required: kind !== "unknown",
    acceptedExtensions: [...DOCUMENT_UPLOAD_ALLOWED_EXTENSIONS],
    acceptedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"],
    maxSizeBytes: DEFAULT_UPLOAD_SIZE_LIMIT_BYTES,
    guidance: null
  };
}

function decodeBase64(contentBase64: string): Uint8Array {
  const normalized = contentBase64.replace(/\s+/g, "");
  if (!normalized) {
    throw new DocumentIntakeInputError("contentBase64 пустой или повреждён.");
  }
  if (normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(normalized)) {
    throw new DocumentIntakeInputError("contentBase64 не прошёл валидацию формата.");
  }
  const buffer = Buffer.from(normalized, "base64");
  if (buffer.byteLength === 0) {
    throw new DocumentIntakeInputError("contentBase64 декодирован в пустой файл.");
  }
  return Uint8Array.from(buffer);
}

function safeRejectedFileName(raw: string): string {
  const normalized = raw.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/gu, "").trim();
  const base = path.posix.basename(normalized.replace(/\\/g, "/"));
  if (!base || base === "." || base === "..") {
    return "rejected_upload.unknown";
  }
  return base;
}

function rejectedExtension(rawName: string): DocumentAsset["extension"] {
  const normalized = rawName.normalize("NFKC");
  const dot = normalized.lastIndexOf(".");
  if (dot === -1) return "unknown";
  const extension = normalized.slice(dot + 1).trim().toLowerCase();
  if ((DOCUMENT_UPLOAD_ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return extension as DocumentAsset["extension"];
  }
  return "unknown";
}

function nextStepFromStatus(status: DocumentCheckStatus, uploadStatus: "accepted" | "rejected"): PublicDocumentCheckItem["nextStep"] {
  if (uploadStatus === "rejected") return "replace_file";
  if (status === "needs_review") return "human_review";
  if (status === "check_failed") return "replace_file";
  if (status === "parsing_queued") return "none";
  return "none";
}

function statusForChip(entry: StoredDocumentIntakeEntry): string {
  if (entry.uploadStatus === "rejected" || entry.run.status === "check_failed") {
    return "файл отклонён";
  }
  if (entry.run.status === "needs_review") {
    return "ожидает проверки";
  }
  return "файл принят";
}

function pluralizeFiles(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} файл добавлен`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} файла добавлено`;
  return `${count} файлов добавлено`;
}

function toPublicItem(entry: StoredDocumentIntakeEntry): PublicDocumentCheckItem {
  return {
    kind: entry.run.asset.kind,
    status: entry.run.status,
    publicMessage: entry.run.publicMessage,
    nextStep: nextStepFromStatus(entry.run.status, entry.uploadStatus),
    deterministicOwner: "engine",
    aiBoundary: "explanation_only"
  };
}

export function buildDocumentIntakeEntry(input: BuildIntakeEntryInput): {
  entry: StoredDocumentIntakeEntry;
  response: DocumentUploadResponse;
} {
  const now = input.now ?? new Date();
  const uploadedAt = now.toISOString();
  const content = decodeBase64(input.request.contentBase64);
  if (content.byteLength !== input.request.sizeBytes) {
    throw new DocumentIntakeInputError("sizeBytes не совпадает с размером contentBase64.");
  }

  const uploadValidation = validateDocumentUpload({
    filename: input.request.fileName,
    mimeType: input.request.mimeType,
    content,
    sizeLimitBytes: DEFAULT_UPLOAD_SIZE_LIMIT_BYTES
  });

  const uploadStatus: "accepted" | "rejected" = uploadValidation.status;
  const parserResult = runDocumentParserStub({
    documentId: randomUUID(),
    documentKind: input.request.kind,
    uploadStatus
  });

  const normalizedMime = input.request.mimeType.trim().toLowerCase() || "application/octet-stream";
  const normalizedFileName =
    uploadValidation.status === "accepted"
      ? uploadValidation.normalizedFileName
      : safeRejectedFileName(input.request.fileName);

  const asset: DocumentAsset = {
    id: `doc_${randomUUID()}`,
    caseId: input.caseId,
    kind: input.request.kind,
    originalFileName: input.request.fileName,
    normalizedFileName,
    extension:
      uploadValidation.status === "accepted"
        ? uploadValidation.extension
        : rejectedExtension(input.request.fileName),
    mimeType: normalizedMime,
    sizeBytes: content.byteLength,
    sha256: createHash("sha256").update(content).digest("hex"),
    uploadedAt
  };

  const status: DocumentCheckStatus =
    uploadValidation.status === "accepted" ? parserResult.status : "check_failed";
  const run: DocumentCheckRun = {
    runId: `dcr_${randomUUID()}`,
    caseId: input.caseId,
    asset,
    requirement: buildRequirement(input.request.kind),
    provider: {
      id: "deterministic_stub",
      mode: "local",
      supportsOcr: false,
      supportsCloudStorage: false,
      canVerifyAuthenticity: false
    },
    status,
    findings: [],
    extractedFields: [],
    publicMessage:
      uploadValidation.status === "accepted"
        ? parserResult.publicMessage
        : uploadValidation.publicMessage,
    internalReason:
      uploadValidation.status === "accepted"
        ? `upload:${uploadValidation.auditReason};parser:${parserResult.auditReason}`
        : `upload_rejected:${uploadValidation.auditReason}`,
    deterministicOwner: "engine",
    aiBoundary: "explanation_only",
    createdAt: uploadedAt,
    completedAt: status === "parsing_queued" ? null : uploadedAt
  };

  const publicItem = toPublicItem({
    caseId: input.caseId,
    asset,
    run,
    uploadStatus
  });

  const response: DocumentUploadResponse = {
    caseId: input.caseId,
    runId: run.runId,
    assetId: asset.id,
    kind: asset.kind,
    uploadStatus,
    status: run.status,
    publicMessage: run.publicMessage,
    nextStep: publicItem.nextStep,
    source: "user_file",
    uploadedAt,
    deterministicOwner: "engine",
    aiBoundary: "explanation_only"
  };

  return {
    entry: {
      caseId: input.caseId,
      asset,
      run,
      uploadStatus
    },
    response
  };
}

export function buildPublicDocumentSummary(args: {
  caseId: string;
  entries: StoredDocumentIntakeEntry[];
}): PublicDocumentCheckSummary {
  const uploadedCount = args.entries.length;
  const acceptedCount = args.entries.filter((entry) => entry.uploadStatus === "accepted").length;
  const rejectedCount = args.entries.filter((entry) => entry.uploadStatus === "rejected").length;
  const needsReviewCount = args.entries.filter((entry) => {
    return entry.run.status === "needs_review" || entry.run.status === "parsing_queued";
  }).length;

  const latestByKind = new Map<DocumentKind, StoredDocumentIntakeEntry>();
  for (const entry of args.entries) {
    if (!latestByKind.has(entry.asset.kind)) {
      latestByKind.set(entry.asset.kind, entry);
    }
  }

  const items = Array.from(latestByKind.values()).map((entry) => toPublicItem(entry));
  const documentKindsSeen = Array.from(latestByKind.keys());

  const publicEvidenceChips: string[] = [];
  if (uploadedCount === 0) {
    publicEvidenceChips.push("Документы: не загружены");
  } else {
    publicEvidenceChips.push(`Документы: ${pluralizeFiles(uploadedCount)}`);
    for (const entry of latestByKind.values()) {
      publicEvidenceChips.push(`${DOCUMENT_KIND_LABELS[entry.asset.kind]}: ${statusForChip(entry)}`);
    }
    publicEvidenceChips.push("Источник: файл пользователя");
  }

  return {
    caseId: args.caseId,
    uploadedCount,
    acceptedCount,
    rejectedCount,
    needsReviewCount,
    documentKindsSeen,
    items,
    publicEvidenceChips,
    deterministicOwner: "engine",
    aiBoundary: "explanation_only"
  };
}
