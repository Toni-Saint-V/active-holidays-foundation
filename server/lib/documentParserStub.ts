import type { DocumentCheckStatus, DocumentKind } from "@shared/contracts";

export type DocumentParserProvider = "stub_deterministic";

export type DocumentParserStubInput = {
  documentId: string;
  documentKind: DocumentKind;
  uploadStatus: Extract<DocumentCheckStatus, "accepted" | "rejected">;
};

export type DocumentParserStubOutcome =
  | "queued_for_parser"
  | "needs_manual_review"
  | "unsupported"
  | "upload_rejected";

export type DocumentParserStubResult = {
  documentId: string;
  status: Extract<DocumentCheckStatus, "parsing_queued" | "needs_review" | "check_failed">;
  outcome: DocumentParserStubOutcome;
  provider: DocumentParserProvider;
  deterministic: true;
  ownership: "runtime_deterministic";
  ocrPerformed: false;
  verified: false;
  extractedFields: [];
  publicMessage: string;
  auditReason: string;
};

const PARSER_SUPPORTED_KINDS = new Set<DocumentKind>([
  "passport",
  "bank_statement",
  "hotel_booking",
  "insurance",
  "flight_or_route",
  "visa_form",
  "photo"
]);

export function runDocumentParserStub(
  input: DocumentParserStubInput
): DocumentParserStubResult {
  if (input.uploadStatus === "rejected") {
    return {
      documentId: input.documentId,
      status: "check_failed",
      outcome: "upload_rejected",
      provider: "stub_deterministic",
      deterministic: true,
      ownership: "runtime_deterministic",
      ocrPerformed: false,
      verified: false,
      extractedFields: [],
      publicMessage: "Документ отклонён на этапе загрузки. Исправьте файл и повторите загрузку.",
      auditReason: "parser_stub_upload_rejected"
    };
  }

  if (!PARSER_SUPPORTED_KINDS.has(input.documentKind)) {
    return {
      documentId: input.documentId,
      status: "needs_review",
      outcome: "unsupported",
      provider: "stub_deterministic",
      deterministic: true,
      ownership: "runtime_deterministic",
      ocrPerformed: false,
      verified: false,
      extractedFields: [],
      publicMessage:
        "Авторазбор для этого типа документа недоступен. Передайте кейс на ручную проверку.",
      auditReason: `parser_stub_unsupported_kind:${input.documentKind}`
    };
  }

  return {
    documentId: input.documentId,
    status: "parsing_queued",
    outcome: "queued_for_parser",
    provider: "stub_deterministic",
    deterministic: true,
    ownership: "runtime_deterministic",
    ocrPerformed: false,
    verified: false,
    extractedFields: [],
    publicMessage: "Документ принят в очередь на технический разбор.",
    auditReason: `parser_stub_queued:${input.documentKind}`
  };
}

export type DeterministicStatusOwner = "runtime" | "ai";

const RUNTIME_OWNED_DETERMINISTIC_STATUSES = new Set<DocumentCheckStatus>([
  "accepted",
  "rejected",
  "needs_review",
  "parsing_queued",
  "parsed",
  "check_failed"
]);

export function applyDeterministicStatusUpdate(args: {
  currentStatus: DocumentCheckStatus;
  requestedStatus: DocumentCheckStatus;
  owner: DeterministicStatusOwner;
}): DocumentCheckStatus {
  if (
    args.owner === "ai" &&
    RUNTIME_OWNED_DETERMINISTIC_STATUSES.has(args.currentStatus) &&
    args.requestedStatus !== args.currentStatus
  ) {
    return args.currentStatus;
  }
  return args.requestedStatus;
}
