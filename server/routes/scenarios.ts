import { Router } from "express";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { verdictSchema, actionTypeSchema } from "@shared/contracts";

const scenarioSchema = z.object({
  caseId: z.string(),
  title: z.string(),
  subtitle: z.string(),
  expectedVerdict: verdictSchema,
  expectedActionType: actionTypeSchema,
  expectedPrimaryPath: z.string().nullable(),
  note: z.string()
});

const scenariosSchema = z.array(scenarioSchema);

async function loadScenarios() {
  const filePath = path.resolve(process.cwd(), "data/scenarios/scenarios.json");
  const raw = await readFile(filePath, "utf8");
  return scenariosSchema.parse(JSON.parse(raw));
}

export function scenariosRouter(): Router {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const scenarios = await loadScenarios();
      res.json({ scenarios });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
