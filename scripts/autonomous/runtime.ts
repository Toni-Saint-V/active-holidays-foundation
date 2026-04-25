import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type ApprovalGate =
  | "merge_main"
  | "production_deploy"
  | "live_notion_strategic_writeback"
  | "paid_api_action"
  | "legal_commercial_claim"
  | "secrets_billing_credentials"
  | "destructive_database_or_production_action"
  | "ui_design_approval";

export const approvalGates = [
  "merge_main",
  "production_deploy",
  "live_notion_strategic_writeback",
  "paid_api_action",
  "legal_commercial_claim",
  "secrets_billing_credentials",
  "destructive_database_or_production_action",
  "ui_design_approval"
] as const satisfies readonly ApprovalGate[];

export type Scores = {
  trust: number;
  conversion: number;
  polish: number;
  engineeringHealth: number;
  strategicFit: number;
  risk: number;
  effort: number;
};

export type ImpactScoreKey =
  | "trust"
  | "conversion"
  | "polish"
  | "engineeringHealth"
  | "strategicFit";
export type CostScoreKey = "risk" | "effort";
export type TieBreakerField =
  | "balancedScore"
  | "impact"
  | "cost"
  | "scores.strategicFit"
  | "scores.engineeringHealth"
  | "id";
export type TieBreakerDirection = "asc" | "desc";

export type ScoringModel = {
  schemaVersion: 1;
  impactWeights: Record<ImpactScoreKey, number>;
  costWeights: Record<CostScoreKey, number>;
  tieBreakers: Array<{
    field: TieBreakerField;
    direction: TieBreakerDirection;
  }>;
};

export type ScoringModelSummary = {
  schemaVersion: 1;
  tieBreakers: string[];
};

export type Candidate = {
  id: string;
  title: string;
  productReason: string;
  evidence: string[];
  category: string;
  scores: Scores;
  requiresApproval: string[];
};

export type CandidateFile = {
  schemaVersion: number;
  candidates: Candidate[];
};

export type TaskLifecycleStatus = "ready" | "completed" | "paused";

export type TaskStatusRecord = {
  id: string;
  status: TaskLifecycleStatus;
  updatedAt: string;
  evidence: string[];
  note: string;
};

export type TaskStatusFile = {
  schemaVersion: 1;
  tasks: TaskStatusRecord[];
};

export type NextTaskMode = "planning" | "executor";

export type ScoredCandidate = Candidate & {
  impact: number;
  cost: number;
  balancedScore: number;
  blockedGates: string[];
  unknownApprovalGates: string[];
  missingEvidence: string[];
  taskStatus: TaskLifecycleStatus;
  blockedLifecycleStatus: TaskLifecycleStatus | null;
  eligible: boolean;
};

export type NextTaskResult = {
  schemaVersion: 1;
  generatedAt: string;
  mode: NextTaskMode;
  selected: ScoredCandidate | null;
  eligibleCandidates: ScoredCandidate[];
  topCandidates: ScoredCandidate[];
  blockedCandidates: ScoredCandidate[];
  gitStatus: string[];
  trackedGitStatus: string[];
  scoringModel: ScoringModelSummary;
  founderReport: string;
};

export type VerificationCommandResult = {
  command: string;
  ok: boolean;
  exitCode: number;
  stdoutTail: string;
  stderrTail: string;
};

export type ExecutionPacket = {
  schemaVersion: 1;
  generatedAt: string;
  mode: "dry-run" | "write";
  baseBranch: string;
  currentBranch: string;
  branchName: string | null;
  blocked: boolean;
  blockedReasons: string[];
  selected: ScoredCandidate | null;
  gitStatus: string[];
  trackedGitStatus: string[];
  verificationCommands: string[];
  verificationResults: VerificationCommandResult[];
  externalWriteState: {
    writePerformed: false;
    reason: string;
  };
  reviewStatus: {
    localSelfReview: string;
    externalReview: string;
  };
  founderReport: string;
  executionBrief: string;
};

