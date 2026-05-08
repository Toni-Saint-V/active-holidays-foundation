import { z } from "zod";
import {
  humanReviewManagerBriefRequestSchema,
  humanReviewManagerBriefSchema,
  caseSchema,
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
  recommendationWhatIfBriefRequestSchema,
  recommendationWhatIfBriefSchema,
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
  type HumanReviewManagerBrief,
  type HumanReviewRequest,
  type IntakePreview,
  type IntakeQueue,
  type Offer,
  type PathPreferences,
  type ProductType,
  type RecommendationDetail,
  type RecommendationShortlist,
  type RecommendationWhatIfBrief,
  type ResultPayload,
  type RuleMetadata,
  type ScenarioLabCompareRequest,
  type ScenarioLabCompareResponse,
  type ScenarioLabFamily,
  type ScenarioLabPayload,
  type Source
} from "@shared/contracts";

const DEFAULT_BASE = (() => {
  if (typeof window === "undefined") return "http://localhost:3001";
  const envBase = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE;
  if (envBase && envBase.trim().length > 0) return envBase.trim().replace(/\/+$/, "");

  const { protocol, hostname, origin } = window.location;
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (isLocalHost) return `${protocol}//${hostname}:3001`;
  return origin;
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
  result: strictResultPayloadSchema
});
const pathsResponseSchema = z.object({ paths: offersSchema });
const rulesResponseSchema = z.object({ rules: z.array(strictRuleMetadataSchema) });
const sourcesResponseSchema = z.object({ sources: sourcesCatalogSchema });
const auditResponseSchema = z.object({
  trail: auditTrailSchema,
  decisions: decisionsLogSchema
});

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
  async listCases(): Promise<CaseSummary[]> {
    const response = await request("/api/cases", caseListSchema);
    return response.cases;
  },
  async getCase(id: string): Promise<Case> {
    return request(`/api/cases/${encodeURIComponent(id)}`, strictCaseSchema);
  },
  async getResult(id: string): Promise<ResultPayload> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/result`,
      strictResultPayloadSchema
    );
  },
  async recommendationShortlist(id: string): Promise<RecommendationShortlist> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/recommendations/shortlist`,
      recommendationShortlistSchema
    );
  },
  async recommendationDetail(
    id: string,
    offerId: string
  ): Promise<RecommendationDetail> {
    const body = recommendationDetailRequestSchema.parse({ offerId });
    return request(
      `/api/cases/${encodeURIComponent(id)}/recommendations/detail`,
      recommendationDetailSchema,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  },
  async recommendationWhatIfBrief(
    id: string,
    payload: { candidateCaseId: string; offerId: string; offerLabel?: string }
  ): Promise<RecommendationWhatIfBrief> {
    const body = recommendationWhatIfBriefRequestSchema.parse(payload);
    return request(
      `/api/cases/${encodeURIComponent(id)}/recommendations/what-if-brief`,
      recommendationWhatIfBriefSchema,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  },
  async patchSignals(id: string, signals: CaseSignals) {
    return request(`/api/cases/${encodeURIComponent(id)}/signals`, caseResultResponseSchema, {
      method: "POST",
      body: JSON.stringify({ signals })
    });
  },
  async recompute(id: string, preferences?: PathPreferences) {
    return request(`/api/cases/${encodeURIComponent(id)}/recompute`, caseResultResponseSchema, {
      method: "POST",
      body: JSON.stringify({ preferences })
    });
  },
  async overrideSignal(id: string, override: CaseOverride) {
    return request(
      `/api/cases/${encodeURIComponent(id)}/override-signal`,
      caseResultResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(override)
      }
    );
  },
  async audit(id: string) {
    return request(`/api/cases/${encodeURIComponent(id)}/audit`, auditResponseSchema);
  },
  async humanReview(id: string): Promise<HumanReviewRequest | null> {
    const response = await request(
      `/api/cases/${encodeURIComponent(id)}/human-review`,
      humanReviewResponseSchema
    );
    return response.request;
  },
  async humanReviewCasePacket(id: string): Promise<HumanReviewCasePacket> {
    const response = await request(
      `/api/cases/${encodeURIComponent(id)}/human-review/packet`,
      humanReviewCasePacketResponseSchema
    );
    return response.packet;
  },
  async humanReviewManagerBrief(
    id: string,
    payload: { operatorContext?: string } = {}
  ): Promise<HumanReviewManagerBrief> {
    const body = humanReviewManagerBriefRequestSchema.parse(payload);
    return request(
      `/api/cases/${encodeURIComponent(id)}/human-review/manager-brief`,
      humanReviewManagerBriefSchema,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  },
  async submitHumanReview(id: string, payload: HumanReviewCreateRequest) {
    const body = humanReviewCreateRequestSchema.parse(payload);
    return request(
      `/api/cases/${encodeURIComponent(id)}/human-review`,
      humanReviewCreateResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  },
  async documents(id: string) {
    return request(`/api/cases/${encodeURIComponent(id)}/documents`, documentsReadinessSchema);
  },
  async fork(id: string, title?: string) {
    return request(`/api/cases/${encodeURIComponent(id)}/fork`, caseResultResponseSchema, {
      method: "POST",
      body: JSON.stringify({ title })
    });
  },
  async scenarioFamily(id: string): Promise<ScenarioLabFamily> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/scenarios`,
      scenarioLabFamilySchema
    );
  },
  async compareScenario(
    id: string,
    payload: ScenarioLabCompareRequest
  ): Promise<ScenarioLabCompareResponse> {
    const body = scenarioLabCompareRequestSchema.parse(payload);
    return request(
      `/api/cases/${encodeURIComponent(id)}/scenarios/compare`,
      strictScenarioLabCompareResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  },
  async decisionScenarioLab(id: string): Promise<ScenarioLabPayload> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/scenario-lab`,
      strictScenarioLabPayloadSchema
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
  async decisions(): Promise<DecisionLogEntry[]> {
    const response = await request("/api/decisions", decisionsResponseSchema);
    return response.decisions;
  },
  async scenarios(): Promise<ScenarioCard[]> {
    const response = await request("/api/scenarios", scenariosResponseSchema);
    return response.scenarios;
  }
};

export { caseOverrideSchema, caseSignalsSchema, pathPreferencesSchema };
export type { ProductType };
