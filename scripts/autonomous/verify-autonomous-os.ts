import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { approvalGates } from "./runtime";

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
  ".autonomous/safety-gates.md",
  ".autonomous/workflows.md",
  ".autonomous/founder-report-template.md",
  ".autonomous/next-best-task-loop.md",
  ".autonomous/task-candidates.json",
  "scripts/autonomous/runtime.ts",
  "scripts/autonomous/execute-autonomous-task.ts",
  "scripts/autonomous/next-best-task-loop.ts",
  "scripts/autonomous/verify-autonomous-os.ts",
  ".github/workflows/autonomous-checks.yml"
];

const requiredPackageScripts = [
  "autonomous:next",
  "autonomous:next:write",
  "autonomous:execute",
  "autonomous:verify"
];
const knownApprovalGates = new Set<string>(approvalGates);

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

function assertNextLoopRuns() {
  const output = execFileSync(
    "npx",
    ["tsx", "scripts/autonomous/next-best-task-loop.ts", "--json"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );
  const parsed = JSON.parse(output) as { selected?: { id?: string } };
  if (!parsed.selected?.id) {
    fail("next-best-task-loop did not select an eligible task");
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
  const parsed = JSON.parse(output) as { selected?: { id?: string }; blocked?: boolean };
  if (parsed.blocked) {
    fail("executor dry-run must not be blocked in a clean repository");
  }
  if (!parsed.selected?.id) {
    fail("executor dry-run did not select an executor-safe task");
  }
}

function assertExecutorFailsClosedOnCurrentDirtyTree() {
  const gitStatus = execFileSync("git", ["status", "--short"], {
    cwd: repoRoot,
    encoding: "utf8"
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (gitStatus.length === 0) return;

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
    fail("executor dry-run must be blocked when current working tree is dirty");
  } catch (error) {
    const execError = error as { stdout?: string };
    output = execError.stdout ?? "";
  }

  const parsed = JSON.parse(output) as { blocked?: boolean; blockedReasons?: string[] };
  if (!parsed.blocked) {
    fail("executor dirty-tree dry-run did not report blocked:true");
  }
  if (!parsed.blockedReasons?.some((reason) => reason.includes("Working tree не чистый"))) {
    fail("executor dirty-tree dry-run did not report the working tree blocker");
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
  assertCandidates();
  assertNextLoopRuns();
  assertExecutorDryRunRuns();
  assertExecutorFailsClosedOnCurrentDirtyTree();
  assertWorkflowCoverage();
  console.log("[OK] autonomous product operating system verified");
}

main();
