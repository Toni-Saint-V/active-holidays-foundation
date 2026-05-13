import { Router, type Request } from "express";
import { z } from "zod";
import {
  humanReviewManagerBriefRequestSchema,
  caseOverrideSchema,
  caseSignalsSchema,
  signalValueSchema,
  humanReviewCreateRequestSchema,
  humanReviewCreateResponseSchema,
  humanReviewCasePacketResponseSchema,
  humanReviewResponseSchema,
  humanReviewTransitionRequestSchema,
  humanReviewTransitionResponseSchema,
  pathPreferencesSchema,
  recommendationWhatIfBriefRequestSchema,
  recommendationDetailRequestSchema,
  scenarioLabCompareRequestSchema,
  caseSummarySchema,
  type Case,
  type CaseSignals,
  type DecisionKind,
  type HumanReviewHandoff,
  type HumanReviewRequest,
  type ResultPayload,
  type HumanReviewSnapshot
} from "@shared/contracts";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { getCaseStore, HumanReviewHandoffConflictError } from "../lib/caseStore";
import { buildDecisionScenarioLab } from "../lib/decisionScenarioLab";
import { buildHumanReviewCasePacket } from "../lib/humanReviewCasePacket";
import {
  buildHumanReviewLearningEvent,
  humanReviewLearningEventId
} from "../lib/humanReviewLearning";
import { getHumanReviewLearningStore } from "../lib/humanReviewLearningStore";
import { extractHumanReviewBlockers } from "../lib/humanReviewBlockers";
import {
  buildHumanReviewManagerBrief,
  buildRecommendationWhatIfBrief,
} from "../lib/aiBriefs";
import {
  buildRecommendationDetail,
  buildRecommendationShortlist,
  RecommendationOfferNotFoundError
} from "../lib/recommendations";
import {
  buildScenarioCompareResponse,
  buildScenarioFamily,
  ensureSameScenarioFamily
} from "../lib/scenarioLab";
import { HttpError } from "../middleware/errorHandler";
import { requireInternalApiToken } from "../middleware/internalApi";
import {
  expensiveApiRateLimit,
  internalExpensiveRateLimit,
  recommendationRateLimit
} from "../middleware/rateLimit";
import { validateBody, validateParams } from "../middleware/validate";
import {
  driftDiff,
  fingerprintResult,
  runDecision,
  type OrchestratorCatalogs
} from "@shared/domain/engine";

const caseIdParams = z.object({ id: z.string().min(1) });

function getId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
}

function requireCase(id: string): Case {
  const existing = getCaseStore().get(id);
  if (!existing) {
    throw new HttpError(404, `Кейс ${id} не найден.`, "case_not_found");
  }
  return existing;
}

function orchestratorCatalogs(
  caseId?: string,
  options: { excludeCalibrationRequestIds?: string[] } = {}
): OrchestratorCatalogs {
  const catalogs = getCatalogsOrThrow();
  return {
    paths: catalogs.paths,
    visaRules: catalogs.visaRules,
    restrictions: catalogs.restrictions,
    sources: catalogs.sources,
    ruleEvidence: catalogs.ruleEvidence,
    residencyPrograms: catalogs.residencyPrograms,
    insuranceProducts: catalogs.insuranceProducts,
    humanReviewCalibrations: caseId
      ? getHumanReviewLearningStore().calibrations({
          caseId,
          excludeRequestIds: options.excludeCalibrationRequestIds
        })
      : []
  };
}

function computeResult(caseData: Case, catalogs = orchestratorCatalogs(caseData.id)) {
  return runDecision(
    { case: caseData, catalogs },
    { now: () => new Date() }
  );
}

function buildHumanReviewSnapshot(caseData: Case): HumanReviewSnapshot {
  const latest = getCaseStore().latestRecordFor(caseData.id);
  const result = latest?.result ?? computeResult(caseData);
  return {
    decisionId: latest?.decisionId ?? null,
    verdict: result.verdict,
    confidence: result.trust.confidence,
    computedAt: result.computedAt,
    lastCheckedAt: result.trust.lastCheckedAt,
    nextActionLabel: result.nextAction.label,
    summary:
      result.verdict === "HUMAN_REVIEW"
        ? "Автомат не подтвердил маршрут. Нужна ручная проверка."
        : `Следующий шаг по кейсу: ${result.nextAction.label}.`
  };
}

