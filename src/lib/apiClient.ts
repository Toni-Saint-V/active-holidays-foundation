import { z } from "zod";
import {
  CASE_ACCESS_HEADER,
  caseSchema,
  caseAccessCredentialSchema,
  resultPayloadSchema,
  intakeQueueSchema,
  intakePreviewSchema,
  decisionsLogSchema,
  ruleMetadataSchema,
  ruleResultSchema,
  sourcesCatalogSchema,
  sourceSchema,
  auditTrailSchema,
  caseSummarySchema,
  documentsReadinessSchema,
  caseOverrideSchema,
  caseSignalsSchema,
  humanReviewCreateRequestSchema,
  humanReviewCreateResponseSchema,
  humanReviewCasePacketResponseSchema,
  humanReviewResponseSchema,
  pathPreferencesSchema,
  recommendationDetailRequestSchema,
  recommendationDetailSchema,
  recommendationShortlistSchema,
  scenarioLabFamilySchema,
  scenarioLabCompareRequestSchema,
  scenarioLabCompareResponseSchema,
  scenarioLabPayloadSchema,
  offersSchema,
  productTypeSchema,
  verdictSchema,
  actionTypeSchema,
  type Case,
  type CaseOverride,
  type CaseSignals,
  type CaseSummary,
  type DecisionLogEntry,
  type HumanReviewCreateRequest,
  type HumanReviewCasePacket,
  type HumanReviewRequest,
  type IntakePreview,
  type IntakeQueue,
  type Offer,
  type PathPreferences,
  type ProductType,
  type RecommendationDetail,
  type RecommendationShortlist,
  type ResultPayload,
  type RuleMetadata,
  type ScenarioLabCompareRequest,
  type ScenarioLabCompareResponse,
  type ScenarioLabFamily,
  type ScenarioLabPayload,
  type Source
} from "@shared/contracts";
import { getCaseAccessToken } from "./caseAccessSession";

