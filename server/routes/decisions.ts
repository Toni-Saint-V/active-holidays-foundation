import { Router, type Request } from "express";
import { z } from "zod";
import { driftDiff, fingerprintResult, runDecision } from "@shared/domain/engine";
import { getCaseStore } from "../lib/caseStore";
import { HttpError } from "../middleware/errorHandler";
import { requireInternalApiToken } from "../middleware/internalApi";
import { internalExpensiveRateLimit } from "../middleware/rateLimit";
import { validateParams } from "../middleware/validate";

const decisionIdParams = z.object({ id: z.string().min(1) });

function getId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
}

export function decisionsRouter(): Router {
  const router = Router();

  router.use(requireInternalApiToken);

  router.get("/", (_req, res) => {
    res.json({ decisions: getCaseStore().allDecisions() });
  });

  router.get("/:id", validateParams(decisionIdParams), (req, res) => {
    const id = getId(req);
    const record = getCaseStore().getRecord(id);
    if (!record) {
      throw new HttpError(
        404,
        `Решение ${id} не найдено.`,
        "decision_not_found"
      );
    }
    res.json({ record });
  });

  router.post("/:id/replay", internalExpensiveRateLimit, validateParams(decisionIdParams), (req, res) => {
    const id = getId(req);
    const record = getCaseStore().getRecord(id);
    if (!record) {
      throw new HttpError(
        404,
        `Решение ${id} не найдено.`,
        "decision_not_found"
      );
    }
    if (!record.replayableSnapshot || !record.result) {
      throw new HttpError(
        409,
        "Это legacy-запись без снимка входа. Replay невозможен.",
        "replay_unavailable"
      );
    }
    const snapshot = record.replayableSnapshot;
    if (!snapshot.evidenceContractCaptured) {
      throw new HttpError(
        409,
        "Replay невозможен: исторический снимок создан до evidence contract и не содержит каталог доказательств.",
        "evidence_contract_missing"
      );
    }
    const replayResult = runDecision(
      { case: snapshot.case, catalogs: snapshot.catalogs },
      { now: () => new Date(snapshot.now) }
    );
    const replayFingerprint = fingerprintResult(replayResult);
    const diff = driftDiff(record.result, replayResult);
    // fingerprint covers every field in the result projection; driftDiff only
    // inspects the decision-defining subset. Treat fingerprint mismatch as
    // drift even when diff is null so we never produce a false negative.
    const drifted = diff !== null || replayFingerprint !== record.resultFingerprint;
    res.json({
      decisionId: record.decisionId,
      engineVersion: record.engineVersion,
      engineRevision: record.engineRevision,
      original: {
        resultFingerprint: record.resultFingerprint,
        verdict: record.result.verdict,
        nextActionType: record.result.nextAction.type,
        primaryPathId: record.result.primaryPath?.id ?? null,
        confidence: record.confidence
      },
      replay: {
        resultFingerprint: replayFingerprint,
        verdict: replayResult.verdict,
        nextActionType: replayResult.nextAction.type,
        primaryPathId: replayResult.primaryPath?.id ?? null,
        confidence: Math.round(replayResult.trust.confidence * 100) / 100
      },
      drifted,
      diff
    });
  });

  return router;
}
