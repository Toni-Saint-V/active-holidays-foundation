import {
  caseSignalsSchema,
  type CaseAccessCredential,
  type CaseSignals,
  type ProductType,
  type TravelPurpose
} from "@shared/contracts";
import { apiClient } from "./apiClient";
import { defaultCaseIdForProduct } from "./caseDefaults";

const VALID_COUNTRIES = new Set(["IT", "ES", "FR", "GR"] as const);
const RU_TRAVEL_PURPOSE_TO_ENUM: Record<string, TravelPurpose> = {
  "Туризм": "tourism",
  "По работе": "business",
  "К родственникам": "family",
  "Спорт/событие": "tourism"
};

export const FORBIDDEN_RESULT_TRUTH_QUERY_KEYS = [
  "verdict",
  "resultType",
  "analysisConfidence",
  "documentsUploaded",
  "days"
] as const;

type ForbiddenTruthQueryKey = (typeof FORBIDDEN_RESULT_TRUTH_QUERY_KEYS)[number];

export type TravelIntakeDraft = {
  country?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  purpose?: string | null;
  hadRefusal?: boolean | null;
  refusalContext?: string | null;
};

export type ExtractedTravelIntakeDraft = {
  draft: TravelIntakeDraft;
  ignoredTruthQueryKeys: ForbiddenTruthQueryKey[];
};

export type CaseBoundFlowOutcome = {
  caseId: string;
  caseAccessToken: string;
  baseCaseId: string;
  productType: "travel";
  reusedExistingCase: boolean;
  patchedSignalIds: string[];
  ignoredTruthQueryKeys: ForbiddenTruthQueryKey[];
};

export type CaseBoundFlowClient = {
  forkCaseWithSignals: (
    id: string,
    payload: { title?: string; signals?: CaseSignals }
  ) => Promise<{ case: { id: string; productType: ProductType }; access?: CaseAccessCredential }>;
  patchSignals: (
    id: string,
    signals: CaseSignals
  ) => Promise<{ case: { id: string; productType: ProductType }; access?: CaseAccessCredential }>;
};

export type CreateOrReuseTravelCaseInput = {
  draft: TravelIntakeDraft;
  existingCaseId?: string | null;
  baseCaseId?: string;
  forkTitle?: string;
  now?: Date;
  ignoredTruthQueryKeys?: ForbiddenTruthQueryKey[];
  existingCaseAccessToken?: string | null;
};

function parseCountry(value: string | null | undefined): "IT" | "ES" | "FR" | "GR" {
  const upper = value?.toUpperCase();
  if (upper && VALID_COUNTRIES.has(upper as "IT" | "ES" | "FR" | "GR")) {
    return upper as "IT" | "ES" | "FR" | "GR";
  }
  return "IT";
}

function isValidIsoDate(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

function parsePurpose(value: string | null | undefined): TravelPurpose {
  if (!value) return "tourism";
  if (value === "tourism" || value === "business" || value === "study" || value === "family" || value === "transit") {
    return value;
  }
  return RU_TRAVEL_PURPOSE_TO_ENUM[value] ?? "tourism";
}

function parseBoolean(value: string | null | undefined): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function weeksUntil(departureDate: string, now: Date): number {
  const departure = new Date(`${departureDate}T00:00:00.000Z`);
  const ms = departure.getTime() - now.getTime();
  const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  return Math.max(0, Math.min(104, Math.ceil(days / 7)));
}

export function extractTravelIntakeDraftFromQuery(
  params: URLSearchParams
): ExtractedTravelIntakeDraft {
  const ignoredTruthQueryKeys = FORBIDDEN_RESULT_TRUTH_QUERY_KEYS.filter((key) =>
    params.has(key)
  );

  const country = parseCountry(params.get("country"));
  const departureDateRaw = params.get("departure");
  const returnDateRaw = params.get("return");
  const purposeRaw = params.get("purpose");
  const hadRefusalRaw = params.get("hadRefusal");
  const refusalContextRaw = params.get("refusalContext");

  return {
    draft: {
      country,
      departureDate: isValidIsoDate(departureDateRaw) ? departureDateRaw : null,
      returnDate: isValidIsoDate(returnDateRaw) ? returnDateRaw : null,
      purpose: purposeRaw,
      hadRefusal: parseBoolean(hadRefusalRaw),
      refusalContext: refusalContextRaw?.trim() || null
    },
    ignoredTruthQueryKeys
  };
}

export function buildTravelSignalPatchSet(
  draft: TravelIntakeDraft,
  now = new Date()
): CaseSignals {
  const capturedAt = now.toISOString();
  const departureDate = isValidIsoDate(draft.departureDate) ? draft.departureDate : null;

  const patches: CaseSignals = [
    {
      id: "citizenship",
      value: "RU",
      source: "user",
      capturedAt
    },
    {
      id: "destination",
      value: parseCountry(draft.country),
      source: "user",
      capturedAt
    },
    {
      id: "travel_purpose",
      value: parsePurpose(draft.purpose),
      source: "user",
      capturedAt
    }
  ];

  if (departureDate) {
    patches.push({
      id: "timeline_weeks",
      value: weeksUntil(departureDate, now),
      source: "user",
      capturedAt
    });
  }

  patches.sort((a, b) => a.id.localeCompare(b.id));
  return caseSignalsSchema.parse(patches);
}

export async function createOrReuseTravelCaseFromIntakeDraft(
  input: CreateOrReuseTravelCaseInput,
  client: CaseBoundFlowClient = apiClient
): Promise<CaseBoundFlowOutcome> {
  const productType: "travel" = "travel";
  const baseCaseId = input.baseCaseId ?? defaultCaseIdForProduct(productType);
  const signals = buildTravelSignalPatchSet(input.draft, input.now);

  const existingCaseId = input.existingCaseId?.trim();
  const reusedExistingCase = Boolean(existingCaseId);

  const response = reusedExistingCase
    ? await client.patchSignals(existingCaseId as string, signals)
    : await client.forkCaseWithSignals(baseCaseId, {
        title: input.forkTitle,
        signals
      });

  const caseAccessToken = resolveCaseAccessToken({
    response,
    caseId: response.case.id,
    fallbackToken: input.existingCaseAccessToken
  });
  if (!caseAccessToken) {
    throw new Error("Сервер не вернул access credential для case-bound потока.");
  }

  if (response.case.productType !== "travel") {
    throw new Error(
      `Ожидался travel-кейс, но получен ${response.case.productType}.`
    );
  }

  return {
    caseId: response.case.id,
    caseAccessToken,
    baseCaseId,
    productType,
    reusedExistingCase,
    patchedSignalIds: signals.map((signal) => signal.id),
    ignoredTruthQueryKeys: input.ignoredTruthQueryKeys ?? []
  };
}

function resolveCaseAccessToken(input: {
  response: { case: { id: string }; access?: CaseAccessCredential };
  caseId: string;
  fallbackToken?: string | null;
}): string | null {
  const access = input.response.access;
  if (access && access.caseId === input.caseId) {
    return access.accessToken;
  }
  const fallback = input.fallbackToken?.trim();
  if (fallback && fallback.length >= 24) {
    return fallback;
  }
  return null;
}