export type AutonomousCycleResult = {
  schemaVersion: 1;
  generatedAt: string;
  mode: "dry-run-cycle";
  selectedTaskId: string | null;
  blocked: boolean;
  blockedReasons: string[];
  nextTask: NextTaskResult;
  executionPacket: ExecutionPacket;
  artifacts: {
    nextTaskJson: string;
    founderReport: string;
    executorPacketJson: string;
    executorBrief: string;
    cycleJson: string;
    cycleReport: string;
  };
};

export const repoRoot = process.cwd();
export const candidatesPath = path.join(repoRoot, ".autonomous", "task-candidates.json");
export const scoringModelPath = path.join(repoRoot, ".autonomous", "scoring-model.json");
export const taskStatusPath = path.join(repoRoot, ".autonomous", "task-status.json");
export const outputDir = path.join(repoRoot, "reports", "autonomous");

const planningBlockedApprovalGates = new Set<ApprovalGate>([
  "merge_main",
  "production_deploy",
  "live_notion_strategic_writeback",
  "paid_api_action",
  "legal_commercial_claim",
  "secrets_billing_credentials",
  "destructive_database_or_production_action"
]);

const executorBlockedApprovalGates = new Set<ApprovalGate>([
  ...planningBlockedApprovalGates,
  "ui_design_approval"
]);
const knownApprovalGates = new Set<string>(approvalGates);

export const defaultVerificationCommands = [
  "npm run autonomous:verify",
  "npm run typecheck",
  "npm run test",
  "npm run build",
  "npm run automations:check:all",
  "npm run skills:verify",
  "npm run yepcode:orchestrator:test",
  "npm run yepcode:orchestrator:dry-run"
] as const;

export const verificationCommandTimeoutMs = 120_000;
export const verificationCommandMaxBuffer = 1024 * 1024;

function read(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(read(filePath)) as T;
}

const impactScoreKeys = [
  "trust",
  "conversion",
  "polish",
  "engineeringHealth",
  "strategicFit"
] as const satisfies readonly ImpactScoreKey[];
const costScoreKeys = ["risk", "effort"] as const satisfies readonly CostScoreKey[];
const tieBreakerFields = new Set<TieBreakerField>([
  "balancedScore",
  "impact",
  "cost",
  "scores.strategicFit",
  "scores.engineeringHealth",
  "id"
]);
const tieBreakerDirections = new Set<TieBreakerDirection>(["asc", "desc"]);
const taskLifecycleStatuses = new Set<TaskLifecycleStatus>(["ready", "completed", "paused"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertWeight(
  modelPart: Record<string, unknown>,
  weightName: ImpactScoreKey | CostScoreKey,
  groupName: "impactWeights" | "costWeights"
): number {
  const value = modelPart[weightName];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid scoring model: ${groupName}.${weightName} must be a finite non-negative number.`);
  }
  return value;
}

export function readScoringModel(currentRepoRoot = repoRoot): ScoringModel {
  const raw = readJson<unknown>(path.join(currentRepoRoot, ".autonomous", "scoring-model.json"));
  if (!isRecord(raw)) {
    throw new Error("Invalid scoring model: root must be an object.");
  }
  if (raw.schemaVersion !== 1) {
    throw new Error("Invalid scoring model: schemaVersion must be 1.");
  }
  if (!isRecord(raw.impactWeights)) {
    throw new Error("Invalid scoring model: impactWeights must be an object.");
  }
  if (!isRecord(raw.costWeights)) {
    throw new Error("Invalid scoring model: costWeights must be an object.");
  }
  const impactWeights = Object.fromEntries(
    impactScoreKeys.map((key) => [
      key,
      assertWeight(raw.impactWeights as Record<string, unknown>, key, "impactWeights")
    ])
  ) as Record<ImpactScoreKey, number>;
  const costWeights = Object.fromEntries(
    costScoreKeys.map((key) => [
      key,
      assertWeight(raw.costWeights as Record<string, unknown>, key, "costWeights")
    ])
  ) as Record<CostScoreKey, number>;

  if (!Array.isArray(raw.tieBreakers) || raw.tieBreakers.length === 0) {
    throw new Error("Invalid scoring model: tieBreakers must be a non-empty array.");
  }
  const tieBreakers = raw.tieBreakers.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error("Invalid scoring model: each tieBreaker must be an object.");
    }
    if (!tieBreakerFields.has(entry.field as TieBreakerField)) {
      throw new Error("Invalid scoring model: tieBreaker field is not supported.");
    }
    if (!tieBreakerDirections.has(entry.direction as TieBreakerDirection)) {
      throw new Error("Invalid scoring model: tieBreaker direction must be asc or desc.");
    }
    return {
      field: entry.field as TieBreakerField,
      direction: entry.direction as TieBreakerDirection
    };
  });

  return {
    schemaVersion: 1,
    impactWeights,
    costWeights,
    tieBreakers
  };
}

function summarizeScoringModel(model: ScoringModel): ScoringModelSummary {
  return {
    schemaVersion: model.schemaVersion,
    tieBreakers: model.tieBreakers.map((tieBreaker) => `${tieBreaker.field}:${tieBreaker.direction}`)
  };
}

function isBlockingTaskStatus(status: TaskLifecycleStatus): boolean {
  return status === "completed" || status === "paused";
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid task status: ${fieldName} must be a non-empty string.`);
  }
  return value;
}

