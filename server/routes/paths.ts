import { Router } from "express";
import { z } from "zod";
import { evaluateRules, rankOffers, getSignalValue } from "@shared/domain";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { getCaseStore } from "../lib/caseStore";
import { HttpError } from "../middleware/errorHandler";
import { validateParams } from "../middleware/validate";

const paramsSchema = z.object({ caseId: z.string().min(1) });

export function pathsRouter(): Router {
  const router = Router();

  router.get("/:caseId", validateParams(paramsSchema), (req, res) => {
    const raw = req.params.caseId;
    const caseId = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
    const caseData = getCaseStore().get(caseId);
    if (!caseData) throw new HttpError(404, "Кейс не найден.", "case_not_found");
    const catalogs = getCatalogsOrThrow();
    const citizenship = getSignalValue<string>(caseData.signals, "citizenship");
    const destination = getSignalValue<string>(caseData.signals, "destination");
    const visaRules = catalogs.visaRules.filter(
      (rule) =>
        (!citizenship || rule.citizenship === citizenship) &&
        (!destination || rule.destination === destination)
    );
    const ruleResults = evaluateRules({
      productType: caseData.productType,
      signals: caseData.signals,
      visaRules,
      paths: catalogs.paths,
      restrictions: catalogs.restrictions,
      residencyPrograms: catalogs.residencyPrograms,
      insuranceProducts: catalogs.insuranceProducts
    });
    const ranked = rankOffers({
      productType: caseData.productType,
      paths: catalogs.paths,
      residencyPrograms: catalogs.residencyPrograms,
      insuranceProducts: catalogs.insuranceProducts,
      visaRules,
      ruleResults,
      signals: caseData.signals,
      preferences: caseData.preferences
    });
    res.json({ paths: ranked });
  });

  return router;
}
