import { Router } from "express";
import { z } from "zod";
import { getRuleDefinitionById, rulesCatalogMetadata, toRuleMetadata } from "@shared/domain";
import { HttpError } from "../middleware/errorHandler";
import { validateParams } from "../middleware/validate";

const idParams = z.object({ id: z.string().min(1) });

export function rulesRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const rules = rulesCatalogMetadata().map((rule) => toRuleMetadata(rule));
    res.json({ rules });
  });

  router.get("/:id", validateParams(idParams), (req, res) => {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
    const rule = getRuleDefinitionById(id);
    if (!rule) throw new HttpError(404, "Правило не найдено.", "rule_not_found");
    res.json(toRuleMetadata(rule));
  });

  return router;
}
