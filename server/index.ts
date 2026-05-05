import express from "express";
import cors from "cors";
import { healthResponseSchema, type HealthResponse } from "@shared/contracts";
import { loadCatalogs } from "./lib/catalogs";
import { initializeCaseStore } from "./lib/caseStore";
import {
  loadPersistedHumanReviews,
  savePersistedHumanReviews
} from "./lib/humanReviewPersistence";
import {
  loadPersistedHumanReviewLearningEvents,
  savePersistedHumanReviewLearningEvents
} from "./lib/humanReviewLearningPersistence";
import { initializeHumanReviewLearningStore } from "./lib/humanReviewLearningStore";
import { requestLogger } from "./middleware/logger";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { casesRouter } from "./routes/cases";
import { sourcesRouter } from "./routes/sources";
import { rulesRouter } from "./routes/rules";
import { pathsRouter } from "./routes/paths";
import { intakeRouter } from "./routes/intake";
import { decisionsRouter } from "./routes/decisions";
import { scenariosRouter } from "./routes/scenarios";
import { humanReviewWorkbenchRouter } from "./routes/humanReviewWorkbench";

export async function createApp(): Promise<express.Express> {
  const app = express();
  const catalogs = await loadCatalogs();
  const humanReviews = await loadPersistedHumanReviews();
  const humanReviewLearningEvents = await loadPersistedHumanReviewLearningEvents();
  initializeCaseStore(catalogs, {
    humanReviews,
    persistHumanReviews: savePersistedHumanReviews
  });
  initializeHumanReviewLearningStore({
    events: humanReviewLearningEvents,
    persistEvents: savePersistedHumanReviewLearningEvents
  });

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  const healthResponse: HealthResponse = {
    status: "ok",
    service: "active-holidays-foundation",
    phase: "m1",
    version: "rdc.v1"
  };

  app.get("/api/health", (_req, res) => {
    res.json(healthResponseSchema.parse(healthResponse));
  });

  app.use("/api/cases", casesRouter());
  app.use("/api/sources", sourcesRouter());
  app.use("/api/rules", rulesRouter());
  app.use("/api/paths", pathsRouter());
  app.use("/api/intake", intakeRouter());
  app.use("/api/decisions", decisionsRouter());
  app.use("/api/scenarios", scenariosRouter());
  app.use("/api/human-review", humanReviewWorkbenchRouter());

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

async function start() {
  const port = Number(process.env.PORT ?? 3001);
  const app = await createApp();
  app.listen(port, () => {
    console.log(`[active-holidays] api listening on http://localhost:${port}`);
  });
}

const isCli = /server\/index\.(ts|js)$/.test(process.argv[1] ?? "");
if (isCli) {
  start().catch((error) => {
    console.error("[active-holidays] failed to start:", error);
    process.exit(1);
  });
}
