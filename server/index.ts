import express from "express";
import cors from "cors";
import { healthResponseSchema, type HealthResponse } from "../shared/contracts";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const healthResponse: HealthResponse = {
  status: "ok",
  service: "active-holidays-foundation",
  phase: "phase-1"
};

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json(healthResponseSchema.parse(healthResponse));
});

app.listen(port, () => {
  console.log(`[active-holidays] api listening on http://localhost:${port}`);
});
