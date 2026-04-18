import { Router } from "express";
import { z } from "zod";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { HttpError } from "../middleware/errorHandler";
import { validateParams } from "../middleware/validate";
import { refreshSourcesWithVolatility } from "@shared/domain";

const idParams = z.object({ id: z.string().min(1) });
const STABLE_NOW = new Date("2026-04-17T09:00:00.000Z");

export function sourcesRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const { sources } = getCatalogsOrThrow();
    const fresh = refreshSourcesWithVolatility(sources, STABLE_NOW);
    res.json({ sources: fresh });
  });

  router.get("/:id", validateParams(idParams), (req, res) => {
    const { sources } = getCatalogsOrThrow();
    const fresh = refreshSourcesWithVolatility(sources, STABLE_NOW);
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
    const match = fresh.find((source) => source.id === id);
    if (!match) throw new HttpError(404, "Источник не найден.", "source_not_found");
    res.json(match);
  });

  return router;
}