export function readTaskStatusRecords(
  currentRepoRoot = repoRoot,
  candidateIds?: Set<string>
): TaskStatusRecord[] {
  const filePath = path.join(currentRepoRoot, ".autonomous", "task-status.json");
  if (!existsSync(filePath)) return [];

  const raw = readJson<unknown>(filePath);
  if (!isRecord(raw)) {
    throw new Error("Invalid task status: root must be an object.");
  }
  if (raw.schemaVersion !== 1) {
    throw new Error("Invalid task status: schemaVersion must be 1.");
  }
  if (!Array.isArray(raw.tasks)) {
    throw new Error("Invalid task status: tasks must be an array.");
  }

  const seen = new Set<string>();
  return raw.tasks.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error("Invalid task status: each task must be an object.");
    }
    const id = assertString(entry.id, "id");
    if (seen.has(id)) {
      throw new Error(`Invalid task status: duplicate task id ${id}.`);
    }
    seen.add(id);
    if (candidateIds && !candidateIds.has(id)) {
      throw new Error(`Invalid task status: unknown candidate id ${id}.`);
    }
    if (!taskLifecycleStatuses.has(entry.status as TaskLifecycleStatus)) {
      throw new Error(`Invalid task status: unsupported status for ${id}.`);
    }
    const updatedAt = assertString(entry.updatedAt, "updatedAt");
    if (Number.isNaN(Date.parse(updatedAt))) {
      throw new Error(`Invalid task status: updatedAt for ${id} must be ISO-like date.`);
    }
    if (
      !Array.isArray(entry.evidence) ||
      entry.evidence.length === 0 ||
      entry.evidence.some((item) => typeof item !== "string" || item.length === 0)
    ) {
      throw new Error(`Invalid task status: evidence for ${id} must be a non-empty string array.`);
    }
    const note = assertString(entry.note, "note");

    return {
      id,
      status: entry.status as TaskLifecycleStatus,
      updatedAt,
      evidence: entry.evidence as string[],
      note
    };
  });
}

function readTaskStatusMap(currentRepoRoot: string, candidateIds: Set<string>): Map<string, TaskStatusRecord> {
  const records = readTaskStatusRecords(currentRepoRoot, candidateIds);
  return new Map(records.map((record) => [record.id, record]));
}

