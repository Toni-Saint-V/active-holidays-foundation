import path from "node:path";

export const DOCUMENT_UPLOAD_ALLOWED_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "heic"
] as const;

export type DocumentUploadAllowedExtension =
  (typeof DOCUMENT_UPLOAD_ALLOWED_EXTENSIONS)[number];

export type DocumentUploadDetectedFormat =
  | "pdf"
  | "png"
  | "jpeg"
  | "webp"
  | "heic"
  | "unknown";

export type DocumentUploadValidationStatus = "accepted" | "rejected";

export type DocumentUploadRejectReason =
  | "file_too_large"
  | "unsupported_extension"
  | "unsupported_mime"
  | "unsafe_filename"
  | "magic_signature_mismatch"
  | "unknown_magic_signature";

export type DocumentUploadValidationInput = {
  filename: string;
  mimeType: string;
  content: Uint8Array;
  sizeLimitBytes: number;
};

export type DocumentUploadValidationSuccess = {
  status: "accepted";
  publicMessage: string;
  auditReason: string;
  normalizedFileName: string;
  extension: DocumentUploadAllowedExtension;
  mimeType: string;
  detectedFormat: Exclude<DocumentUploadDetectedFormat, "unknown">;
  sizeBytes: number;
};

export type DocumentUploadValidationFailure = {
  status: "rejected";
  reason: DocumentUploadRejectReason;
  publicMessage: string;
  auditReason: string;
};

export type DocumentUploadValidationResult =
  | DocumentUploadValidationSuccess
  | DocumentUploadValidationFailure;

const EXTENSION_TO_ALLOWED_MIME: Record<
  DocumentUploadAllowedExtension,
  readonly string[]
> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  heic: ["image/heic", "image/heif"]
};

const MIME_TO_CANONICAL_EXTENSIONS: Record<string, readonly DocumentUploadAllowedExtension[]> =
  Object.freeze({
    "application/pdf": ["pdf"],
    "image/png": ["png"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/webp": ["webp"],
    "image/heic": ["heic"],
    "image/heif": ["heic"]
  });

const EXECUTABLE_SEGMENTS = new Set([
  "exe",
  "msi",
  "bat",
  "cmd",
  "com",
  "scr",
  "ps1",
  "jar",
  "js",
  "vbs",
  "dll",
  "sh"
]);

const CONFUSABLE_ASCII_CODEPOINT_MAP = new Map<number, string>([
  [0x03b5, "e"], // Greek epsilon
  [0x0430, "a"], // Cyrillic a
  [0x0435, "e"], // Cyrillic e
  [0x043e, "o"], // Cyrillic o
  [0x0440, "p"], // Cyrillic er
  [0x0441, "c"], // Cyrillic es
  [0x0445, "x"], // Cyrillic ha
  [0x0443, "y"], // Cyrillic u
  [0x0456, "i"], // Cyrillic i
  [0x0458, "j"], // Cyrillic je
  [0x0455, "s"] // Cyrillic dze
]);

function normalizeMimeType(raw: string): string {
  return raw.trim().toLowerCase().split(";", 1)[0] ?? "";
}

function fail(
  reason: DocumentUploadRejectReason,
  auditReason: string
): DocumentUploadValidationFailure {
  const publicMessageByReason: Record<DocumentUploadRejectReason, string> = {
    file_too_large: "Файл слишком большой. Уменьшите размер и повторите загрузку.",
    unsupported_extension:
      "Формат файла не поддерживается. Используйте PDF, PNG, JPG, WEBP или HEIC.",
    unsupported_mime:
      "Тип файла не поддерживается. Загрузите документ в поддерживаемом формате.",
    unsafe_filename:
      "Имя файла небезопасно. Переименуйте файл и повторите попытку.",
    magic_signature_mismatch:
      "Содержимое файла не совпадает с заявленным форматом.",
    unknown_magic_signature:
      "Не удалось подтвердить формат файла. Загрузите исходный файл без преобразований."
  };

  return {
    status: "rejected",
    reason,
    publicMessage: publicMessageByReason[reason],
    auditReason
  };
}

function hasControlCharacters(value: string): boolean {
  return /[\u0000-\u001F\u007F]/u.test(value);
}

function normalizeExecutableSegment(segment: string): string {
  const normalized = segment
    .normalize("NFKC")
    .replace(/[\p{White_Space}\p{Cf}]+/gu, "")
    .toLowerCase();

  let skeleton = "";
  for (const char of normalized) {
    const codePoint = char.codePointAt(0);
    skeleton +=
      (codePoint === undefined ? undefined : CONFUSABLE_ASCII_CODEPOINT_MAP.get(codePoint)) ??
      char;
  }
  return skeleton;
}

function validateFileName(input: string):
  | { ok: true; normalizedFileName: string }
  | { ok: false; auditReason: string } {
  const normalized = input.normalize("NFKC").trim();
  if (!normalized) {
    return { ok: false, auditReason: "filename_empty_after_normalization" };
  }

  if (hasControlCharacters(normalized)) {
    return { ok: false, auditReason: "filename_contains_control_chars" };
  }

  if (normalized.includes("/") || normalized.includes("\\")) {
    return { ok: false, auditReason: "filename_contains_path_separator" };
  }

  if (normalized.includes("..")) {
    return { ok: false, auditReason: "filename_contains_path_traversal_sequence" };
  }

  const baseName = path.posix.basename(normalized);
  if (!baseName || baseName === "." || baseName === "..") {
    return { ok: false, auditReason: "filename_has_empty_basename" };
  }

  const segments = baseName.split(".").filter(Boolean);
  if (segments.length >= 2) {
    const nonFinalSegments = segments.slice(0, -1);
    if (
      nonFinalSegments.some((segment) =>
        EXECUTABLE_SEGMENTS.has(normalizeExecutableSegment(segment))
      )
    ) {
      return {
        ok: false,
        auditReason: `filename_contains_suspicious_double_extension:${baseName}`
      };
    }
  }

  return { ok: true, normalizedFileName: baseName };
}

function extensionFromFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return fileName.slice(dotIndex + 1).trim().toLowerCase();
}

