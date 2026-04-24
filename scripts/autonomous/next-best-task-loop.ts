import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type ApprovalGate =
  | "merge_main"
  | "production_deploy"
  | "live_notion_strategic_writeback"
  | "paid_api_action"
  | "legal_commercial_claim"
  | "secrets_billing_credentials"
  | "destructive_database_or_production_action"
  | "ui_design_approval";

type Scores = {
  trust: number;
  conversion: number;
  polish: number;
  engineeringHealth: number;
  strategicFit: number;
  risk: number;
  effort: number;
};

type Candidate = {
  id: string;
  title: string;
  productReason: string;
  evidence: string[];
  category: string;
  scores: Scores;
  requiresApproval: ApprovalGate[];
};

type CandidateFile = {
  schemaVersion: number;
  candidates: Candidate[];
};

const repoRoot = process.cwd();
const candidatesPath = path.join(repoRoot, ".autonomous", "task-candidates.json");
const outputDir = path.join(repoRoot, "reports", "autonomous");

const blockedApprovalGates = new Set<ApprovalGate>([
  "merge_main",
  "production_deploy",
  "live_notion_strategic_writeback",
  "paid_api_action",
  "legal_commercial_claim",
  "secrets_billing_credentials",
  "destructive_database_or_production_action"
]);

const weights = {
  trust: 0.26,
  conversion: 0.2,
  polish: 0.18,
  engineeringHealth: 0.22,
  strategicFit: 0.14,
  risk: 0.18,
  effort: 0.12
} as const;

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function getGitStatus(): string[] {
  try {
    return execFileSync("git", ["status", "--short"], {
      cwd: repoRoot,
      encoding: "utf8"
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, value));
}

function scoreCandidate(candidate: Candidate) {
  const scores = {
    trust: clampScore(candidate.scores.trust),
    conversion: clampScore(candidate.scores.conversion),
    polish: clampScore(candidate.scores.polish),
    engineeringHealth: clampScore(candidate.scores.engineeringHealth),
    strategicFit: clampScore(candidate.scores.strategicFit),
    risk: clampScore(candidate.scores.risk),
    effort: clampScore(candidate.scores.effort)
  };

  const impact =
    scores.trust * weights.trust +
    scores.conversion * weights.conversion +
    scores.polish * weights.polish +
    scores.engineeringHealth * weights.engineeringHealth +
    scores.strategicFit * weights.strategicFit;
  const cost = scores.risk * weights.risk + scores.effort * weights.effort;
  const balancedScore = Math.round((impact - cost) * 10) / 10;
  const blockedGates = candidate.requiresApproval.filter((gate) =>
    blockedApprovalGates.has(gate)
  );
  const missingEvidence = candidate.evidence.filter(
    (evidencePath) => !existsSync(path.join(repoRoot, evidencePath))
  );

  return {
    ...candidate,
    scores,
    impact: Math.round(impact * 10) / 10,
    cost: Math.round(cost * 10) / 10,
    balancedScore,
    blockedGates,
    missingEvidence,
    eligible: blockedGates.length === 0 && missingEvidence.length === 0
  };
}

function buildFounderReport(selected: ReturnType<typeof scoreCandidate> | null, gitStatus: string[]) {
  if (!selected) {
    return [
      "# Founder Report",
      "",
      "No safe autonomous task is currently eligible.",
      "",
      "## Why",
      "",
      "All candidates are blocked by approval gates or missing evidence.",
      "",
      "## Required Action",
      "",
      "Review blocked gates or add missing repo evidence before executor mode proceeds."
    ].join("\n");
  }

  const statusLine =
    gitStatus.length === 0
      ? "Working tree has no local status warnings."
      : `Working tree has ${gitStatus.length} local status entries; executor must avoid unrelated untracked artifacts.`;

  return [
    "# Founder Report",
    "",
    "## Selected Task",
    "",
    `- ${selected.title}`,
    `- Task id: ${selected.id}`,
    `- Balanced score: ${selected.balancedScore}`,
    "",
    "## Why It Matters",
    "",
    selected.productReason,
    "",
    "## Product Impact",
    "",
    `Improves ${selected.category} with the current balanced model.`,
    "",
    "## Technical Impact",
    "",
    `Evidence: ${selected.evidence.join(", ")}`,
    "",
    "## Verification",
    "",
    "- npm run autonomous:verify",
    "- npm run typecheck",
    "- npm test",
    "- npm run build",
    "",
    "## Risks",
    "",
    selected.blockedGates.length === 0
      ? "- No blocked irreversible/external gate on this selected task."
      : `- Blocked gates: ${selected.blockedGates.join(", ")}`,
    `- ${statusLine}`,
    "",
    "## Next Best Action",
    "",
    "Create a focused branch for the selected task and keep implementation scoped to its evidence paths."
  ].join("\n");
}

function main() {
  const shouldWrite = process.argv.includes("--write");
  const asJson = process.argv.includes("--json");
  const candidateFile = readJson<CandidateFile>(candidatesPath);
  const gitStatus = getGitStatus();
  const scored = candidateFile.candidates
    .map(scoreCandidate)
    .sort((left, right) => right.balancedScore - left.balancedScore);
  const eligible = scored.filter((candidate) => candidate.eligible);
  const selected = eligible[0] ?? null;
  const founderReport = buildFounderReport(selected, gitStatus);
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    selected,
    topCandidates: scored.slice(0, 5),
    blockedCandidates: scored.filter((candidate) => !candidate.eligible),
    gitStatus,
    founderReport
  };

  if (shouldWrite) {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      path.join(outputDir, "next-best-task-latest.json"),
      `${JSON.stringify(result, null, 2)}\n`
    );
    writeFileSync(path.join(outputDir, "founder-report-latest.md"), `${founderReport}\n`);
  }

  if (asJson || shouldWrite) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(founderReport);
  }
}

main();
