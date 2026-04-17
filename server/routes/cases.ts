import { Router, type Request } from "express";
import { z } from "zod";
import {
  caseOverrideSchema,
  caseSignalsSchema,
  pathPreferencesSchema,
  type Case,
  type CaseSignals
} from "@shared/contracts";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { getCaseStore } from "../lib/caseStore";
import { HttpError } from "../middleware/errorHandler";
import { validateBody, validateParams } from "../middleware/validate";
import { runDecision } from "@shared/domain";

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

function orchestratorCatalogs() {
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
      const result = computeResult(updated);
      store.snapshotDecision(
        updated.id,
        result.verdict,
        result.trust.confidence,
        `Пересчёт после изменения ${signals.length} сигналов.`,
        "recompute",
        signals.map((signal) => signal.id)
      );
      res.json({ case: updated, result });
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
      const result = computeResult(updated);
      store.snapshotDecision(
        updated.id,
        result.verdict,
        result.trust.confidence,
        preferences ? "Пересчёт с новыми предпочтениями по маршрутам." : "Пересчёт без изменений.",
        "recompute",
        []
      );
      res.json({ case: updated, result });
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
      const result = computeResult(updated);
      store.snapshotDecision(
        updated.id,
        result.verdict,
        result.trust.confidence,
        `Override сигнала ${override.signalId}: ${override.reason}.`,
        "override",
        [override.signalId]
      );
      res.json({ case: updated, result });
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
      const result = computeResult(forked);
      store.snapshotDecision(
        forked.id,
        result.verdict,
        result.trust.confidence,
        `Форк кейса ${id}.`,
        "fork",
        []
      );
      res.json({ case: forked, result });
    }
  );

  return router;
}
