import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { approvalGates, readScoringModel, readTaskStatusRecords } from "./runtime";

type Candidate = {
  id: string;
  title: string;
  productReason: string;
  evidence: string[];
  category: string;
  scores: Record<string, number>;
  requiresApproval: string[];
};

type CandidateFile = {
  schemaVersion: number;
  candidates: Candidate[];
};

const repoRoot = process.cwd();

const requiredFiles = [
  ".autonomous/operating-system.md",
  ".autonomous/scoring-model.md",
  ".autonomous/scoring-model.json",
  ".autonomous/task-status.json",
  ".autonomous/safety-gates.md",
  ".autonomous/workflows.md",
  ".autonomous/founder-report-template.md",
  ".autonomous/next-best-task-loop.md",
  ".autonomous/task-candidates.json",
  "scripts/autonomous/runtime.ts",
  "scripts/autonomous/execute-autonomous-task.ts",
  "scripts/autonomous/health.ts",
  "scripts/autonomous/level-b.ts",
  "scripts/autonomous/next-best-task-loop.ts",
  "scripts/autonomous/run-autonomous-cycle.ts",
  "scripts/autonomous/verify-autonomous-os.ts",
  ".github/workflows/autonomous-checks.yml"
];

const requiredPackageScripts = [
  "autonomous:next",
  "autonomous:next:write",
  "autonomous:cycle",
  "autonomous:execute",
  "autonomous:health",
  "autonomous:level-b",
  "autonomous:level-b:write",
  "autonomous:verify"
];
const knownApprovalGates = new Set<string>(approvalGates);
const requiredTieBreakers = [
  "balancedScore:desc",
  "impact:desc",
  "cost:asc",
  "scores.strategicFit:desc",
  "scores.engineeringHealth:desc",
  "id:asc"
];

const requiredSafetyPhrases = [
  "merge into `main`",
  "production deploy",
  "live Notion writeback",
  "paid API action",
  "legal or commercial claim",
  "secrets, billing, credentials",
  "destructive database action"
];

function read(filePath: string): string {
  return readFileSync(path.join(repoRoot, filePath), "utf8");
}

function fail(message: string): never {
  throw new Error(message);
}

function assertFileExists(filePath: string) {
  if (!existsSync(path.join(repoRoot, filePath))) {
    fail(`missing required autonomous file: ${filePath}`);
  }
}

function assertNoPlaceholders(filePath: string) {
  const content = read(filePath);
  if (/\b(TBD|TODO|PLACEHOLDER)\b/i.test(content)) {
    fail(`placeholder found in ${filePath}`);
  }
}

function assertPackageScripts() {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  for (const scriptName of requiredPackageScripts) {
    if (!packageJson.scripts?.[scriptName]) {
      fail(`missing package script: ${scriptName}`);
    }
  }
}

function assertSafetyGates() {
  const safetyGates = read(".autonomous/safety-gates.md");
  for (const phrase of requiredSafetyPhrases) {
    if (!safetyGates.includes(phrase)) {
      fail(`safety gate doc missing phrase: ${phrase}`);
    }
  }
}

function assertCandidates() {
  const candidateFile = JSON.parse(read(".autonomous/task-candidates.json")) as CandidateFile;
  if (candidateFile.schemaVersion !== 1) {
    fail("task-candidates.json schemaVersion must be 1");
  }
  if (!Array.isArray(candidateFile.candidates) || candidateFile.candidates.length < 10) {
    fail("task-candidates.json must contain at least 10 candidates");
  }

  const ids = new Set<string>();
  for (const candidate of candidateFile.candidates) {
    if (ids.has(candidate.id)) fail(`duplicate candidate id: ${candidate.id}`);
    ids.add(candidate.id);
    if (!candidate.title || !candidate.productReason) {
      fail(`candidate ${candidate.id} missing title or productReason`);
    }
    if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) {
      fail(`candidate ${candidate.id} must declare evidence`);
    }
    for (const gate of candidate.requiresApproval) {
      if (!knownApprovalGates.has(gate)) {
        fail(`candidate ${candidate.id} has unknown approval gate: ${gate}`);
      }
    }
    for (const evidencePath of candidate.evidence) {
      if (!existsSync(path.join(repoRoot, evidencePath))) {
        fail(`candidate ${candidate.id} evidence missing: ${evidencePath}`);
      }
    }
    for (const scoreName of [
      "trust",
      "conversion",
      "polish",
      "engineeringHealth",
      "strategicFit",
      "risk",
      "effort"
    ]) {
      const value = candidate.scores[scoreName];
      if (!Number.isFinite(value) || value < 0 || value > 10) {
        fail(`candidate ${candidate.id} score ${scoreName} must be 0-10`);
      }
    }
  }
}