function buildScenarioHumanReviewHandoff(
  caseData: Case,
  scenarioId: string,
  catalogs: OrchestratorCatalogs,
  result = computeResult(caseData, catalogs)
): HumanReviewHandoff {
  const lab = buildDecisionScenarioLab(caseData, catalogs, result);
  const scenario = lab.scenarios.find((candidate) => candidate.id === scenarioId);
  if (!scenario) {
    throw new HttpError(
      404,
      `Сценарий ${scenarioId} не найден для кейса ${caseData.id}.`,
      "scenario_not_found"
    );
  }

  const requiresHumanReview =
    scenario.safetyStatus === "evidence_blocked" ||
    scenario.safetyStatus === "human_review_only" ||
    scenario.plan.humanReviewRequired ||
    scenario.nextAction.type === "send_for_review";
  if (!requiresHumanReview) {
    throw new HttpError(
      409,
      "Этот сценарий можно отработать без ручной проверки; handoff не создаётся.",
      "scenario_handoff_not_required"
    );
  }

  const humanReviewReason =
    scenario.humanReviewReason ??
    scenario.plan.humanReviewReason ??
    scenario.blockingReason ??
    scenario.nextAction.detail;
  const operatorNextAction = [
    "Оператор должен проверить причины блокировки сценария.",
    `Причина: ${humanReviewReason}`,
    `Следующий безопасный шаг для пользователя: ${scenario.nextAction.label}.`
  ].join(" ");
  const decisionRecord = getCaseStore().snapshotDecisionRecord({
    case: caseData,
    catalogs,
    result,
    summary: `База для handoff сценария ${scenario.id} в ручную проверку.`,
    kind: "recompute",
    changedSignalIds: []
  });

  return {
    source: "scenario_lab",
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    safetyStatus:
      scenario.safetyStatus === "evidence_blocked"
        ? "evidence_blocked"
        : "human_review_only",
    evidenceStatus: scenario.evidenceStatus,
    freshnessStatus: scenario.freshnessStatus,
    blockingReason: scenario.blockingReason,
    humanReviewReason,
    operatorNextAction,
    userNextActionLabel: scenario.nextAction.label,
    triggeredBy: scenario.nextAction.triggeredBy,
    createdFromDecisionId: decisionRecord.decisionId
  };
}

function recordDecision(
  caseData: Case,
  summary: string,
  kind: DecisionKind,
  delta: {
    changedSignalIds: string[];
    changedPreferenceIds?: string[];
  }
) {
  const catalogs = orchestratorCatalogs(caseData.id);
  const result = runDecision(
    { case: caseData, catalogs },
    { now: () => new Date() }
  );
  const record = getCaseStore().snapshotDecisionRecord({
    case: caseData,
    catalogs,
    result,
    summary,
    kind,
    changedSignalIds: delta.changedSignalIds,
    changedPreferenceIds: delta.changedPreferenceIds
  });
  return { result, record };
}

function captureLearningFeedback(input: {
  requestBefore: HumanReviewRequest;
  requestAfter: HumanReviewRequest;
  result: ResultPayload;
  decisionRecordId: string | null;
}) {
  const event = buildHumanReviewLearningEvent({
    requestBefore: input.requestBefore,
    requestAfter: input.requestAfter,
    postResult: input.result,
    blockers: extractHumanReviewBlockers(input.result),
    postDecisionRecordId: input.decisionRecordId
  });
  return getHumanReviewLearningStore().ingest(event);
}