function isAllowedExtension(value: string): value is DocumentUploadAllowedExtension {
  return (DOCUMENT_UPLOAD_ALLOWED_EXTENSIONS as readonly string[]).includes(value);
}

function hasPrefix(data: Uint8Array, prefix: readonly number[]): boolean {
  if (data.length < prefix.length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (data[index] !== prefix[index]) return false;
  }
  return true;
}

function asciiAt(data: Uint8Array, start: number, end: number): string {
  if (data.length < end) return "";
  return String.fromCharCode(...Array.from(data.slice(start, end)));
}

export function detectDocumentFormat(content: Uint8Array): DocumentUploadDetectedFormat {
  if (content.length === 0) return "unknown";

  if (hasPrefix(content, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  if (hasPrefix(content, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (hasPrefix(content, [0xff, 0xd8, 0xff])) return "jpeg";

  const riff = asciiAt(content, 0, 4);
  const webp = asciiAt(content, 8, 12);
  if (riff === "RIFF" && webp === "WEBP") return "webp";

  const ftyp = asciiAt(content, 4, 8);
  const brand = asciiAt(content, 8, 12);
  if (ftyp === "ftyp") {
    const heifBrands = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);
    if (heifBrands.has(brand)) return "heic";
  }

  return "unknown";
}

function hasExecutableSignature(content: Uint8Array): boolean {
  return hasPrefix(content, [0x4d, 0x5a]); // "MZ"
}

function extensionMatchesDetectedFormat(
  extension: DocumentUploadAllowedExtension,
  detectedFormat: Exclude<DocumentUploadDetectedFormat, "unknown">
): boolean {
  if (detectedFormat === "jpeg") {
    return extension === "jpg" || extension === "jpeg";
  }
  return extension === detectedFormat;
}

function mimeMatchesDetectedFormat(
  mimeType: string,
  detectedFormat: Exclude<DocumentUploadDetectedFormat, "unknown">
): boolean {
  if (detectedFormat === "jpeg") return mimeType === "image/jpeg";
  if (detectedFormat === "heic") return mimeType === "image/heic" || mimeType === "image/heif";

  const canonical = MIME_TO_CANONICAL_EXTENSIONS[mimeType];
  return Array.isArray(canonical) && canonical.includes(detectedFormat as DocumentUploadAllowedExtension);
}

export function validateDocumentUpload(
  input: DocumentUploadValidationInput
): DocumentUploadValidationResult {
  if (!Number.isFinite(input.sizeLimitBytes) || input.sizeLimitBytes <= 0) {
    return fail("file_too_large", `invalid_size_limit:${input.sizeLimitBytes}`);
  }

  const fileNameResult = validateFileName(input.filename);
  if (!fileNameResult.ok) {
    return fail("unsafe_filename", fileNameResult.auditReason);
  }

  const normalizedFileName = fileNameResult.normalizedFileName;
  const extension = extensionFromFileName(normalizedFileName);
  if (!isAllowedExtension(extension)) {
    return fail(
      "unsupported_extension",
      `extension_not_allowlisted:${extension || "<missing>"}`
    );
  }

  const mimeType = normalizeMimeType(input.mimeType);
  const allowedMimes = EXTENSION_TO_ALLOWED_MIME[extension];
  if (!allowedMimes.includes(mimeType)) {
    return fail(
      "unsupported_mime",
      `mime_not_allowed_for_extension:${mimeType || "<missing>"}:${extension}`
    );
  }

  const sizeBytes = input.content.byteLength;
  if (sizeBytes <= 0) {
    return fail("unknown_magic_signature", "file_empty_or_unreadable");
  }

  if (sizeBytes > input.sizeLimitBytes) {
    return fail(
      "file_too_large",
      `file_size_exceeded:${sizeBytes}>${input.sizeLimitBytes}`
    );
  }

  const detectedFormat = detectDocumentFormat(input.content);
  if (detectedFormat === "unknown") {
    if (hasExecutableSignature(input.content)) {
      return fail(
        "magic_signature_mismatch",
        `executable_signature_mismatch:${extension}:${mimeType}`
      );
    }
    return fail("unknown_magic_signature", `magic_signature_unknown:${extension}:${mimeType}`);
  }

  if (!extensionMatchesDetectedFormat(extension, detectedFormat)) {
    return fail(
      "magic_signature_mismatch",
      `extension_mismatch:${extension}:${detectedFormat}`
    );
  }

  if (!mimeMatchesDetectedFormat(mimeType, detectedFormat)) {
    return fail(
      "magic_signature_mismatch",
      `mime_mismatch:${mimeType}:${detectedFormat}`
    );
  }

  return {
    status: "accepted",
    publicMessage: "Файл принят. Выполняем безопасную техническую проверку.",
    auditReason: `accepted:${extension}:${mimeType}:${detectedFormat}`,
    normalizedFileName,
    extension,
    mimeType,
    detectedFormat,
    sizeBytes
  };
}