function assertScoringModel() {
  const scoringModel = readScoringModel(repoRoot);
  const summary = scoringModel.tieBreakers.map(
    (tieBreaker) => `${tieBreaker.field}:${tieBreaker.direction}`
  );
  if (summary.join("|") !== requiredTieBreakers.join("|")) {
    fail(`scoring model tieBreakers drifted: ${summary.join(", ")}`);
  }
}

function assertTaskStatus(candidateIds: Set<string>) {
  const records = readTaskStatusRecords(repoRoot, candidateIds);
  const completedIds = records
    .filter((record) => record.status === "completed")
    .map((record) => record.id);
  if (!completedIds.includes("autonomy-runtime-scoring")) {
    fail("task-status.json must mark autonomy-runtime-scoring as completed after PR #7");
  }
}

function assertNextLoopRuns() {
  const output = execFileSync(
    "npx",
    ["tsx", "scripts/autonomous/next-best-task-loop.ts", "--json"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );
  const parsed = JSON.parse(output) as {
    selected?: { id?: string; taskStatus?: string };
    blockedCandidates?: Array<{ id?: string; taskStatus?: string; blockedLifecycleStatus?: string | null }>;
    scoringModel?: { schemaVersion?: number; tieBreakers?: string[] };
  };
  if (!parsed.selected?.id) {
    fail("next-best-task-loop did not select an eligible task");
  }
  if (parsed.selected.taskStatus !== "ready") {
    fail(`next-best-task-loop selected non-ready task: ${parsed.selected.id}`);
  }
  const completedScoringCandidate = parsed.blockedCandidates?.find(
    (candidate) => candidate.id === "autonomy-runtime-scoring"
  );
  if (completedScoringCandidate?.blockedLifecycleStatus !== "completed") {
    fail("next-best-task-loop did not block completed autonomy-runtime-scoring candidate");
  }
  if (parsed.scoringModel?.schemaVersion !== 1) {
    fail("next-best-task-loop did not expose scoring model schemaVersion");
  }
  if (parsed.scoringModel?.tieBreakers?.join("|") !== requiredTieBreakers.join("|")) {
    fail("next-best-task-loop did not expose the expected scoring tieBreakers");
  }
}

function assertExecutorDryRunRuns() {
  const output = execFileSync(
    "npx",
    [
      "tsx",
      "scripts/autonomous/execute-autonomous-task.ts",
      "--json",
      "--allow-dirty-tracked",
      "--allow-non-base-branch"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );
  const parsed = JSON.parse(output) as {
    selected?: { id?: string; taskStatus?: string; blockedGates?: string[] };
    blocked?: boolean;
  };
  if (parsed.blocked) {
    fail("executor dry-run must not be blocked in a clean repository");
  }
  if (!parsed.selected?.id) {
    fail("executor dry-run did not select an executor-safe task");
  }
  if (parsed.selected.taskStatus !== "ready") {
    fail(`executor dry-run selected non-ready task: ${parsed.selected.id}`);
  }
  if (parsed.selected.blockedGates && parsed.selected.blockedGates.length > 0) {
    fail(`executor dry-run selected gated task: ${parsed.selected.id}`);
  }
}

function assertLevelBRuns() {
  const output = execFileSync(
    "npx",
    [
      "tsx",
      "scripts/autonomous/level-b.ts",
      "--json",
      "--allow-dirty-tracked",
      "--allow-non-base-branch"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );
  const parsed = JSON.parse(output) as {
    status?: string;
    levelB?: {
      agentSync?: { status?: string; totalAgents?: number };
      criteria?: { localExecutor?: string; failClosedExternalGates?: string };
    };
    executionPacket?: { levelB?: unknown };
    health?: { subsystems?: unknown[] };
  };

  if (!["passed", "degraded"].includes(parsed.status ?? "")) {
    fail(`Level B dry-run must pass or degrade in repo-local mode, got ${parsed.status}`);
  }
  if (parsed.levelB?.agentSync?.status !== "passed") {
    fail("Level B dry-run must have synchronized multi-agent packs");
  }
  if ((parsed.levelB?.agentSync?.totalAgents ?? 0) < 27) {
    fail("Level B dry-run must cover every mode with a three-agent pack");
  }
  if (parsed.levelB?.criteria?.localExecutor !== "passed") {
    fail("Level B dry-run must keep local executor passed");
  }
  if (parsed.levelB?.criteria?.failClosedExternalGates !== "passed") {
    fail("Level B dry-run must keep external writes fail-closed");
  }
  if (!parsed.executionPacket?.levelB) {
    fail("executor packet must include levelB readiness");
  }
  if (!Array.isArray(parsed.health?.subsystems) || parsed.health.subsystems.length < 5) {
    fail("Level B health must include subsystem diagnostics");
  }
}

function assertExecutorFailsClosedOnCurrentTrackedDirtyTree() {
  const trackedGitStatus = execFileSync("git", ["status", "--short", "--untracked-files=no"], {
    cwd: repoRoot,
    encoding: "utf8"
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (trackedGitStatus.length === 0) return;

  let output = "";
  try {
    output = execFileSync(
      "npx",
      ["tsx", "scripts/autonomous/execute-autonomous-task.ts", "--json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    fail("executor dry-run must be blocked when current tracked working tree is dirty");
  } catch (error) {
    const execError = error as { stdout?: string };
    output = execError.stdout ?? "";
  }

  const parsed = JSON.parse(output) as { blocked?: boolean; blockedReasons?: string[] };
  if (!parsed.blocked) {
    fail("executor dirty-tree dry-run did not report blocked:true");
  }
  if (!parsed.blockedReasons?.some((reason) => reason.includes("Tracked working tree не чистый"))) {
    fail("executor dirty-tree dry-run did not report the tracked working tree blocker");
  }
}

function assertWorkflowCoverage() {
  const workflow = read(".github/workflows/autonomous-checks.yml");
  for (const phrase of [
    "npm run skills:verify",
    "npm run automations:check:all",
    "npm run yepcode:orchestrator:test",
    "npm run yepcode:orchestrator:dry-run"
  ]) {
    if (!workflow.includes(phrase)) {
      fail(`workflow missing readiness command: ${phrase}`);
    }
  }
}

function main() {
  for (const filePath of requiredFiles) {
    assertFileExists(filePath);
    if (filePath.endsWith(".md")) assertNoPlaceholders(filePath);
  }
  assertPackageScripts();
  assertSafetyGates();
  assertScoringModel();
  assertCandidates();
  const candidateFile = JSON.parse(read(".autonomous/task-candidates.json")) as CandidateFile;
  assertTaskStatus(new Set(candidateFile.candidates.map((candidate) => candidate.id)));
  assertNextLoopRuns();
  assertExecutorDryRunRuns();
  assertLevelBRuns();
  assertExecutorFailsClosedOnCurrentTrackedDirtyTree();
  assertWorkflowCoverage();
  console.log("[OK] autonomous product operating system verified");
}

main();