export function casesRouter(): Router {
  const router = Router();

  // Phase 2 requires real session/JWT case ownership enforcement for user-specific case routes.

  router.get("/", requireInternalApiToken, (_req, res) => {
    const summaries = getCaseStore()
      .list()
      .map((caseData) => ({
        id: caseData.id,
        title: caseData.title,
        productType: caseData.productType,
        createdAt: caseData.createdAt,
        updatedAt: caseData.updatedAt,
        signalCount: caseData.signals.length,
        forkedFrom: caseData.forkedFrom
      }));
    res.json({ cases: caseSummarySchema.array().parse(summaries) });
  });

  router.get("/:id", validateParams(caseIdParams), (req, res) => {
    const caseData = requireCase(getId(req));
    res.json(caseData);
  });

  router.get("/:id/result", validateParams(caseIdParams), (req, res) => {
    const caseData = requireCase(getId(req));
    const result = computeResult(caseData);
    res.json(result);
  });

  router.get("/:id/recommendations/shortlist", recommendationRateLimit, validateParams(caseIdParams), async (req, res) => {
    const caseData = requireCase(getId(req));
    const result = computeResult(caseData);
    const shortlist = await buildRecommendationShortlist(caseData, result);
    if (!shortlist) {
      throw new HttpError(
        404,
        `Для кейса ${caseData.id} нет кандидатных рекомендаций для короткого списка.`,
        "recommendation_shortlist_unavailable"
      );
    }
    res.json(shortlist);
  });

  router.post(
    "/:id/recommendations/detail",
    recommendationRateLimit,
    validateParams(caseIdParams),
    validateBody(recommendationDetailRequestSchema),
    async (req, res) => {
      const caseData = requireCase(getId(req));
      const result = computeResult(caseData);
      const { offerId } = recommendationDetailRequestSchema.parse(req.body);

      try {
        const detail = await buildRecommendationDetail(caseData, result, offerId);
        res.json(detail);
      } catch (error) {
        if (!(error instanceof RecommendationOfferNotFoundError)) {
          throw error;
        }
        throw new HttpError(
          404,
          `Вариант ${offerId} отсутствует в текущем коротком списке рекомендаций.`,
          "recommendation_offer_not_found"
        );
      }
    }
  );

  router.post(
    "/:id/recommendations/what-if-brief",
    recommendationRateLimit,
    validateParams(caseIdParams),
    validateBody(recommendationWhatIfBriefRequestSchema),
    async (req, res) => {
      const id = getId(req);
      const baselineCase = requireCase(id);
      const payload = recommendationWhatIfBriefRequestSchema.parse(req.body);
      const candidateCase = requireCase(payload.candidateCaseId);

      if (!ensureSameScenarioFamily(getCaseStore(), baselineCase.id, candidateCase.id)) {
        throw new HttpError(
          400,
          "What-if brief можно собирать только для сценариев из одной fork-цепочки.",
          "scenario_family_mismatch"
        );
      }

      const comparison = buildScenarioCompareResponse({
        store: getCaseStore(),
        baselineCase,
        candidateCase,
        computeResult
      }).comparison;

      const brief = await buildRecommendationWhatIfBrief({
        caseId: baselineCase.id,
        candidateCaseId: candidateCase.id,
        offerId: payload.offerId,
        offerLabel: payload.offerLabel,
        comparison
      });

      res.json(brief);
    }
  );

  router.post(
    "/:id/signals",
    validateParams(caseIdParams),
    validateBody(z.object({ signals: caseSignalsSchema })),
    (req, res) => {
      const id = getId(req);
      const store = getCaseStore();
      requireCase(id);
      const signals = (req.body as { signals: CaseSignals }).signals;
      for (const signal of signals) {
        const parsed = signalValueSchema.safeParse({
          id: signal.id,
          value: signal.value
        });
        if (!parsed.success) {
          throw new HttpError(
            400,
            `Некорректное значение сигнала ${signal.id}.`,
            "invalid_signal_value"
          );
        }
      }
      const updated = store.patchSignals(id, signals);
      if (!updated) throw new HttpError(500, "Не удалось обновить сигналы.");
      const { result, record } = recordDecision(
        updated,
        `Пересчёт после изменения ${signals.length} сигналов.`,
        "recompute",
        { changedSignalIds: signals.map((signal) => signal.id) }
      );
      res.json({ case: updated, result, decisionRecordId: record.decisionId });
    }
  );

  router.post(
    "/:id/recompute",
    expensiveApiRateLimit,
    validateParams(caseIdParams),
    validateBody(
      z
        .object({
          preferences: pathPreferencesSchema.optional()
        })
        .default({})
    ),
    (req, res) => {
      const id = getId(req);
      const store = getCaseStore();
      const existing = requireCase(id);
      const preferences = (req.body as { preferences?: typeof existing.preferences }).preferences;
      const updated = preferences
        ? store.setPreferences(existing.id, preferences) ?? existing
        : existing;
      const { result, record } = recordDecision(
        updated,
        preferences ? "Пересчёт с новыми предпочтениями по маршрутам." : "Пересчёт без изменений.",
        "recompute",
        {
          changedSignalIds: [],
          changedPreferenceIds: preferences?.map((item) => item.id) ?? []
        }
      );
      res.json({ case: updated, result, decisionRecordId: record.decisionId });
    }
  );

  router.post(
    "/:id/override-signal",
    requireInternalApiToken,
    internalExpensiveRateLimit,
    validateParams(caseIdParams),
    validateBody(caseOverrideSchema),
    (req, res) => {
      const id = getId(req);
      const store = getCaseStore();
      requireCase(id);
      const override = req.body as z.infer<typeof caseOverrideSchema>;
      const updated = store.overrideSignal(id, override);
      if (!updated) {
        throw new HttpError(
          400,
          "Override не прошёл проверку сигнала: проверьте тип и допустимое значение.",
          "invalid_override_signal"
        );
      }
      const { result, record } = recordDecision(
        updated,
        `Override сигнала ${override.signalId}: ${override.reason}.`,
        "override",
        { changedSignalIds: [override.signalId] }
      );
      res.json({ case: updated, result, decisionRecordId: record.decisionId });
    }
  );

  router.get("/:id/audit", requireInternalApiToken, validateParams(caseIdParams), (req, res) => {
    const caseData = requireCase(getId(req));
    const result = computeResult(caseData);
    res.json({
      trail: result.auditTrail,
      decisions: getCaseStore().decisionsFor(caseData.id)
    });
  });

  router.get("/:id/documents", validateParams(caseIdParams), (req, res) => {
    const caseData = requireCase(getId(req));
    const result = computeResult(caseData);
    res.json(result.documents);
  });

  router.get("/:id/human-review", validateParams(caseIdParams), (req, res) => {
    const caseData = requireCase(getId(req));
    const request = getCaseStore().latestHumanReviewFor(caseData.id);
    res.json(humanReviewResponseSchema.parse({ request }));
  });

  router.get("/:id/human-review/packet", requireInternalApiToken, validateParams(caseIdParams), (req, res) => {
    const caseData = requireCase(getId(req));
    const request = getCaseStore().activeHumanReviewFor(caseData.id);
    if (!request) {
      throw new HttpError(
        404,
        `Для кейса ${caseData.id} нет активного запроса ручной проверки.`,
        "human_review_packet_not_found"
      );
    }
    const result = computeResult(caseData);
    const packet = buildHumanReviewCasePacket({ caseData, request, result });
    res.json(humanReviewCasePacketResponseSchema.parse({ packet }));
  });

  router.post(
    "/:id/human-review/manager-brief",
    requireInternalApiToken,
    internalExpensiveRateLimit,
    validateParams(caseIdParams),
    validateBody(humanReviewManagerBriefRequestSchema.default({})),
    async (req, res) => {
      const caseData = requireCase(getId(req));
      const request = getCaseStore().activeHumanReviewFor(caseData.id);
      if (!request) {
        throw new HttpError(
          404,
          `Для кейса ${caseData.id} нет активного запроса ручной проверки.`,
          "human_review_packet_not_found"
        );
      }
      const payload = humanReviewManagerBriefRequestSchema.parse(req.body);
      const result = computeResult(caseData);
      const packet = buildHumanReviewCasePacket({ caseData, request, result });
      const brief = await buildHumanReviewManagerBrief({
        caseData,
        request,
        packet,
        operatorContext: payload.operatorContext
      });
      res.json(brief);
    }
  );

  router.post(
    "/:id/human-review",
    validateParams(caseIdParams),
    validateBody(humanReviewCreateRequestSchema),
    (req, res) => {
      const caseData = requireCase(getId(req));
      const payload = humanReviewCreateRequestSchema.parse(req.body);
      const catalogs = orchestratorCatalogs(caseData.id);
      const result = computeResult(caseData, catalogs);
      const handoff = payload.scenarioId
        ? buildScenarioHumanReviewHandoff(caseData, payload.scenarioId, catalogs, result)
        : null;
      try {
        const response = getCaseStore().createOrReuseHumanReview({
          caseId: caseData.id,
          request: payload,
          snapshot: buildHumanReviewSnapshot(caseData),
          handoff
        });
        res.json(humanReviewCreateResponseSchema.parse(response));
      } catch (error) {
        if (error instanceof HumanReviewHandoffConflictError) {
          throw new HttpError(409, error.message, "human_review_handoff_conflict");
        }
        throw error;
      }
    }
  );

  router.post(
    "/:id/human-review/transition",
    requireInternalApiToken,
    validateParams(caseIdParams),
    validateBody(humanReviewTransitionRequestSchema),
    (req, res) => {
      const caseData = requireCase(getId(req));
      const payload = humanReviewTransitionRequestSchema.parse(req.body);
      const request = getCaseStore().getHumanReviewById(payload.requestId);
      if (!request) {
        throw new HttpError(
          404,
          `Запрос ручной проверки ${payload.requestId} не найден.`,
          "human_review_not_found"
        );
      }
      if (request.caseId !== caseData.id) {
        throw new HttpError(
          409,
          `Запрос ${payload.requestId} не относится к кейсу ${caseData.id}.`,
          "human_review_case_mismatch"
        );
      }
      if (request.status === "resolved" && payload.status === "resolved") {
        if (
          !request.resolution ||
          !payload.resolution ||
          request.resolution.summary !== payload.resolution.summary
        ) {
          throw new HttpError(
            409,
            "Повторное закрытие resolved HumanReviewRequest допустимо только с тем же resolution payload.",
            "human_review_invalid_transition"
          );
        }
        const store = getHumanReviewLearningStore();
        const existingEvent = store.get(humanReviewLearningEventId(request));
        const terminalRecordId = request.resolution.postDecisionRecordId;
        const terminalRecord = terminalRecordId
          ? getCaseStore().getRecord(terminalRecordId)
          : null;
        const terminalResult = terminalRecord?.result ?? null;
        if (existingEvent) {
          res.json(
            humanReviewTransitionResponseSchema.parse({
              request,
              result: terminalResult,
              decisionRecordId: terminalRecordId,
              learningFeedback: {
                event: existingEvent,
                inserted: false
              }
            })
          );
          return;
        }
        if (!terminalResult) {
          res.json(
            humanReviewTransitionResponseSchema.parse({
              request,
              result: null,
              decisionRecordId: terminalRecordId,
              learningFeedback: null
            })
          );
          return;
        }
        const learningFeedback = captureLearningFeedback({
          requestBefore: request,
          requestAfter: request,
          result: terminalResult,
          decisionRecordId: terminalRecordId
        });
        res.json(
          humanReviewTransitionResponseSchema.parse({
            request,
            result: terminalResult,
            decisionRecordId: terminalRecordId,
            learningFeedback
          })
        );
        return;
      }

      let next: HumanReviewRequest;
      try {
        next = getCaseStore().transitionHumanReview({
          requestId: payload.requestId,
          status: payload.status,
          changedBy: "system",
          note: payload.note ?? null,
          resolution: payload.resolution ?? null
        });
      } catch (error) {
        throw new HttpError(
          409,
          error instanceof Error
            ? error.message
            : "Не удалось изменить статус ручной проверки.",
          "human_review_invalid_transition"
        );
      }

      if (payload.status === "resolved") {
        const terminalRecord = recordDecision(
          caseData,
          `Ручная проверка ${payload.requestId} завершена; результат пересчитан без новых предположений.`,
          "recompute",
          { changedSignalIds: [] }
        );
        next = getCaseStore().attachHumanReviewDecisionRecord({
          requestId: next.id,
          postDecisionRecordId: terminalRecord.record.decisionId
        });
        try {
          const learningFeedback = captureLearningFeedback({
            requestBefore: request,
            requestAfter: next,
            result: terminalRecord.result,
            decisionRecordId: terminalRecord.record.decisionId
          });
          res.json(
            humanReviewTransitionResponseSchema.parse({
              request: next,
              result: terminalRecord.result,
              decisionRecordId: terminalRecord.record.decisionId,
              learningFeedback
            })
          );
          return;
        } catch (error) {
          throw new HttpError(
            500,
            error instanceof Error
              ? error.message
              : "Ручная проверка закрыта, но learning feedback не был сохранён.",
            "human_review_learning_capture_failed"
          );
        }
      }

      res.json(
        humanReviewTransitionResponseSchema.parse({
          request: next,
          result: null,
          decisionRecordId: null
        })
      );
    }
  );

  router.get("/:id/scenario-lab", validateParams(caseIdParams), (req, res) => {
    const caseData = requireCase(getId(req));
    const result = computeResult(caseData);
    res.json(buildDecisionScenarioLab(caseData, orchestratorCatalogs(caseData.id), result));
  });

  router.get("/:id/scenarios", validateParams(caseIdParams), (req, res) => {
    const id = getId(req);
    requireCase(id);
    const family = buildScenarioFamily(getCaseStore(), id, computeResult);
    res.json(family);
  });

  router.post(
    "/:id/scenarios/compare",
    expensiveApiRateLimit,
    validateParams(caseIdParams),
    validateBody(scenarioLabCompareRequestSchema),
    (req, res) => {
      const id = getId(req);
      const store = getCaseStore();
      const baselineCase = requireCase(id);
      const {
        compareToCaseId,
        title,
        signals,
        preferences
      } = req.body as z.infer<typeof scenarioLabCompareRequestSchema>;

      if (compareToCaseId) {
        const candidateCase = requireCase(compareToCaseId);
        if (!ensureSameScenarioFamily(store, baselineCase.id, candidateCase.id)) {
          throw new HttpError(
            400,
            "Сравнивать можно только сценарии из одной fork-цепочки.",
            "scenario_family_mismatch"
          );
        }
        res.json(
          buildScenarioCompareResponse({
            store,
            baselineCase,
            candidateCase,
            computeResult
          })
        );
        return;
      }

      const forked = store.fork(id, { title });
      if (!forked) {
        throw new HttpError(500, "Не удалось создать сценарный fork.");
      }

      let candidateCase = forked;
      if (signals.length > 0) {
        const patched = store.patchSignals(candidateCase.id, signals);
        if (!patched) {
          throw new HttpError(500, "Не удалось применить сигналы к сценарному fork.");
        }
        candidateCase = patched;
      }
      if (preferences) {
        const updatedPreferences = store.setPreferences(candidateCase.id, preferences);
        if (!updatedPreferences) {
          throw new HttpError(500, "Не удалось применить предпочтения к сценарному fork.");
        }
        candidateCase = updatedPreferences;
      }

      const { record } = recordDecision(
        candidateCase,
        `Сценарное сравнение для кейса ${id}.`,
        "fork",
        {
          changedSignalIds: signals.map((signal) => signal.id),
          changedPreferenceIds: preferences?.map((item) => item.id) ?? []
        }
      );

      res.json(
        buildScenarioCompareResponse({
          store,
          baselineCase,
          candidateCase,
          candidateDecisionRecordId: record.decisionId,
          computeResult
        })
      );
    }
  );

  router.get("/:id/drift", requireInternalApiToken, internalExpensiveRateLimit, validateParams(caseIdParams), (req, res) => {
    const id = getId(req);
    const currentCase = requireCase(id);
    const latest = getCaseStore().latestRecordFor(id);
    if (!latest) {
      throw new HttpError(
        409,
        `Для кейса ${id} нет решений в журнале — запустите recompute, чтобы создать базу для drift-проверки.`,
        "no_decision_record"
      );
    }
    if (!latest.result) {
      throw new HttpError(
        409,
        `Последнее решение для кейса ${id} — legacy-запись без полного результата. Запустите recompute, чтобы получить базу для drift-проверки.`,
        "legacy_decision_record"
      );
    }
    const terminalRequest = getCaseStore().humanReviewForDecisionRecord(id, latest.decisionId);
    const excludeCalibrationRequestIds =
      terminalRequest?.resolution?.postDecisionRecordId === latest.decisionId
        ? [terminalRequest.id]
        : [];
    const replayResult = runDecision(
      {
        case: currentCase,
        catalogs: orchestratorCatalogs(id, { excludeCalibrationRequestIds })
      },
      { now: () => new Date(latest.computedAt) }
    );
    const replayFingerprint = fingerprintResult(replayResult);
    const diff = driftDiff(latest.result, replayResult);
    // Compare the latest stored decision with the same case under the current
    // catalogs, but keep the original decision time stable so computedAt does
    // not create false-positive fingerprint drift on otherwise identical data.
    // fingerprint mismatch must still count as drift even when driftDiff
    // returns null, otherwise result-fields that driftDiff does not inspect
    // (e.g. auditTrail shape, ruleResults, path title) could drift silently.
    const drifted = diff !== null || replayFingerprint !== latest.resultFingerprint;
    res.json({
      decisionRecordId: latest.decisionId,
      engineVersion: latest.engineVersion,
      engineRevision: latest.engineRevision,
      latestResultFingerprint: latest.resultFingerprint,
      replayResultFingerprint: replayFingerprint,
      drifted,
      diff
    });
  });

  router.post(
    "/:id/fork",
    expensiveApiRateLimit,
    validateParams(caseIdParams),
    validateBody(z.object({ title: z.string().min(1).optional() }).default({})),
    (req, res) => {
      const id = getId(req);
      const store = getCaseStore();
      requireCase(id);
      const title = (req.body as { title?: string }).title;
      const forked = store.fork(id, { title });
      if (!forked) throw new HttpError(500, "Не удалось форкнуть кейс.");
      const { result, record } = recordDecision(
        forked,
        `Форк кейса ${id}.`,
        "fork",
        { changedSignalIds: [] }
      );
      res.json({ case: forked, result, decisionRecordId: record.decisionId });
    }
  );

  return router;
}
