import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { computeGateEligibilitySnapshot, type GateEligibilitySnapshot } from "./automation-runtime-governance.ts";
import {
  getOperationalSurfaceContractHash,
  getOperationalSurfaceContractVersion
} from "./notion-operational-contract.ts";
import { REPO_RUNTIME_MANIFEST } from "./repo-runtime-manifest.ts";

const execFileAsync = promisify(execFile);

type Scenario = {
  id: string;
  kind: "semantic" | "integrity";
  expectedExitCode: number;
  expectedSubstring: string;
  recomputeSnapshot?: boolean;
  mutate: (repoRoot: string) => Promise<void>;
  assertProjection?: (snapshot: GateEligibilitySnapshot) => string | null;
};

async function copyRepo(sourceRoot: string, targetRoot: string): Promise<void> {
  const excluded = new Set([
    ".git",
    "node_modules",
    "dist",
    "coverage",
    "output",
    ".DS_Store"
  ]);
  await cp(sourceRoot, targetRoot, {
    recursive: true,
    filter: (sourcePath) => {
      const relativePath = path.relative(sourceRoot, sourcePath);
      if (!relativePath || relativePath === ".") return true;
      return !relativePath.split(path.sep).some((segment) => excluded.has(segment));
    }
  });
}

async function recomputeSnapshot(repoRoot: string): Promise<void> {
  const snapshot = await computeGateEligibilitySnapshot(repoRoot, {
    includeVolatileState: false
  });
  const snapshotPath = path.join(repoRoot, REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath);
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

async function readJson<T>(target: string): Promise<T> {
  return JSON.parse(await readFile(target, "utf8")) as T;
}

async function writeJson(target: string, value: unknown): Promise<void> {
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeReportPair(
  repoRoot: string,
  automationId: string,
  isoTimestamp: string
): Promise<void> {
  const reportRoot = path.join(repoRoot, REPO_RUNTIME_MANIFEST.runtimeReportsRoot, automationId);
  await mkdir(reportRoot, { recursive: true });
  const datePart = isoTimestamp.slice(0, 10);
  const markdown = `---\nlastVerifiedAt: ${isoTimestamp}\n---\n\n# ${automationId}\n\nNear-green fixture.\n`;
  await writeFile(path.join(reportRoot, "latest.md"), markdown, "utf8");
  await writeFile(path.join(reportRoot, `${datePart}.md`), markdown, "utf8");
}

async function setupNearGreenBaseline(repoRoot: string): Promise<void> {
  const fixtureTime = "2026-04-23T12:00:00.000Z";
  const executionTargetId = "execution-target-near-green";
  const executionDataSourceId = "collection://execution-near-green";

  await rm(path.join(repoRoot, REPO_RUNTIME_MANIFEST.runtimeObservedRoot), {
    recursive: true,
    force: true
  });
  await rm(path.join(repoRoot, REPO_RUNTIME_MANIFEST.executionRunsRoot), {
    recursive: true,
    force: true
  });

  for (const automationId of [
    "ah-truth-freshness-watch",
    "ah-product-os-radar",
    "ah-execution-brief-sync",
    "ah-design-drift-vs-contract",
    "ah-open-decisions-curator",
    "ah-release-gate-sync",
    "ah-review-learning-distiller",
    "ah-notion-sync-director"
  ]) {
    await writeReportPair(repoRoot, automationId, fixtureTime);
  }

  const directorReportsRoot = path.join(
    repoRoot,
    REPO_RUNTIME_MANIFEST.runtimeReportsRoot,
    "ah-notion-sync-director"
  );
  await mkdir(directorReportsRoot, { recursive: true });
  await writeJson(path.join(directorReportsRoot, "dry-run-diff.json"), {
    kind: "notion_dry_run_diff",
    packets: [
      {
        surface: "Execution",
        packetKey:
          "Execution:execution:near-green:ah-notion-sync-director:near-green:2026-04-23T12:00:00.000Z:near-green-diff-hash",
        syncKey: "execution:near-green",
        sourceReportId: "ah-notion-sync-director:near-green",
        lastVerifiedAt: fixtureTime,
        packetLifecycle: "ready_for_sync",
        diffHash: "near-green-diff-hash",
        dedupeKey: "executor:Execution:execution:near-green"
      }
    ]
  });

  const lockPath = path.join(repoRoot, REPO_RUNTIME_MANIFEST.notionSurfaceLockPath);
  const lock = await readJson<Record<string, unknown>>(lockPath);
  const lockOperational = (lock.operationalSurfaces ?? {}) as Record<string, Record<string, unknown>>;
  lockOperational.Execution = {
    ...(lockOperational.Execution ?? {}),
    auditOutcome: "confirmed",
    targetId: executionTargetId,
    dataSourceId: executionDataSourceId,
    targetResolutionLifecycle: "live_id_bound"
  };
  lock.operationalSurfaces = lockOperational;
  await writeJson(lockPath, lock);

  await recomputeSnapshot(repoRoot);
}

async function runVerify(repoRoot: string): Promise<{ exitCode: number; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      ["--experimental-strip-types", "scripts/codex/verify-automations.ts"],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );
    return { exitCode: 0, output: `${stdout}\n${stderr}` };
  } catch (error) {
    const typed = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      exitCode: typeof typed.code === "number" ? typed.code : 1,
      output: `${typed.stdout ?? ""}\n${typed.stderr ?? typed.message ?? ""}`
    };
  }
}

