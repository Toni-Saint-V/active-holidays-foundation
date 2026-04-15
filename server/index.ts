import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "active-holidays-foundation",
    phase: "phase-1"
  });
});

app.listen(port, () => {
  console.log(`[active-holidays] api listening on http://localhost:${port}`);
});
