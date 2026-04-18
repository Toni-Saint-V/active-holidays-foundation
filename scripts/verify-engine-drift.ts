// Engine drift gate. Runs all scenarios in data/scenarios/scenarios.json
// through the live engine and compares the projection + fingerprint against
// per-scenario baselines in data/scenarios/baseline/<caseId>.json.
//
// Usage:
//   tsx scripts/verify-engine-drift.ts             # check mode, exit 1 on drift
//   tsx scripts/verify-engine-drift.ts --update    # rewrite baselines

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { verdictSchema, actionTypeSchema, type Case } from "@shared/contracts";
import {
  ENGINE_REVISION,
  ENGINE_VERSION,
  fingerprintCatalogs,
  fingerprintResult,
  runDecision,
  type OrchestratorCatalogs
} from "@shared/domain/engine";
import { loadCatalogs } from "../server/lib/catalogs";

const scenarioSchema = z.object({
  caseId: z.string(),
  productType: z.string().optional(),
  title: z.string(),
  subtitle: z.string(),
  expectedVerdict: verdictSchema,
  expectedActionType: actionTypeSchema,
  expectedPrimaryPath: z.string().nullable(),
  note: z.string()
});
const scenariosSchema = z.array(scenarioSchema);

const baselineSchema = z.object({
  caseId: z.string().min(1),
  engineVersion: z.string().min(1),
  engineRevision: z.string().min(1),
  resultFingerprint: z.string().min(1),
  catalogFingerprint: z.string().min(1),
  verdict: verdictSchema,
  nextActionType: actionTypeSchema,
  primaryPathId: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});
type Baseline = z.infer<typeof baselineSchema>;

const SCENARIOS_PATH = path.resolve(
  process.cwd(),
  "data/scenarios/scenarios.json"
);
const BASELINE_DIR = path.resolve(process.cwd(), "data/scenarios/baseline");

export type DriftReport = {
  ok: boolean;
  checked: number;
  drifted: string[];
  missingBaselines: string[];
  messages: string[];
};

async function readScenarios() {
  const raw = await readFile(SCENARIOS_PATH, "utf8");
  return scenariosSchema.parse(JSON.parse(raw));
}

