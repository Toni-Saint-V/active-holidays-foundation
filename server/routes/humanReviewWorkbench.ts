import { Router, type Request } from "express";
import { z } from "zod";
import {
  humanReviewLearningEventsResponseSchema,
  humanReviewLearningIngestRequestSchema,
  humanReviewLearningIngestResponseSchema,
  humanReviewLearningSummaryResponseSchema,
  humanReviewLearningTopBlockersResponseSchema,
  humanReviewOpsActionRequestSchema,
  humanReviewOpsActionResponseSchema,
  humanReviewOpsDetailResponseSchema,
  humanReviewOpsQueueResponseSchema,
  type HumanReviewOpsAction,
  type HumanReviewOpsActionRequest,
  type HumanReviewRequest
} from "@shared/contracts";
import { runDecision, type OrchestratorCatalogs } from "@shared/domain/engine";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { getCaseStore } from "../lib/caseStore";
import { extractHumanReviewBlockers } from "../lib/humanReviewBlockers";
import {
  buildHumanReviewLearningEvent,
  humanReviewLearningEventId
} from "../lib/humanReviewLearning";
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

function buildDetailResponse(request: HumanReviewRequest) {
  const { caseData, result } = computeResultForCaseId(request.caseId);
  return humanReviewOpsDetailResponseSchema.parse({
    generatedAt: new Date().toISOString(),
    capabilities: HUMAN_REVIEW_OPS_CAPABILITIES,
    detail: buildHumanReviewOpsDetail({
      request,
      caseData,
      currentResult: result
    })
  });
}

function snapshotResolvedOpsDecision(input: {
  requestId: string;
  caseId: string;
}) {
  const catalogs = orchestratorCatalogs();
  const caseData = getCaseStore().get(input.caseId);
  if (!caseData) {
    throw new HttpError(404, `Кейс ${input.caseId} не найден.`, "case_not_found");
  }
  const result = runDecision(
    { case: caseData, catalogs },
    { now: () => new Date() }
  );
  const record = getCaseStore().snapshotDecisionRecord({
    case: caseData,
    catalogs,
    result,
    summary: `Ops workbench закрыл ручную проверку ${input.requestId}; результат пересчитан без новых предположений.`,
    kind: "recompute",
    changedSignalIds: []
  });
  return { result, record };
}

function actionFromPayload(payload: HumanReviewOpsActionRequest): HumanReviewOpsAction | null {
  if (payload.actionId === "move_in_review" && payload.transitionStatus === "in_review") {
    return {
      id: "move_in_review",
      label: "Взять в работу",
      transitionStatus: "in_review",
      internalOnly: true
    };
  }
  if (payload.actionId === "mark_resolved" && payload.transitionStatus === "resolved") {
    return {
      id: "mark_resolved",
      label: "Закрыть проверку",
      transitionStatus: "resolved",
      internalOnly: true
    };
  }
  if (payload.actionId === "cancel_review" && payload.transitionStatus === "cancelled") {
    return {
      id: "cancel_review",
      label: "Отменить проверку",
      transitionStatus: "cancelled",
      internalOnly: true
    };
  }
  return null;
}

function ensureResolvedOpsArtifacts(input: {
  requestBefore: HumanReviewRequest;
  requestAfter: HumanReviewRequest;
}) {
  const existingRecordId = input.requestAfter.resolution?.postDecisionRecordId ?? null;
  const existingRecord = existingRecordId ? getCaseStore().getRecord(existingRecordId) : null;
  const resolvedDecision = existingRecord?.result
    ? { result: existingRecord.result, record: existingRecord }
    : snapshotResolvedOpsDecision({
        requestId: input.requestAfter.id,
        caseId: input.requestAfter.caseId
      });

  const decisionRecordId = resolvedDecision.record.decisionId;
  const requestWithRecord =
    input.requestAfter.resolution?.postDecisionRecordId === decisionRecordId
      ? input.requestAfter
      : getCaseStore().attachHumanReviewDecisionRecord({
          requestId: input.requestAfter.id,
          postDecisionRecordId: decisionRecordId
        });

  const learningStore = getHumanReviewLearningStore();
  const existingEvent = learningStore.get(humanReviewLearningEventId(requestWithRecord));
  if (existingEvent) {
    return {
      requestAfter: requestWithRecord,
      decisionRecordId,
      learningFeedback: {
        event: existingEvent,
        inserted: false
      }
    };
  }

  const event = buildHumanReviewLearningEvent({
    requestBefore: input.requestBefore,
    requestAfter: requestWithRecord,
    postResult: resolvedDecision.result,
    blockers: extractHumanReviewBlockers(resolvedDecision.result),
    postDecisionRecordId: decisionRecordId
  });
  return {
    requestAfter: requestWithRecord,
    decisionRecordId,
    learningFeedback: learningStore.ingest(event)
  };
}

