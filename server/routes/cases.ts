import { Router, type Request } from "express";
import { z } from "zod";
import {
  caseOverrideSchema,
  caseSignalsSchema,
  pathPreferencesSchema,
  type Case,
  type CaseSignals,
  type DecisionKind
} from "@shared/contracts";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { getCaseStore } from "../lib/caseStore";
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
  changedSignalIds: string[]
) {
  const catalogs = orchestratorCatalogs();
  const result = runDecision({ case: caseData, catalogs });
  const record = getCaseStore().snapshotDecisionRecord({
    case: caseData,
    catalogs,
    result,
    summary,
    kind,
    changedSignalIds
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
        signals.map((signal) => signal.id)
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
        []
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
        [override.signalId]
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
        []
      );
      res.json({ case: forked, result, decisionRecordId: record.decisionId });
    }
  );

  return router;
}
