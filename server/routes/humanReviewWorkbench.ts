import { Router, type Request } from "express";
import { z } from "zod";
import {
  humanReviewLearningEventsResponseSchema,
  humanReviewLearningIngestRequestSchema,
  humanReviewLearningIngestResponseSchema,
  humanReviewLearningSummaryResponseSchema,
  humanReviewLearningTopBlockersResponseSchema,
  humanReviewOpsDetailResponseSchema,
  humanReviewOpsQueueResponseSchema
} from "@shared/contracts";
import { runDecision, type OrchestratorCatalogs } from "@shared/domain/engine";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { getCaseStore } from "../lib/caseStore";
import {
  buildHumanReviewOpsDetail,
  buildHumanReviewOpsOrphanQueueItem,
  buildHumanReviewOpsQueueItem,
  HUMAN_REVIEW_OPS_CAPABILITIES
} from "../lib/humanReviewOps";
import {
  getHumanReviewLearningStore,
  HumanReviewLearningConflictError
} from "../lib/humanReviewLearningStore";
import { HttpError } from "../middleware/errorHandler";
import { requireInternalApiToken } from "../middleware/internalApi";
import { validateBody, validateParams } from "../middleware/validate";

const requestIdParams = z.object({ requestId: z.string().min(1) });
const learningEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

function getRequestId(req: Request): string {
  const raw = req.params.requestId;
  return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
}

function orchestratorCatalogs(): OrchestratorCatalogs {
  const catalogs = getCatalogsOrThrow();
  return {
    paths: catalogs.paths,
    visaRules: catalogs.visaRules,
    restrictions: catalogs.restrictions,
    sources: catalogs.sources,
    ruleEvidence: catalogs.ruleEvidence,
    residencyPrograms: catalogs.residencyPrograms,
    insuranceProducts: catalogs.insuranceProducts
  };
}

function computeResultForCaseId(caseId: string) {
  const caseData = getCaseStore().get(caseId);
  if (!caseData) {
    throw new HttpError(404, `Кейс ${caseId} не найден.`, "case_not_found");
  }
  const result = runDecision(
    { case: caseData, catalogs: orchestratorCatalogs() },
    { now: () => new Date() }
  );
  return { caseData, result };
}

export function humanReviewWorkbenchRouter(): Router {
  const router = Router();

  router.get("/ops/queue", requireInternalApiToken, (_req, res) => {
    const generatedAt = new Date().toISOString();
    const queue = getCaseStore().activeHumanReviewQueue().map((request) => {
      const caseData = getCaseStore().get(request.caseId);
      if (!caseData) {
        return buildHumanReviewOpsOrphanQueueItem({
          request,
          now: new Date(generatedAt)
        });
      }
      const result = runDecision(
        { case: caseData, catalogs: orchestratorCatalogs() },
        { now: () => new Date() }
      );
      return buildHumanReviewOpsQueueItem({
        request,
        caseData,
        currentResult: result,
        now: new Date(generatedAt)
      });
    });

    res.json(
      humanReviewOpsQueueResponseSchema.parse({
        generatedAt,
        capabilities: HUMAN_REVIEW_OPS_CAPABILITIES,
        queue
      })
    );
  });

  router.get("/learning/summary", requireInternalApiToken, (_req, res) => {
    res.json(
      humanReviewLearningSummaryResponseSchema.parse(
        getHumanReviewLearningStore().summary()
      )
    );
  });

  router.get("/learning/events", requireInternalApiToken, (req, res) => {
    const query = learningEventsQuerySchema.parse(req.query);
    const page = getHumanReviewLearningStore().page(query);
    res.json(
      humanReviewLearningEventsResponseSchema.parse({
        generatedAt: new Date().toISOString(),
        totalEvents: page.totalEvents,
        limit: query.limit,
        offset: query.offset,
        events: page.events
      })
    );
  });

  router.get("/learning/top-blockers", requireInternalApiToken, (_req, res) => {
    res.json(
      humanReviewLearningTopBlockersResponseSchema.parse(
        getHumanReviewLearningStore().topBlockers()
      )
    );
  });

  router.post(
    "/learning/ingest",
    requireInternalApiToken,
    validateBody(humanReviewLearningIngestRequestSchema),
    (req, res) => {
      const payload = humanReviewLearningIngestRequestSchema.parse(req.body);
      try {
        res.json(
          humanReviewLearningIngestResponseSchema.parse(
            getHumanReviewLearningStore().ingest(payload.event)
          )
        );
      } catch (error) {
        if (error instanceof HumanReviewLearningConflictError) {
          throw new HttpError(409, error.message, "human_review_learning_conflict");
        }
        throw error;
      }
    }
  );

  router.get(
    "/ops/requests/:requestId",
    requireInternalApiToken,
    validateParams(requestIdParams),
    (req, res) => {
      const requestId = getRequestId(req);
      const request = getCaseStore().getHumanReviewById(requestId);
      if (!request) {
        throw new HttpError(
          404,
          `Запрос ручной проверки ${requestId} не найден.`,
          "human_review_not_found"
        );
      }
      const { caseData, result } = computeResultForCaseId(request.caseId);
      const generatedAt = new Date().toISOString();

      res.json(
        humanReviewOpsDetailResponseSchema.parse({
          generatedAt,
          capabilities: HUMAN_REVIEW_OPS_CAPABILITIES,
          detail: buildHumanReviewOpsDetail({
            request,
            caseData,
            currentResult: result
          })
        })
      );
    }
  );

  return router;
}