const DEFAULT_BASE = (() => {
  if (typeof window === "undefined") return "http://localhost:3001";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3001`;
})();

let baseUrl = DEFAULT_BASE;

export function configureApiBase(url: string): void {
  baseUrl = url;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
  }
}

async function request<Schema extends z.ZodTypeAny>(
  path: string,
  schema: Schema,
  init: RequestInit = {}
): Promise<z.infer<Schema>> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  if (!response.ok) {
    let code: string | undefined;
    let message = `Запрос ${path} завершился ошибкой ${response.status}.`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      if (body.message) message = body.message;
      code = body.error;
    } catch {
      // swallow
    }
    throw new ApiError(message, response.status, code);
  }
  const raw = (await response.json()) as unknown;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[apiClient] schema mismatch", path, parsed.error.issues);
    throw new ApiError(
      `Ответ ${path} не прошёл проверку схемы.`,
      200,
      "schema_mismatch"
    );
  }
  return parsed.data;
}

function withCaseAccessHeader(
  headers: RequestInit["headers"],
  caseId: string,
  explicitToken?: string
): RequestInit["headers"] {
  const token = explicitToken?.trim() || getCaseAccessToken(caseId);
  if (!token) return headers;
  return {
    ...(headers ?? {}),
    [CASE_ACCESS_HEADER]: token
  };
}

const caseListSchema = z.object({
  cases: z.array(caseSummarySchema)
});

const strictCaseSchema = caseSchema.extend({
  productType: productTypeSchema
});

const strictResultPayloadSchema = resultPayloadSchema.extend({
  productType: productTypeSchema,
  ruleResults: z.array(
    ruleResultSchema.extend({
      productType: productTypeSchema
    })
  )
});

const strictRuleMetadataSchema = ruleMetadataSchema.extend({
  productType: productTypeSchema
});

const strictScenarioLabPayloadSchema = scenarioLabPayloadSchema.extend({
  baseResult: strictResultPayloadSchema
});

const strictScenarioLabCompareResponseSchema = scenarioLabCompareResponseSchema.extend({
  candidateCase: strictCaseSchema
});

export const scenarioCardSchema = z.object({
  caseId: z.string(),
  productType: productTypeSchema,
  title: z.string(),
  subtitle: z.string(),
  expectedVerdict: verdictSchema,
  expectedActionType: actionTypeSchema,
  expectedPrimaryPath: z.string().nullable(),
  note: z.string()
});
export type ScenarioCard = z.infer<typeof scenarioCardSchema>;

const scenariosResponseSchema = z.object({
  scenarios: z.array(scenarioCardSchema)
});

const decisionsResponseSchema = z.object({ decisions: decisionsLogSchema });
const caseResultResponseSchema = z.object({
  case: strictCaseSchema,
  result: strictResultPayloadSchema,
  decisionRecordId: z.string().min(1).optional(),
  access: caseAccessCredentialSchema.optional()
});
export type CaseResultResponse = z.infer<typeof caseResultResponseSchema>;
const pathsResponseSchema = z.object({ paths: offersSchema });
const rulesResponseSchema = z.object({ rules: z.array(strictRuleMetadataSchema) });
const sourcesResponseSchema = z.object({ sources: sourcesCatalogSchema });
const auditResponseSchema = z.object({
  trail: auditTrailSchema,
  decisions: decisionsLogSchema
});

function withInternalToken(token: string): Record<string, string> {
  const normalized = token.trim();
  if (!normalized) {
    throw new Error("Internal API token is required for internal cases client.");
  }
  return {
    "x-active-holidays-internal-token": normalized
  };
}

export function createInternalCasesApiClient(internalApiToken: string) {
  const internalHeaders = withInternalToken(internalApiToken);

  return {
    async listCases(): Promise<CaseSummary[]> {
      const response = await request("/api/cases", caseListSchema, {
        headers: internalHeaders
      });
      return response.cases;
    },
    async decisions(): Promise<DecisionLogEntry[]> {
      const response = await request("/api/decisions", decisionsResponseSchema, {
        headers: internalHeaders
      });
      return response.decisions;
    },
    async audit(id: string, accessToken?: string) {
      return request(`/api/cases/${encodeURIComponent(id)}/audit`, auditResponseSchema, {
        headers: withCaseAccessHeader(internalHeaders, id, accessToken)
      });
    },
    async overrideSignal(
      id: string,
      override: CaseOverride,
      accessToken?: string
    ): Promise<CaseResultResponse> {
      return request(
        `/api/cases/${encodeURIComponent(id)}/override-signal`,
        caseResultResponseSchema,
        {
          method: "POST",
          body: JSON.stringify(override),
          headers: withCaseAccessHeader(internalHeaders, id, accessToken)
        }
      );
    },
    async humanReviewCasePacket(id: string, accessToken?: string): Promise<HumanReviewCasePacket> {
      const response = await request(
        `/api/cases/${encodeURIComponent(id)}/human-review/packet`,
        humanReviewCasePacketResponseSchema,
        {
          headers: withCaseAccessHeader(internalHeaders, id, accessToken)
        }
      );
      return response.packet;
    }
  };
}

export const apiClient = {
  async health() {
    return request(
      "/api/health",
      z.object({
        status: z.literal("ok"),
        service: z.literal("active-holidays-foundation"),
        phase: z.literal("m1"),
        version: z.literal("rdc.v1")
      })
    );
  },
  async getCase(id: string, accessToken?: string): Promise<Case> {
    return request(`/api/cases/${encodeURIComponent(id)}`, strictCaseSchema, {
      headers: withCaseAccessHeader(undefined, id, accessToken)
    });
  },
  async getResult(id: string, accessToken?: string): Promise<ResultPayload> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/result`,
      strictResultPayloadSchema,
      {
        headers: withCaseAccessHeader(undefined, id, accessToken)
      }
    );
  },
  async recommendationShortlist(id: string, accessToken?: string): Promise<RecommendationShortlist> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/recommendations/shortlist`,
      recommendationShortlistSchema,
      {
        headers: withCaseAccessHeader(undefined, id, accessToken)
      }
    );
  },
  async recommendationDetail(
    id: string,
    offerId: string,
    accessToken?: string
  ): Promise<RecommendationDetail> {
    const body = recommendationDetailRequestSchema.parse({ offerId });
    return request(
      `/api/cases/${encodeURIComponent(id)}/recommendations/detail`,
      recommendationDetailSchema,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: withCaseAccessHeader(undefined, id, accessToken)
      }
    );
  },
  async patchSignals(
    id: string,
    signals: CaseSignals,
    accessToken?: string
  ): Promise<CaseResultResponse> {
    return request(`/api/cases/${encodeURIComponent(id)}/signals`, caseResultResponseSchema, {
      method: "POST",
      body: JSON.stringify({ signals }),
      headers: withCaseAccessHeader(undefined, id, accessToken)
    });
  },
  async recompute(
    id: string,
    preferences?: PathPreferences,
    accessToken?: string
  ): Promise<CaseResultResponse> {
    return request(`/api/cases/${encodeURIComponent(id)}/recompute`, caseResultResponseSchema, {
      method: "POST",
      body: JSON.stringify({ preferences }),
      headers: withCaseAccessHeader(undefined, id, accessToken)
    });
  },
  async humanReview(id: string, accessToken?: string): Promise<HumanReviewRequest | null> {
    const response = await request(
      `/api/cases/${encodeURIComponent(id)}/human-review`,
      humanReviewResponseSchema,
      {
        headers: withCaseAccessHeader(undefined, id, accessToken)
      }
    );
    return response.request;
  },
  async submitHumanReview(
    id: string,
    payload: HumanReviewCreateRequest,
    accessToken?: string
  ) {
    const body = humanReviewCreateRequestSchema.parse(payload);
    return request(
      `/api/cases/${encodeURIComponent(id)}/human-review`,
      humanReviewCreateResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: withCaseAccessHeader(undefined, id, accessToken)
      }
    );
  },
  async documents(id: string, accessToken?: string) {
    return request(`/api/cases/${encodeURIComponent(id)}/documents`, documentsReadinessSchema, {
      headers: withCaseAccessHeader(undefined, id, accessToken)
    });
  },
  async fork(id: string, title?: string, accessToken?: string): Promise<CaseResultResponse> {
    return request(`/api/cases/${encodeURIComponent(id)}/fork`, caseResultResponseSchema, {
      method: "POST",
      body: JSON.stringify({ title }),
      headers: withCaseAccessHeader(undefined, id, accessToken)
    });
  },
  async forkCaseWithSignals(
    id: string,
    payload: { title?: string; signals?: CaseSignals } = {}
  ): Promise<CaseResultResponse> {
    const forked = await apiClient.fork(id, payload.title);
    if (!payload.signals || payload.signals.length === 0) {
      return forked;
    }
    const patched = await apiClient.patchSignals(
      forked.case.id,
      payload.signals,
      forked.access?.accessToken
    );
    if (patched.access) return patched;
    if (!forked.access) return patched;
    return { ...patched, access: forked.access };
  },
  async scenarioFamily(id: string, accessToken?: string): Promise<ScenarioLabFamily> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/scenarios`,
      scenarioLabFamilySchema,
      {
        headers: withCaseAccessHeader(undefined, id, accessToken)
      }
    );
  },
  async compareScenario(
    id: string,
    payload: ScenarioLabCompareRequest,
    accessToken?: string
  ): Promise<ScenarioLabCompareResponse> {
    const body = scenarioLabCompareRequestSchema.parse(payload);
    return request(
      `/api/cases/${encodeURIComponent(id)}/scenarios/compare`,
      strictScenarioLabCompareResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: withCaseAccessHeader(undefined, id, accessToken)
      }
    );
  },
  async decisionScenarioLab(id: string, accessToken?: string): Promise<ScenarioLabPayload> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/scenario-lab`,
      strictScenarioLabPayloadSchema,
      {
        headers: withCaseAccessHeader(undefined, id, accessToken)
      }
    );
  },
  async paths(caseId: string): Promise<Offer[]> {
    const response = await request(
      `/api/paths/${encodeURIComponent(caseId)}`,
      pathsResponseSchema
    );
    return response.paths;
  },
  async rules(): Promise<RuleMetadata[]> {
    const response = await request("/api/rules", rulesResponseSchema);
    return response.rules;
  },
  async rule(id: string): Promise<RuleMetadata> {
    return request(`/api/rules/${encodeURIComponent(id)}`, strictRuleMetadataSchema);
  },
  async sources(): Promise<Source[]> {
    const response = await request("/api/sources", sourcesResponseSchema);
    return response.sources;
  },
  async source(id: string): Promise<Source> {
    return request(`/api/sources/${encodeURIComponent(id)}`, sourceSchema);
  },
  async nextQuestion(caseId: string): Promise<IntakeQueue> {
    return request(`/api/intake/next-question`, intakeQueueSchema, {
      method: "POST",
      body: JSON.stringify({ caseId })
    });
  },
  async preview(caseId: string): Promise<IntakePreview> {
    return request(
      `/api/intake/preview/${encodeURIComponent(caseId)}`,
      intakePreviewSchema
    );
  },
  async scenarios(): Promise<ScenarioCard[]> {
    const response = await request("/api/scenarios", scenariosResponseSchema);
    return response.scenarios;
  }
};

export { caseOverrideSchema, caseSignalsSchema, pathPreferencesSchema };
export type { ProductType };