export function getGitStatus(options?: { repoRoot?: string; trackedOnly?: boolean }): string[] {
  try {
    return execFileSync(
      "git",
      ["status", "--short", ...(options?.trackedOnly ? ["--untracked-files=no"] : [])],
      {
        cwd: options?.repoRoot ?? repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }
    )
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function getCurrentBranch(currentRepoRoot = repoRoot): string {
  return execFileSync("git", ["branch", "--show-current"], {
    cwd: currentRepoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

export function branchExists(branchName: string, currentRepoRoot = repoRoot): boolean {
  try {
    const output = execFileSync("git", ["branch", "--list", branchName], {
      cwd: currentRepoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, value));
}

function getBlockedApprovalGates(mode: NextTaskMode): Set<ApprovalGate> {
  return mode === "executor" ? executorBlockedApprovalGates : planningBlockedApprovalGates;
}

export function scoreCandidate(
  candidate: Candidate,
  options?: {
    currentRepoRoot?: string;
    mode?: NextTaskMode;
    scoringModel?: ScoringModel;
    taskStatus?: TaskLifecycleStatus;
  }
): ScoredCandidate {
  const currentRepoRoot = options?.currentRepoRoot ?? repoRoot;
  const mode = options?.mode ?? "planning";
  const scoringModel = options?.scoringModel ?? readScoringModel(currentRepoRoot);
  const taskStatus = options?.taskStatus ?? "ready";
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
    scores.trust * scoringModel.impactWeights.trust +
    scores.conversion * scoringModel.impactWeights.conversion +
    scores.polish * scoringModel.impactWeights.polish +
    scores.engineeringHealth * scoringModel.impactWeights.engineeringHealth +
    scores.strategicFit * scoringModel.impactWeights.strategicFit;
  const cost =
    scores.risk * scoringModel.costWeights.risk + scores.effort * scoringModel.costWeights.effort;
  const balancedScore = Math.round((impact - cost) * 10) / 10;
  const unknownApprovalGates = candidate.requiresApproval.filter(
    (gate) => !knownApprovalGates.has(gate)
  );
  const blockedGates = candidate.requiresApproval.filter(
    (gate) => unknownApprovalGates.includes(gate) || getBlockedApprovalGates(mode).has(gate as ApprovalGate)
  );
  const missingEvidence = candidate.evidence.filter(
    (evidencePath) => !existsSync(path.join(currentRepoRoot, evidencePath))
  );
  const blockedLifecycleStatus = isBlockingTaskStatus(taskStatus) ? taskStatus : null;

  return {
    ...candidate,
    scores,
    impact: Math.round(impact * 10) / 10,
    cost: Math.round(cost * 10) / 10,
    balancedScore,
    blockedGates,
    unknownApprovalGates,
    missingEvidence,
    taskStatus,
    blockedLifecycleStatus,
    eligible:
      blockedGates.length === 0 &&
      missingEvidence.length === 0 &&
      blockedLifecycleStatus === null
  };
}

function getTieBreakerValue(candidate: ScoredCandidate, field: TieBreakerField): number | string {
  switch (field) {
    case "balancedScore":
      return candidate.balancedScore;
    case "impact":
      return candidate.impact;
    case "cost":
      return candidate.cost;
    case "scores.strategicFit":
      return candidate.scores.strategicFit;
    case "scores.engineeringHealth":
      return candidate.scores.engineeringHealth;
    case "id":
      return candidate.id;
  }
}

function compareScoredCandidates(
  left: ScoredCandidate,
  right: ScoredCandidate,
  scoringModel: ScoringModel
): number {
  for (const tieBreaker of scoringModel.tieBreakers) {
    const leftValue = getTieBreakerValue(left, tieBreaker.field);
    const rightValue = getTieBreakerValue(right, tieBreaker.field);
    if (leftValue === rightValue) continue;

    const comparison =
      typeof leftValue === "string" && typeof rightValue === "string"
        ? leftValue.localeCompare(rightValue)
        : Number(leftValue) - Number(rightValue);
    return tieBreaker.direction === "asc" ? comparison : -comparison;
  }

  return 0;
}

export function buildFounderReport(
  selected: ScoredCandidate | null,
  gitStatus: string[],
  mode: NextTaskMode
): string {
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
      mode === "executor"
        ? "Review blocked gates, tracked tree cleanliness, or missing evidence before local executor mode proceeds."
        : "Review blocked gates or add missing repo evidence before executor mode proceeds."
    ].join("\n");
  }

  const statusLine =
    gitStatus.length === 0
      ? "Working tree has no local status warnings."
      : `Working tree has ${gitStatus.length} local status entries; executor must avoid unrelated untracked artifacts.`;

  const nextAction =
    mode === "executor"
      ? "Prepare a focused `codex/*` branch, run the readiness stack, and hand off the scoped execution packet."
      : "Create a focused branch for the selected task and keep implementation scoped to its evidence paths.";
  const approvalRisk =
    selected.blockedGates.length > 0
      ? `- Blocked gates: ${selected.blockedGates.join(", ")}`
      : selected.requiresApproval.length > 0
        ? `- Approval required before execution: ${selected.requiresApproval.join(", ")}`
        : "- No blocked irreversible, external, or UI gate on this selected task.";

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
    `Improves ${selected.category} with the current early-stage balanced model.`,
    "",
    "## Strategic Lens",
    "",
    "- Optimize for timely decisions now, not premature monetization machinery.",
    "- Keep brand quality, service quality, competitive edge, and future monetization in view before accepting or executing the task.",
    "- Prefer tasks that make the product more trusted, cleaner, easier to ship, and harder to copy over generic backlog movement.",
    "",
    "## Technical Impact",
    "",
    `Evidence: ${selected.evidence.join(", ")}`,
    "",
    "## Verification",
    "",
    "- npm run autonomous:verify",
    "- npm run typecheck",
    "- npm run test",
    "- npm run build",
    "- npm run automations:check:all",
    "- npm run skills:verify",
    "- npm run yepcode:orchestrator:test",
    "- npm run yepcode:orchestrator:dry-run",
    "",
    "## Risks",
    "",
    approvalRisk,
    `- ${statusLine}`,
    "",
    "## Next Best Action",
    "",
    nextAction
  ].join("\n");
}

export function selectNextTask(options?: {
  currentRepoRoot?: string;
  mode?: NextTaskMode;
  gitStatus?: string[];
  trackedGitStatus?: string[];
}): NextTaskResult {
  const currentRepoRoot = options?.currentRepoRoot ?? repoRoot;
  const mode = options?.mode ?? "planning";
  const scoringModel = readScoringModel(currentRepoRoot);
  const candidateFile = readJson<CandidateFile>(path.join(currentRepoRoot, ".autonomous", "task-candidates.json"));
  const candidateIds = new Set(candidateFile.candidates.map((candidate) => candidate.id));
  const taskStatuses = readTaskStatusMap(currentRepoRoot, candidateIds);
  const gitStatus = options?.gitStatus ?? getGitStatus({ repoRoot: currentRepoRoot });
  const trackedGitStatus =
    options?.trackedGitStatus ?? getGitStatus({ repoRoot: currentRepoRoot, trackedOnly: true });
  const scored = candidateFile.candidates
    .map((candidate) =>
      scoreCandidate(candidate, {
        currentRepoRoot,
        mode,
        scoringModel,
        taskStatus: taskStatuses.get(candidate.id)?.status
      })
    )
    .sort((left, right) => compareScoredCandidates(left, right, scoringModel));
  const eligible = scored.filter((candidate) => candidate.eligible);
  const selected = eligible[0] ?? null;
  const founderReport = buildFounderReport(selected, gitStatus, mode);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode,
    selected,
    eligibleCandidates: eligible.slice(0, 5),
    topCandidates: scored.slice(0, 5),
    blockedCandidates: scored.filter((candidate) => !candidate.eligible),
    gitStatus,
    trackedGitStatus,
    scoringModel: summarizeScoringModel(scoringModel),
    founderReport
  };
}

export function writeNextTaskArtifacts(
  result: NextTaskResult,
  currentRepoRoot = repoRoot
): void {
  const currentOutputDir = path.join(currentRepoRoot, "reports", "autonomous");
  mkdirSync(currentOutputDir, { recursive: true });
  writeFileSync(
    path.join(currentOutputDir, "next-best-task-latest.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  writeFileSync(path.join(currentOutputDir, "founder-report-latest.md"), `${result.founderReport}\n`);
}

export function buildAutonomousBranchName(candidateId: string): string {
  const normalized = candidateId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  return `codex/autonomous-${normalized}`.slice(0, 72);
}

function untrackedPathFromStatus(entry: string): string | null {
  return entry.startsWith("?? ") ? normalizeGitStatusPath(entry.slice(3).trim()) : null;
}

function normalizeGitStatusPath(entry: string): string {
  return entry.replace(/\/+$/g, "");
}

function pathsOverlap(left: string, right: string): boolean {
  const normalizedLeft = normalizeGitStatusPath(left);
  const normalizedRight = normalizeGitStatusPath(right);
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.startsWith(`${normalizedRight}/`) ||
    normalizedRight.startsWith(`${normalizedLeft}/`)
  );
}

function findUntrackedScopeCollisions(gitStatus: string[], selected: ScoredCandidate | null): string[] {
  if (!selected) return [];
  const evidencePaths = selected.evidence.filter((entry) => !entry.startsWith("http"));
  return gitStatus
    .map(untrackedPathFromStatus)
    .filter((entry): entry is string => Boolean(entry))
    .filter((entry) => evidencePaths.some((evidencePath) => pathsOverlap(entry, evidencePath)));
}

export function buildExecutionBrief(packet: ExecutionPacket): string {
  const blockedSection =
    packet.blockedReasons.length === 0
      ? "- none"
      : packet.blockedReasons.map((reason) => `- ${reason}`).join("\n");
  const verificationSection =
    packet.verificationResults.length === 0
      ? "- not run in this mode"
      : packet.verificationResults
          .map((result) => `- ${result.ok ? "OK" : "FAIL"} · ${result.command}`)
          .join("\n");

  return [
    "# Autonomous Execution Brief",
    "",
    `- Mode: ${packet.mode}`,
    `- Base branch: ${packet.baseBranch}`,
    `- Current branch: ${packet.currentBranch}`,
    `- Target branch: ${packet.branchName ?? "blocked"}`,
    `- Selected task: ${packet.selected?.id ?? "none"}`,
    "",
    "## Blockers",
    "",
    blockedSection,
    "",
    "## Verification Stack",
    "",
    ...packet.verificationCommands.map((command) => `- ${command}`),
    "",
    "## Verification Results",
    "",
    verificationSection,
    "",
    "## Review Status",
    "",
    `- Local self-review: ${packet.reviewStatus.localSelfReview}`,
    `- External review: ${packet.reviewStatus.externalReview}`,
    "",
    "## Founder Report",
    "",
    packet.founderReport
  ].join("\n");
}

export function prepareExecutionPacket(options?: {
  currentRepoRoot?: string;
  baseBranch?: string;
  write?: boolean;
  allowDirtyTracked?: boolean;
  allowNonBaseBranch?: boolean;
  currentBranch?: string;
  gitStatus?: string[];
  trackedGitStatus?: string[];
}): ExecutionPacket {
  const currentRepoRoot = options?.currentRepoRoot ?? repoRoot;
  const baseBranch = options?.baseBranch ?? "main";
  const gitStatus = options?.gitStatus ?? getGitStatus({ repoRoot: currentRepoRoot });
  const trackedGitStatus =
    options?.trackedGitStatus ?? getGitStatus({ repoRoot: currentRepoRoot, trackedOnly: true });
  const selection = selectNextTask({
    currentRepoRoot,
    mode: "executor",
    gitStatus,
    trackedGitStatus
  });
  const currentBranch = options?.currentBranch ?? getCurrentBranch(currentRepoRoot);
  const selected = selection.selected;
  const branchName = selected ? buildAutonomousBranchName(selected.id) : null;
  const blockedReasons: string[] = [];
  const blockingTrackedGitStatus = trackedGitStatus.filter(
    (entry) => !entry.startsWith("?? reports/autonomous/")
  );
  const untrackedScopeCollisions = findUntrackedScopeCollisions(gitStatus, selected);

  if (!selected) {
    blockedReasons.push("Нет executor-safe кандидата без approval gate или missing evidence.");
  }

  if (blockingTrackedGitStatus.length > 0 && !options?.allowDirtyTracked) {
    blockedReasons.push("Tracked working tree не чистый; local executor fail-closed.");
  }

  if (untrackedScopeCollisions.length > 0) {
    blockedReasons.push(
      `Untracked files collide with selected task scope: ${untrackedScopeCollisions.join(", ")}.`
    );
  }

  if (options?.write && currentBranch !== baseBranch && !options?.allowNonBaseBranch) {
    blockedReasons.push(`Local executor может стартовать только из \`${baseBranch}\`, сейчас \`${currentBranch}\`.`);
  }

  if (options?.write && branchName && branchExists(branchName, currentRepoRoot)) {
    blockedReasons.push(`Ветка \`${branchName}\` уже существует; cleanup или reuse нужно решить явно.`);
  }

  const packet: ExecutionPacket = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: options?.write ? "write" : "dry-run",
    baseBranch,
    currentBranch,
    branchName,
    blocked: blockedReasons.length > 0,
    blockedReasons,
    selected,
    gitStatus,
    trackedGitStatus,
    verificationCommands: [...defaultVerificationCommands],
    verificationResults: [],
    externalWriteState: {
      writePerformed: false,
      reason: "Live external writes stay fail-closed in Stage A."
    },
    reviewStatus: {
      localSelfReview: "required after implementation diff exists",
      externalReview: "CodeRabbit optional; record exact blocker if unavailable"
    },
    founderReport: selection.founderReport,
    executionBrief: ""
  };

  packet.executionBrief = buildExecutionBrief(packet);
  return packet;
}

export function writeExecutionArtifacts(
  packet: ExecutionPacket,
  currentRepoRoot = repoRoot
): void {
  const currentOutputDir = path.join(currentRepoRoot, "reports", "autonomous");
  mkdirSync(currentOutputDir, { recursive: true });
  writeFileSync(
    path.join(currentOutputDir, "executor-packet-latest.json"),
    `${JSON.stringify(packet, null, 2)}\n`
  );
  writeFileSync(path.join(currentOutputDir, "executor-brief-latest.md"), `${packet.executionBrief}\n`);
}

export function runVerificationStack(
  commands: readonly string[],
  currentRepoRoot = repoRoot
): VerificationCommandResult[] {
  return commands.map((command) => {
    const result = spawnSync(command, {
      cwd: currentRepoRoot,
      encoding: "utf8",
      shell: true,
      timeout: verificationCommandTimeoutMs,
      maxBuffer: verificationCommandMaxBuffer
    });
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";

    return {
      command,
      ok: result.status === 0,
      exitCode: result.status ?? 1,
      stdoutTail: stdout.trim().split("\n").slice(-12).join("\n"),
      stderrTail: stderr.trim().split("\n").slice(-12).join("\n")
    };
  });
}

function buildCycleReport(result: AutonomousCycleResult): string {
  const verificationResults = result.executionPacket.verificationResults;
  const verificationSection =
    verificationResults.length === 0
      ? "- not run"
      : verificationResults
          .map((entry) => `- ${entry.ok ? "OK" : "FAIL"} · ${entry.command}`)
          .join("\n");
  const blockerSection =
    result.blockedReasons.length === 0
      ? "- none"
      : result.blockedReasons.map((reason) => `- ${reason}`).join("\n");

  return [
    "# Autonomous Cycle Report",
    "",
    `- Generated at: ${result.generatedAt}`,
    `- Selected task: ${result.selectedTaskId ?? "none"}`,
    `- Blocked: ${result.blocked ? "yes" : "no"}`,
    "",
    "## Blockers",
    "",
    blockerSection,
    "",
    "## Verification",
    "",
    verificationSection,
    "",
    "## External Writes",
    "",
    `- Performed: ${result.executionPacket.externalWriteState.writePerformed ? "yes" : "no"}`,
    `- Reason: ${result.executionPacket.externalWriteState.reason}`,
    "",
    "## Next Best Action",
    "",
    result.nextTask.founderReport
  ].join("\n");
}

export function writeCycleArtifacts(
  result: AutonomousCycleResult,
  currentRepoRoot = repoRoot
): void {
  const currentOutputDir = path.join(currentRepoRoot, "reports", "autonomous");
  mkdirSync(currentOutputDir, { recursive: true });
  writeFileSync(
    path.join(currentOutputDir, "cycle-latest.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  writeFileSync(path.join(currentOutputDir, "cycle-report-latest.md"), `${buildCycleReport(result)}\n`);
}

export function runAutonomousCycle(options?: {
  currentRepoRoot?: string;
  verify?: boolean;
  currentBranch?: string;
  gitStatus?: string[];
  trackedGitStatus?: string[];
}): AutonomousCycleResult {
  const currentRepoRoot = options?.currentRepoRoot ?? repoRoot;
  const generatedAt = new Date().toISOString();
  const nextTask = selectNextTask({
    currentRepoRoot,
    mode: "executor",
    gitStatus: options?.gitStatus,
    trackedGitStatus: options?.trackedGitStatus
  });
  writeNextTaskArtifacts(nextTask, currentRepoRoot);

  const executionPacket = prepareExecutionPacket({
    currentRepoRoot,
    currentBranch: options?.currentBranch,
    gitStatus: options?.gitStatus,
    trackedGitStatus: options?.trackedGitStatus
  });
  if (options?.verify !== false) {
    executionPacket.verificationResults = runVerificationStack(
      executionPacket.verificationCommands,
      currentRepoRoot
    );
    const failedChecks = executionPacket.verificationResults.filter((result) => !result.ok);
    if (failedChecks.length > 0) {
      executionPacket.blocked = true;
      executionPacket.blockedReasons.push(
        `Verification failed: ${failedChecks.map((result) => result.command).join(", ")}`
      );
    }
    executionPacket.executionBrief = buildExecutionBrief(executionPacket);
  }

  writeExecutionArtifacts(executionPacket, currentRepoRoot);

  const result: AutonomousCycleResult = {
    schemaVersion: 1,
    generatedAt,
    mode: "dry-run-cycle",
    selectedTaskId: nextTask.selected?.id ?? null,
    blocked: executionPacket.blocked,
    blockedReasons: executionPacket.blockedReasons,
    nextTask,
    executionPacket,
    artifacts: {
      nextTaskJson: "reports/autonomous/next-best-task-latest.json",
      founderReport: "reports/autonomous/founder-report-latest.md",
      executorPacketJson: "reports/autonomous/executor-packet-latest.json",
      executorBrief: "reports/autonomous/executor-brief-latest.md",
      cycleJson: "reports/autonomous/cycle-latest.json",
      cycleReport: "reports/autonomous/cycle-report-latest.md"
    }
  };

  writeCycleArtifacts(result, currentRepoRoot);
  return result;
}
