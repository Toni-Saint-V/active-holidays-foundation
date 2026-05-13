import { z } from "zod";

export const documentKindSchema = z.enum([
  "passport",
  "bank_statement",
  "hotel_booking",
  "insurance",
  "flight_or_route",
  "visa_form",
  "photo",
  "unknown"
]);
export type DocumentKind = z.infer<typeof documentKindSchema>;

export const documentCheckStatusSchema = z.enum([
  "accepted",
  "rejected",
  "needs_review",
  "parsing_queued",
  "parsed",
  "check_failed"
]);
export type DocumentCheckStatus = z.infer<typeof documentCheckStatusSchema>;

export const documentCheckSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type DocumentCheckSeverity = z.infer<typeof documentCheckSeveritySchema>;

export const documentFileExtensionSchema = z.enum([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "heic"
]);
export type DocumentFileExtension = z.infer<typeof documentFileExtensionSchema>;

export const documentAssetSchema = z
  .object({
    id: z.string().min(1),
    caseId: z.string().min(1),
    kind: documentKindSchema,
    originalFileName: z.string().min(1),
    normalizedFileName: z.string().min(1),
    extension: documentFileExtensionSchema,
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    uploadedAt: z.string().datetime()
  })
  .strict();
export type DocumentAsset = z.infer<typeof documentAssetSchema>;

export const documentRequirementSchema = z
  .object({
    id: z.string().min(1),
    kind: documentKindSchema,
    label: z.string().min(1),
    required: z.boolean(),
    acceptedExtensions: z.array(documentFileExtensionSchema).min(1),
    acceptedMimeTypes: z.array(z.string().min(1)).min(1),
    maxSizeBytes: z.number().int().min(1),
    guidance: z.string().min(1).nullable()
  })
  .strict();
export type DocumentRequirement = z.infer<typeof documentRequirementSchema>;

export const extractedFieldSchema = z
  .object({
    key: z.string().min(1),
    value: z.string().min(1),
    source: z.enum(["metadata", "deterministic_parser", "user_input"]),
    status: z.enum(["parsed", "needs_review"]),
    note: z.string().min(1).nullable()
  })
  .strict();
export type ExtractedField = z.infer<typeof extractedFieldSchema>;

export const documentCheckFindingSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    severity: documentCheckSeveritySchema,
    fieldKey: z.string().min(1).nullable(),
    publicMessage: z.string().min(1),
    internalReason: z.string().min(1),
    deterministic: z.literal(true)
  })
  .strict();
export type DocumentCheckFinding = z.infer<typeof documentCheckFindingSchema>;

export const documentParserProviderSchema = z
  .object({
    id: z.literal("deterministic_stub"),
    mode: z.literal("local"),
    supportsOcr: z.literal(false),
    supportsCloudStorage: z.literal(false),
    canVerifyAuthenticity: z.literal(false)
  })
  .strict();
export type DocumentParserProvider = z.infer<typeof documentParserProviderSchema>;

export const documentCheckRunSchema = z
  .object({
    runId: z.string().min(1),
    caseId: z.string().min(1),
    asset: documentAssetSchema,
    requirement: documentRequirementSchema.nullable(),
    provider: documentParserProviderSchema,
    status: documentCheckStatusSchema,
    findings: z.array(documentCheckFindingSchema),
    extractedFields: z.array(extractedFieldSchema),
    publicMessage: z.string().min(1),
    internalReason: z.string().min(1),
    deterministicOwner: z.literal("engine"),
    aiBoundary: z.literal("explanation_only"),
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable()
  })
  .strict();
export type DocumentCheckRun = z.infer<typeof documentCheckRunSchema>;

export const publicDocumentCheckSummarySchema = z
  .object({
    kind: documentKindSchema,
    status: documentCheckStatusSchema,
    publicMessage: z.string().min(1),
    nextStep: z.enum(["none", "replace_file", "retry_upload", "human_review"]),
    deterministicOwner: z.literal("engine"),
    aiBoundary: z.literal("explanation_only")
  })
  .strict();
export type PublicDocumentCheckSummary = z.infer<typeof publicDocumentCheckSummarySchema>;

export const internalDocumentCheckAuditSchema = z
  .object({
    runId: z.string().min(1),
    caseId: z.string().min(1),
    status: documentCheckStatusSchema,
    provider: documentParserProviderSchema,
    internalReason: z.string().min(1),
    findings: z.array(documentCheckFindingSchema),
    deterministicOwner: z.literal("engine"),
    aiBoundary: z.literal("explanation_only"),
    policyVersion: z.literal("document-check.v1"),
    createdAt: z.string().datetime()
  })
  .strict();
export type InternalDocumentCheckAudit = z.infer<typeof internalDocumentCheckAuditSchema>;
