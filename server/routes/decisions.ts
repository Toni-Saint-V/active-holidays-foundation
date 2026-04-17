import { Router } from "express";
import { getCaseStore } from "../lib/caseStore";

export function decisionsRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ decisions: getCaseStore().allDecisions() });
  });

  return router;
}
