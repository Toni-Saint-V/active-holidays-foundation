import { Router, type Request } from "express";
import { z } from "zod";
import {
  caseOverrideSchema,
  caseSignalsSchema,
  pathPreferencesSchema,
  recommendationDetailRequestSchema,
  scenarioLabCompareRequestSchema,
  type Case,
  type CaseSignals,
  type DecisionKind
} from "@shared/contracts";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { getCaseStore } from "../lib/caseStore";
import { buildDecisionScenarioLab } from "../lib/decisionScenarioLab";
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

function orchestratorCatalogs(): OrchestratorCatalogs {
  const catalogs = getCatalogsOrThrow();
  return {
    paths: catalogs.paths,
    visaRules: catalogs.visaRules,
    restrictions: catalogs.restrictions,
    sources: catalogs.sources,
    residencyPrograms: catalogs.residencyPrograms,
    insuranceProducts: catalogs.insuranceProducts
  };
}

function computeResult(caseData: Case) {
  return runDecision({ case: caseData, catalogs: orchestratorCatalogs() });
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
  const catalogs = orchestratorCatalogs();
  const result = runDecision({ case: caseData, catalogs });
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

export function casesRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const summaries = getCaseStore()
      .list()
      .map((caseData) => ({
        id: caseData.id,
        title: caseData.title,
        createdAt: caseData.createdAt,
        updatedAt: caseData.updatedAt,
        signalCount: caseData.signals.length,
        forkedFrom: caseData.forkedFrom
      }));
    res.json({ cases: summaries });
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

  router.get("/:id/recommendations/shortlist", validateParams(caseIdParams), async (req, res) => {
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
    "/:id/signals",
    validateParams(caseIdParams),
    validateBody(z.object({ signals: caseSignalsSchema })),
    (req, res) => {
      const id = getId(req);
      const store = getCaseStore();
      requireCase(id);
      const signals = (req.body as { signals: CaseSignals }).signals;
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

  router.get("/:id/audit", validateParams(caseIdParams), (req, res) => {
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

  router.get("/:id/scenario-lab", validateParams(caseIdParams), (req, res) => {
    const caseData = requireCase(getId(req));
    const result = computeResult(caseData);
    res.json(buildDecisionScenarioLab(caseData, orchestratorCatalogs(), result));
  });

  router.get("/:id/scenarios", validateParams(caseIdParams), (req, res) => {
    const id = getId(req);
    requireCase(id);
    const family = buildScenarioFamily(getCaseStore(), id, computeResult);
    res.json(family);
  });

  router.post(
    "/:id/scenarios/compare",
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

  router.get("/:id/drift", validateParams(caseIdParams), (req, res) => {
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
    const replayResult = runDecision(
      { case: currentCase, catalogs: orchestratorCatalogs() },
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