function assertSameResolvedPayload(input: {
  request: HumanReviewRequest;
  payload: HumanReviewOpsActionRequest;
}) {
  if (
    input.request.status !== "resolved" ||
    input.payload.transitionStatus !== "resolved" ||
    input.payload.actionId !== "mark_resolved" ||
    !input.request.resolution ||
    !input.payload.resolution ||
    input.request.resolution.summary !== input.payload.resolution.summary
  ) {
    throw new HttpError(
      409,
      `Действие ${input.payload.actionId} недоступно для статуса ${input.request.status}.`,
      "human_review_ops_action_not_allowed"
    );
  }
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

  router.post(
    "/ops/requests/:requestId/actions",
    requireInternalApiToken,
    validateParams(requestIdParams),
    validateBody(humanReviewOpsActionRequestSchema),
    (req, res) => {
      const requestId = getRequestId(req);
      const payload = humanReviewOpsActionRequestSchema.parse(req.body);
      const requestBefore = getCaseStore().getHumanReviewById(requestId);
      if (!requestBefore) {
        throw new HttpError(
          404,
          `Запрос ручной проверки ${requestId} не найден.`,
          "human_review_not_found"
        );
      }

      if (requestBefore.status === "resolved") {
        const action = actionFromPayload(payload);
        assertSameResolvedPayload({ request: requestBefore, payload });
        if (!action) {
          throw new HttpError(
            409,
            `Действие ${payload.actionId} недоступно для статуса ${requestBefore.status}.`,
            "human_review_ops_action_not_allowed"
          );
        }
        try {
          const completed = ensureResolvedOpsArtifacts({
            requestBefore,
            requestAfter: requestBefore
          });
          const refreshed = buildDetailResponse(completed.requestAfter);
          res.json(
            humanReviewOpsActionResponseSchema.parse({
              ...refreshed,
              action,
              decisionRecordId: completed.decisionRecordId,
              learningFeedback: completed.learningFeedback
            })
          );
          return;
        } catch (error) {
          if (error instanceof HumanReviewLearningConflictError) {
            throw new HttpError(409, error.message, "human_review_learning_conflict");
          }
          throw error;
        }
      }

      const beforeDetail = buildDetailResponse(requestBefore);
      const action = beforeDetail.detail.operatorNextActions.find(
        (candidate) =>
          candidate.id === payload.actionId &&
          candidate.transitionStatus === payload.transitionStatus
      );
      if (!action) {
        throw new HttpError(
          409,
          `Действие ${payload.actionId} недоступно для статуса ${requestBefore.status}.`,
          "human_review_ops_action_not_allowed"
        );
      }

      let requestAfter: HumanReviewRequest;
      try {
        requestAfter = getCaseStore().transitionHumanReview({
          requestId,
          status: payload.transitionStatus,
          changedBy: "ops",
          note: payload.note ?? null,
          resolution: payload.resolution ?? null
        });
      } catch (error) {
        throw new HttpError(
          409,
          error instanceof Error
            ? error.message
            : "Не удалось выполнить действие оператора.",
          "human_review_ops_action_failed"
        );
      }

      let decisionRecordId: string | null = null;
      let learningFeedback = null;
      if (payload.transitionStatus === "resolved") {
        try {
          const completed = ensureResolvedOpsArtifacts({
            requestBefore,
            requestAfter
          });
          requestAfter = completed.requestAfter;
          decisionRecordId = completed.decisionRecordId;
          learningFeedback = completed.learningFeedback;
        } catch (error) {
          if (error instanceof HumanReviewLearningConflictError) {
            throw new HttpError(409, error.message, "human_review_learning_conflict");
          }
          throw error;
        }
      }

      const refreshed = buildDetailResponse(requestAfter);
      res.json(
        humanReviewOpsActionResponseSchema.parse({
          ...refreshed,
          action,
          decisionRecordId,
          learningFeedback
        })
      );
    }
  );

  return router;
}