async function readBaseline(caseId: string): Promise<Baseline | null> {
  const file = path.join(BASELINE_DIR, `${caseId}.json`);
  try {
    const raw = await readFile(file, "utf8");
    return baselineSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeBaseline(baseline: Baseline): Promise<void> {
  await mkdir(BASELINE_DIR, { recursive: true });
  const file = path.join(BASELINE_DIR, `${baseline.caseId}.json`);
  await writeFile(file, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
}

function projectResult(
  caseId: string,
  result: ReturnType<typeof runDecision>,
  catalogFingerprint: string
): Baseline {
  return {
    caseId,
    engineVersion: ENGINE_VERSION,
    engineRevision: ENGINE_REVISION,
    resultFingerprint: fingerprintResult(result),
    catalogFingerprint,
    verdict: result.verdict,
    nextActionType: result.nextAction.type,
    primaryPathId: result.primaryPath?.id ?? null,
    confidence: Math.round(result.trust.confidence * 100) / 100
  };
}

function compareBaselines(current: Baseline, baseline: Baseline): string[] {
  const diffs: string[] = [];
  if (current.resultFingerprint !== baseline.resultFingerprint) {
    diffs.push(
      `resultFingerprint: ${baseline.resultFingerprint.slice(0, 12)}… → ${current.resultFingerprint.slice(0, 12)}…`
    );
  }
  if (current.catalogFingerprint !== baseline.catalogFingerprint) {
    diffs.push(
      `catalogFingerprint: ${baseline.catalogFingerprint.slice(0, 12)}… → ${current.catalogFingerprint.slice(0, 12)}…`
    );
  }
  if (current.verdict !== baseline.verdict) {
    diffs.push(`verdict: ${baseline.verdict} → ${current.verdict}`);
  }
  if (current.nextActionType !== baseline.nextActionType) {
    diffs.push(
      `nextActionType: ${baseline.nextActionType} → ${current.nextActionType}`
    );
  }
  if (current.primaryPathId !== baseline.primaryPathId) {
    diffs.push(
      `primaryPathId: ${baseline.primaryPathId ?? "null"} → ${current.primaryPathId ?? "null"}`
    );
  }
  if (current.confidence !== baseline.confidence) {
    diffs.push(`confidence: ${baseline.confidence} → ${current.confidence}`);
  }
  if (current.engineVersion !== baseline.engineVersion) {
    diffs.push(
      `engineVersion: ${baseline.engineVersion} → ${current.engineVersion}`
    );
  }
  if (current.engineRevision !== baseline.engineRevision) {
    diffs.push(
      `engineRevision: ${baseline.engineRevision} → ${current.engineRevision}`
    );
  }
  return diffs;
}

export type VerifyOptions = {
  update?: boolean;
  scenariosPath?: string;
  baselineDir?: string;
};

export async function verifyEngineDrift(
  options: VerifyOptions = {}
): Promise<DriftReport> {
  const update = !!options.update;
  const scenariosPath = options.scenariosPath ?? SCENARIOS_PATH;
  const baselineDir = options.baselineDir ?? BASELINE_DIR;

  const scenariosRaw = await readFile(scenariosPath, "utf8");
  const scenarios = scenariosSchema.parse(JSON.parse(scenariosRaw));
  const catalogs = await loadCatalogs();
  const runnerCatalogs: OrchestratorCatalogs = {
    paths: catalogs.paths,
    visaRules: catalogs.visaRules,
    restrictions: catalogs.restrictions,
    sources: catalogs.sources,
    residencyPrograms: catalogs.residencyPrograms,
    insuranceProducts: catalogs.insuranceProducts
  };
  const catalogFingerprint = fingerprintCatalogs(runnerCatalogs);

  const drifted: string[] = [];
  const missingBaselines: string[] = [];
  const messages: string[] = [];

  for (const scenario of scenarios) {
    const caseData = catalogs.cases.find((item) => item.id === scenario.caseId);
    if (!caseData) {
      messages.push(
        `[${scenario.caseId}] Кейс не найден в data/db/cases.json — сценарий пропущен.`
      );
      drifted.push(scenario.caseId);
      continue;
    }
    const result = runDecision({ case: caseData as Case, catalogs: runnerCatalogs });
    const current = projectResult(scenario.caseId, result, catalogFingerprint);

    const baselineFile = path.join(baselineDir, `${scenario.caseId}.json`);
    let baseline: Baseline | null = null;
    try {
      const raw = await readFile(baselineFile, "utf8");
      baseline = baselineSchema.parse(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    if (update) {
      await mkdir(baselineDir, { recursive: true });
      await writeFile(
        baselineFile,
        `${JSON.stringify(current, null, 2)}\n`,
        "utf8"
      );
      messages.push(`[${scenario.caseId}] baseline обновлён.`);
      continue;
    }

    if (!baseline) {
      missingBaselines.push(scenario.caseId);
      messages.push(
        `[${scenario.caseId}] baseline отсутствует. Запустите npm run verify:engine:update, чтобы создать.`
      );
      continue;
    }

    const diffs = compareBaselines(current, baseline);
    if (diffs.length > 0) {
      drifted.push(scenario.caseId);
      messages.push(`[${scenario.caseId}] drift:\n  - ${diffs.join("\n  - ")}`);
    }
  }

  const ok = drifted.length === 0 && missingBaselines.length === 0;
  return {
    ok,
    checked: scenarios.length,
    drifted,
    missingBaselines,
    messages
  };
}

async function main() {
  const update = process.argv.includes("--update");
  const report = await verifyEngineDrift({ update });

  for (const message of report.messages) {
    console.log(message);
  }

  if (update) {
    console.log(`OK: baseline пересохранён для ${report.checked} сценариев.`);
    return;
  }

  if (!report.ok) {
    console.error(
      `FAIL: drift у ${report.drifted.length} сценариев${
        report.missingBaselines.length > 0
          ? `, baseline отсутствует у ${report.missingBaselines.length}`
          : ""
      }.`
    );
    process.exit(1);
  }

  console.log(
    `OK: ${report.checked} сценариев совпадают с baseline (engine ${ENGINE_VERSION}@${ENGINE_REVISION}).`
  );
}

// Run as CLI when invoked directly (not when imported by tests).
const isCli = process.argv[1]?.endsWith("verify-engine-drift.ts");
if (isCli) {
  main().catch((error) => {
    console.error("[verify-engine-drift] fatal:", error);
    process.exit(1);
  });
}

// Re-export helpers used by tests.
export { readScenarios, readBaseline, writeBaseline };
