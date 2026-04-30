import { Router } from "express";
import { z } from "zod";
import {
  buildIntakeQueue,
  previewVerdict
} from "@shared/domain";
import { intakeNextQuestionRequestSchema } from "@shared/contracts";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { getCaseStore } from "../lib/caseStore";
import { HttpError } from "../middleware/errorHandler";
import { validateBody, validateParams } from "../middleware/validate";

const caseIdParams = z.object({ caseId: z.string().min(1) });

function ensureCase(id: string) {
  const caseData = getCaseStore().get(id);
  if (!caseData) throw new HttpError(404, "Кейс не найден.", "case_not_found");
  return caseData;
}

export function intakeRouter(): Router {
  const router = Router();

  router.post(
    "/next-question",
    validateBody(intakeNextQuestionRequestSchema),
    (req, res) => {
      const { caseId } = req.body as z.infer<typeof intakeNextQuestionRequestSchema>;
      const caseData = ensureCase(caseId);
      const queue = buildIntakeQueue(caseData.signals, caseData.productType);
      res.json(queue);
    }
  );

  router.get("/preview/:caseId", validateParams(caseIdParams), (req, res) => {
    const raw = req.params.caseId;
    const caseId = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
    const caseData = ensureCase(caseId);
    const catalogs = getCatalogsOrThrow();
    const preview = previewVerdict(
      {
        case: caseData,
        catalogs: {
          paths: catalogs.paths,
          visaRules: catalogs.visaRules,
          restrictions: catalogs.restrictions,
          sources: catalogs.sources,
          ruleEvidence: catalogs.ruleEvidence,
          residencyPrograms: catalogs.residencyPrograms,
          insuranceProducts: catalogs.insuranceProducts
        }
      },
      {
        now: () => new Date()
      }
    );
    res.json(preview);
  });

  return router;
}