async function appendDirectorVolatilePath(repoRoot: string): Promise<void> {
  const samplePath = path.join(
    repoRoot,
    ".codex/automations/ah-notion-sync-director/sample-output.md"
  );
  const text = await readFile(samplePath, "utf8");
  await writeFile(
    samplePath,
    `${text.trimEnd()}\n\n- Eligibility source override: reports/automations/state/runtime-observed/test.json\n`,
    "utf8"
  );
}

async function enableExecutionWritebackWithoutTrackedPacket(repoRoot: string): Promise<void> {
  const fixtureTime = "2026-04-23T12:00:00.000Z";
  const promotionPath = path.join(repoRoot, REPO_RUNTIME_MANIFEST.notionWritebackPromotionPath);
  const promotion = await readJson<Record<string, unknown>>(promotionPath);
  const promotionSurfaces = (promotion.surfaces ?? {}) as Record<string, Record<string, unknown>>;
  promotionSurfaces.Execution = {
    ...(promotionSurfaces.Execution ?? {}),
    currentState: "writeback_enabled",
    targetId: "execution-target-near-green",
    dataSourceId: "collection://execution-near-green",
    requiredContractHash: getOperationalSurfaceContractHash("Execution"),
    requiredContractVersion: getOperationalSurfaceContractVersion("Execution"),
    requiredDiffHash: "near-green-diff-hash",
    operatorUpdatedAt: fixtureTime,
    operatorUpdatedBy: "negative-harness",
    rationale: "Writeback must remain blocked without tracked packet evidence."
  };
  promotion.surfaces = promotionSurfaces;
  await writeJson(promotionPath, promotion);
  await recomputeSnapshot(repoRoot);
}

async function tamperStoredSnapshot(repoRoot: string): Promise<void> {
  const snapshotPath = path.join(repoRoot, REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath);
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as Record<string, unknown>;
  snapshot.projectionHash = "tampered-projection-hash";
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

const SCENARIOS: Scenario[] = [
  {
    id: "baseline_passes",
    kind: "semantic",
    expectedExitCode: 0,
    expectedSubstring: "[OK] verified",
    mutate: async () => {}
  },
  {
    id: "rejects_direct_volatile_prompt_read",
    kind: "semantic",
    expectedExitCode: 1,
    expectedSubstring: "must not read volatile runtime paths directly",
    mutate: appendDirectorVolatilePath
  },
  {
    id: "blocks_writeback_without_tracked_packet_evidence",
    kind: "semantic",
    expectedExitCode: 1,
    expectedSubstring: "requires deterministic ready_for_sync dry-run diff",
    mutate: enableExecutionWritebackWithoutTrackedPacket
  },
  {
    id: "detects_snapshot_tamper",
    kind: "integrity",
    expectedExitCode: 1,
    expectedSubstring: "snapshot drift detected",
    mutate: tamperStoredSnapshot
  }
];

async function main() {
  const sourceRoot = process.cwd();
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ah-automations-negative-"));
  const baseRepoRoot = path.join(tempRoot, "base");
  await copyRepo(sourceRoot, baseRepoRoot);

  const failures: string[] = [];
  let semanticCases = 0;

  for (const scenario of SCENARIOS) {
    const scenarioRepoRoot = path.join(tempRoot, scenario.id);
    await cp(baseRepoRoot, scenarioRepoRoot, { recursive: true });
    await setupNearGreenBaseline(scenarioRepoRoot);
    await scenario.mutate(scenarioRepoRoot);
    if (scenario.recomputeSnapshot) {
      await recomputeSnapshot(scenarioRepoRoot);
    }
    if (scenario.kind === "semantic") semanticCases += 1;

    if (scenario.assertProjection) {
      const snapshot = await computeGateEligibilitySnapshot(scenarioRepoRoot);
      const projectionFailure = scenario.assertProjection(snapshot);
      if (projectionFailure) {
        failures.push(`${scenario.id}: projection assertion failed: ${projectionFailure}`);
        continue;
      }
    }

    const result = await runVerify(scenarioRepoRoot);
    const hasExpectedText = result.output.includes(scenario.expectedSubstring);
    if (result.exitCode !== scenario.expectedExitCode || !hasExpectedText) {
      const outputSnippet = result.output.slice(0, 800).replace(/\s+/g, " ").trim();
      failures.push(
        `${scenario.id}: expected exit ${scenario.expectedExitCode} and text "${scenario.expectedSubstring}", got exit ${result.exitCode}; output=${outputSnippet}`
      );
    } else {
      console.log(`[OK] ${scenario.id}`);
    }
  }

  await rm(tempRoot, { recursive: true, force: true });

  if (semanticCases < 2) {
    failures.push("negative harness must contain at least two semantic scenarios");
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`[FAIL] ${failure}`);
    process.exit(1);
  }

  console.log(`[OK] negative fixtures passed: ${SCENARIOS.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "negative fixture run failed");
  process.exit(1);
});
