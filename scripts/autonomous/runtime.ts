import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, freemem, loadavg, totalmem, uptime } from "node:os";
import path from "node:path";
import { MODE_DEFINITIONS, type ModeId, type MultiAgentRole } from "../codex/skill-mode-registry.ts";

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

export type TaskLifecycleStatus = "ready" | "in_review" | "completed" | "paused";

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
  externalGateProjection: GateProjection;
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
  controlTowerReadiness: ControlTowerReadiness;
  externalWriteState: {
    writePerformed: false;
    reason: string;
  };
  reviewStatus: {
    localSelfReview: string;
    externalReview: string;
  };
  levelB: LevelBReadiness;
  founderReport: string;
  executionBrief: string;
};

export type GateProjectionEntry = {
  status: string;
  reasons: string[];
};

export type GateProjection = {
  sourcePath: string;
  available: boolean;
  evaluatedAt: string | null;
  projectionHash: string | null;
  synthesis: GateProjectionEntry;
  directorDryRun: GateProjectionEntry;
  directorLiveWrite: GateProjectionEntry;
  executor: GateProjectionEntry;
};

export type ControlTowerReadiness = {
  localExecutor: GateProjectionEntry;
  directorDryRun: GateProjectionEntry;
  notionWriteback: GateProjectionEntry;
  externalExecutor: GateProjectionEntry;
};

export type HealthStatus = "passed" | "degraded" | "blocked" | "unknown";
export type LevelBStatus = "passed" | "degraded" | "blocked";

export type SubsystemHealth = {
  id: "governance" | "monitoring" | "communication" | "agent-sync" | "external-gates";
  status: HealthStatus;
  summary: string;
  blockers: string[];
  metrics?: Record<string, unknown>;
};

export type AgentHealthState = {
  mode: ModeId;
  packId: string;
  agentRole: string;
  objective: string;
  skills: string[];
  owns: string[];
  heartbeatAt: string;
  syncStatus: "passed" | "blocked";
  blockers: string[];
  handoff: string[];
};

export type SelfHealingRecommendation = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  source: string;
  safeToAutoExecute: boolean;
  blockedBy: string[];
  suggestedCommand: string | null;
};

export type LevelBReadiness = {
  status: LevelBStatus;
  criteria: Record<
    | "localExecutor"
    | "multiAgentCoverage"
    | "healthSnapshot"
    | "failClosedExternalGates"
    | "correctiveTasks",
    HealthStatus
  >;
  blockers: string[];
  selfHealingRecommendations: SelfHealingRecommendation[];
  agentSync: {
    status: HealthStatus;
    totalAgents: number;
    blockedAgents: number;
    states: AgentHealthState[];
  };
};

export type SystemMetrics = {
  status: HealthStatus;
  cpu: {
    cores: number;
    loadAverage: number[];
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedRatio: number;
  };
  uptimeSeconds: number;
  network: {
    status: HealthStatus;
    listeningSockets: number | null;
    establishedConnections: number | null;
    error: string | null;
  };
};

export type GithubRunSummary = {
  status: string;
  conclusion: string | null;
  workflowName: string | null;
  headBranch: string | null;
  url: string | null;
};

export type AutonomousHealthSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  status: LevelBStatus;
  repoRoot: string;
  gitStatus: string[];
  trackedGitStatus: string[];
  system: SystemMetrics;
  notionAuth: {
    status: "authorized" | "unauthorized" | "unknown";
    source: "override" | "env" | "gate-projection";
    blocker: string | null;
  };
  githubActions: {
    status: HealthStatus;
    latestRuns: GithubRunSummary[];
    blocker: string | null;
  };
  subsystems: SubsystemHealth[];
  agentSync: LevelBReadiness["agentSync"];
  selfHealingRecommendations: SelfHealingRecommendation[];
};

export type LevelBCycleResult = {
  schemaVersion: 1;
  generatedAt: string;
  mode: "level-b-dry-run" | "level-b-write";
  status: LevelBStatus;
  health: AutonomousHealthSnapshot;
  nextTask: NextTaskResult;
  executionPacket: ExecutionPacket;
  levelB: LevelBReadiness;
  artifacts: {
    healthJson: string;
    healthReport: string;
    levelBJson: string;
    levelBReport: string;
  };
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
  health: AutonomousHealthSnapshot;
  artifacts: {
    nextTaskJson: string;
    founderReport: string;
    executorPacketJson: string;
    executorBrief: string;
    healthJson: string;
    healthReport: string;
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
const taskLifecycleStatuses = new Set<TaskLifecycleStatus>([
  "ready",
  "in_review",
  "completed",
  "paused"
]);
const usableGateProjectionStatuses = new Set(["passed", "blocked"]);

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

function unknownGateEntry(reason: string): GateProjectionEntry {
  return {
    status: "unknown",
    reasons: [reason]
  };
}

function normalizeGateProjectionEntry(value: unknown, missingReason: string): GateProjectionEntry {
  if (!isRecord(value)) return unknownGateEntry(missingReason);
  const status =
    typeof value.status === "string" && usableGateProjectionStatuses.has(value.status)
      ? value.status
      : "unknown";
  const reasons = Array.isArray(value.reasons)
    ? value.reasons.filter((reason): reason is string => typeof reason === "string" && reason.length > 0)
    : [];

  return {
    status,
    reasons: reasons.length > 0 ? reasons : status === "passed" ? [] : [missingReason]
  };
}

function unavailableGateProjection(sourcePath: string, reason: string): GateProjection {
  const entry = unknownGateEntry(reason);
  return {
    sourcePath,
    available: false,
    evaluatedAt: null,
    projectionHash: null,
    synthesis: entry,
    directorDryRun: entry,
    directorLiveWrite: entry,
    executor: entry
  };
}

export function readGateProjection(currentRepoRoot = repoRoot): GateProjection {
  const relativePath = path.join("reports", "automations", "state", "gate-eligibility-snapshot.json");
  const sourcePath = path.join(currentRepoRoot, relativePath);
  if (!existsSync(sourcePath)) {
    return unavailableGateProjection(relativePath, "gate eligibility snapshot is missing");
  }

  let raw: unknown;
  try {
    raw = readJson<unknown>(sourcePath);
  } catch {
    return unavailableGateProjection(relativePath, "gate eligibility snapshot is malformed");
  }
  if (!isRecord(raw)) {
    return unavailableGateProjection(relativePath, "gate eligibility snapshot root is malformed");
  }
  if (!isRecord(raw.eligibility)) {
    return unavailableGateProjection(relativePath, "gate eligibility snapshot eligibility is missing or malformed");
  }
  const eligibility = raw.eligibility;
  const synthesis = normalizeGateProjectionEntry(
    eligibility.synthesis,
    "synthesis gate is not available in gate snapshot"
  );
  const directorDryRun = normalizeGateProjectionEntry(
    eligibility.directorDryRun,
    "director dry-run gate is not available in gate snapshot"
  );
  const directorLiveWrite = normalizeGateProjectionEntry(
    eligibility.directorLiveWrite,
    "director live-write gate is not available in gate snapshot"
  );
  const executor = normalizeGateProjectionEntry(
    eligibility.executor,
    "external executor gate is not available in gate snapshot"
  );
  const available = [synthesis, directorDryRun, directorLiveWrite, executor].every(
    (entry) => entry.status !== "unknown"
  );

  return {
    sourcePath: relativePath,
    available,
    evaluatedAt: typeof raw.evaluatedAt === "string" ? raw.evaluatedAt : null,
    projectionHash: typeof raw.projectionHash === "string" ? raw.projectionHash : null,
    synthesis,
    directorDryRun,
    directorLiveWrite,
    executor
  };
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
  return status === "completed" || status === "in_review" || status === "paused";
}

function hasImmutableMergeEvidence(evidence: string[]): boolean {
  const hasPullRequest = evidence.some((item) =>
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(item)
  );
  const hasFullCommitSha = evidence.some((item) => /^[a-f0-9]{40}$/i.test(item));
  return hasPullRequest && hasFullCommitSha;
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
    if (entry.status === "completed" && !hasImmutableMergeEvidence(entry.evidence as string[])) {
      throw new Error(
        `Invalid task status: completed task ${id} must include merged PR URL and full commit SHA evidence.`
      );
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

function getCurrentBranchOrDefault(currentRepoRoot: string, fallback = "main"): string {
  try {
    const branch = getCurrentBranch(currentRepoRoot);
    return branch || fallback;
  } catch {
    return fallback;
  }
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
  const externalGateProjection = readGateProjection(currentRepoRoot);

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
    externalGateProjection,
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

function buildControlTowerReadiness(
  blockedReasons: string[],
  externalGateProjection: GateProjection
): ControlTowerReadiness {
  return {
    localExecutor: {
      status: blockedReasons.length === 0 ? "passed" : "blocked",
      reasons: [...blockedReasons]
    },
    directorDryRun: externalGateProjection.directorDryRun,
    notionWriteback: externalGateProjection.directorLiveWrite,
    externalExecutor: externalGateProjection.executor
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function collectGateReasons(projection: GateProjection): string[] {
  return uniqueStrings([
    ...projection.synthesis.reasons,
    ...projection.directorDryRun.reasons,
    ...projection.directorLiveWrite.reasons,
    ...projection.executor.reasons
  ]);
}

function skillExists(currentRepoRoot: string, skillName: string): boolean {
  return existsSync(path.join(currentRepoRoot, ".codex", "skills", skillName, "SKILL.md"));
}

function agentText(agent: MultiAgentRole): string {
  return `${agent.role} ${agent.objective} ${agent.skills.join(" ")}`.toLowerCase();
}

function validateModeAgentPack(mode: (typeof MODE_DEFINITIONS)[number], currentRepoRoot: string): string[] {
  const blockers: string[] = [];
  const agents = mode.multiAgentPack.agents;
  if (agents.length !== 3) {
    blockers.push(`${mode.id}: expected exactly 3 agents, got ${agents.length}`);
  }

  const hasOwner = agents.some((agent) => /owner|lead|coordinator|implementer|auditor|gatekeeper/.test(agentText(agent)));
  const hasVerifier = agents.some((agent) => /verif|qa|compat|regression|proof|gate/.test(agentText(agent)));
  const hasReviewer = agents.some((agent) => /review|release|gate|verif|qa/.test(agentText(agent)));
  if (!hasOwner) blockers.push(`${mode.id}: missing lead/owner-equivalent agent`);
  if (!hasVerifier) blockers.push(`${mode.id}: missing verifier-equivalent agent`);
  if (!hasReviewer) blockers.push(`${mode.id}: missing reviewer-equivalent agent`);

  for (const agent of agents) {
    for (const skillName of agent.skills) {
      if (!skillExists(currentRepoRoot, skillName)) {
        blockers.push(`${mode.id}:${agent.role}: missing skill ${skillName}`);
      }
    }
  }

  return blockers;
}

export function buildAgentHealthStates(options?: {
  currentRepoRoot?: string;
  generatedAt?: string;
}): AgentHealthState[] {
  const currentRepoRoot = options?.currentRepoRoot ?? repoRoot;
  const generatedAt = options?.generatedAt ?? new Date().toISOString();

  return MODE_DEFINITIONS.flatMap((mode) => {
    const modeBlockers = validateModeAgentPack(mode, currentRepoRoot);
    return mode.multiAgentPack.agents.map((agent) => {
      const skillBlockers = agent.skills
        .filter((skillName) => !skillExists(currentRepoRoot, skillName))
        .map((skillName) => `missing skill ${skillName}`);
      const blockers = uniqueStrings([...modeBlockers, ...skillBlockers]);

      return {
        mode: mode.id,
        packId: mode.multiAgentPack.id,
        agentRole: agent.role,
        objective: agent.objective,
        skills: agent.skills,
        owns: agent.owns,
        heartbeatAt: generatedAt,
        syncStatus: blockers.length === 0 ? "passed" : "blocked",
        blockers,
        handoff: mode.multiAgentPack.handoff
      };
    });
  });
}

export function buildSelfHealingRecommendations(options: {
  projection: GateProjection;
  selected: ScoredCandidate | null;
  blockedCandidates?: ScoredCandidate[];
  notionAuthStatus?: AutonomousHealthSnapshot["notionAuth"]["status"];
  githubRuns?: GithubRunSummary[];
}): SelfHealingRecommendation[] {
  const recommendations: SelfHealingRecommendation[] = [];
  const gateReasons = collectGateReasons(options.projection);
  const staleFeederIds = uniqueStrings(
    gateReasons.flatMap((reason) => {
      const match = reason.match(/blocked_by_freshness:([^;\s]+)/);
      return match?.[1]?.split(",").filter(Boolean) ?? [];
    })
  );

  if (staleFeederIds.length > 0) {
    recommendations.push({
      id: "refresh-stale-feeders",
      title: `Refresh stale feeder reports: ${staleFeederIds.join(", ")}`,
      severity: "high",
      source: "gate-eligibility",
      safeToAutoExecute: false,
      blockedBy: staleFeederIds,
      suggestedCommand: "npm run automations:check:all"
    });
  }

  if (gateReasons.some((reason) => reason.includes("blocked_by_no_ready_packet"))) {
    recommendations.push({
      id: "prepare-ready-sync-packet",
      title: "Prepare a ready-for-sync packet before external executor promotion",
      severity: "medium",
      source: "gate-eligibility",
      safeToAutoExecute: false,
      blockedBy: ["blocked_by_no_ready_packet"],
      suggestedCommand: "npm run autonomous:cycle -- --skip-verify --json"
    });
  }

  if (gateReasons.some((reason) => reason.includes("blocked_by_writeback_promotion"))) {
    recommendations.push({
      id: "promote-notion-writeback-gates",
      title: "Keep Notion writeback blocked until promotion state and approvals are explicit",
      severity: "high",
      source: "gate-eligibility",
      safeToAutoExecute: false,
      blockedBy: ["blocked_by_writeback_promotion"],
      suggestedCommand: null
    });
  }

  if (options.notionAuthStatus === "unauthorized") {
    recommendations.push({
      id: "restore-notion-auth",
      title: "Restore Notion connector authorization before live writeback checks",
      severity: "high",
      source: "notion-auth",
      safeToAutoExecute: false,
      blockedBy: ["notion_unauthorized"],
      suggestedCommand: null
    });
  }

  if (options.githubRuns?.some((run) => run.conclusion === "startup_failure")) {
    recommendations.push({
      id: "repair-github-actions-startup",
      title: "Repair GitHub Actions startup failure before treating remote CI as healthy",
      severity: "high",
      source: "github-actions",
      safeToAutoExecute: false,
      blockedBy: ["github_startup_failure"],
      suggestedCommand: "gh run list --limit 10"
    });
  }

  if (options.selected?.id === "conversion-cta-instrumentation") {
    recommendations.push({
      id: "close-cta-instrumentation",
      title: "Close CTA instrumentation gaps before conversion optimization",
      severity: "medium",
      source: "next-task",
      safeToAutoExecute: true,
      blockedBy: [],
      suggestedCommand: "npm run autonomous:execute -- --json"
    });
  }

  if (
    options.blockedCandidates?.some((candidate) =>
      candidate.blockedGates.includes("ui_design_approval")
    )
  ) {
    recommendations.push({
      id: "prepare-ui-png-approval",
      title: "Prepare PNG approval evidence before any UI executor task",
      severity: "medium",
      source: "approval-gates",
      safeToAutoExecute: false,
      blockedBy: ["ui_design_approval"],
      suggestedCommand: null
    });
  }

  const byId = new Map(recommendations.map((recommendation) => [recommendation.id, recommendation]));
  return [...byId.values()];
}

export function computeLevelBReadiness(options: {
  packet: Pick<ExecutionPacket, "controlTowerReadiness" | "externalWriteState" | "selected" | "blockedReasons">;
  currentRepoRoot?: string;
  generatedAt?: string;
  healthStatus?: LevelBStatus;
  agentStates?: AgentHealthState[];
  selfHealingRecommendations?: SelfHealingRecommendation[];
}): LevelBReadiness {
  const currentRepoRoot = options.currentRepoRoot ?? repoRoot;
  const agentStates =
    options.agentStates ?? buildAgentHealthStates({ currentRepoRoot, generatedAt: options.generatedAt });
  const blockedAgents = agentStates.filter((agent) => agent.syncStatus === "blocked");
  const agentSyncStatus: HealthStatus = blockedAgents.length === 0 ? "passed" : "blocked";
  const localExecutorStatus: HealthStatus =
    options.packet.controlTowerReadiness.localExecutor.status === "passed" ? "passed" : "blocked";
  const failClosedExternalGates: HealthStatus =
    options.packet.externalWriteState.writePerformed === false ? "passed" : "blocked";
  const healthSnapshotStatus: HealthStatus = options.healthStatus ?? "unknown";
  const selfHealingRecommendations = options.selfHealingRecommendations ?? [];
  const correctiveTasks: HealthStatus =
    selfHealingRecommendations.length > 0 || healthSnapshotStatus === "passed" ? "passed" : "degraded";
  const blockers = uniqueStrings([
    ...options.packet.blockedReasons,
    ...blockedAgents.flatMap((agent) => agent.blockers),
    ...(failClosedExternalGates === "blocked" ? ["external write was performed"] : [])
  ]);

  const criteria = {
    localExecutor: localExecutorStatus,
    multiAgentCoverage: agentSyncStatus,
    healthSnapshot: healthSnapshotStatus,
    failClosedExternalGates,
    correctiveTasks
  } satisfies LevelBReadiness["criteria"];
  const status: LevelBStatus =
    localExecutorStatus === "blocked" ||
    agentSyncStatus === "blocked" ||
    failClosedExternalGates === "blocked"
      ? "blocked"
      : Object.values(criteria).some((entry) => entry === "degraded" || entry === "unknown")
        ? "degraded"
        : "passed";

  return {
    status,
    criteria,
    blockers,
    selfHealingRecommendations,
    agentSync: {
      status: agentSyncStatus,
      totalAgents: agentStates.length,
      blockedAgents: blockedAgents.length,
      states: agentStates
    }
  };
}

export function refreshExecutionPacketReadiness(packet: ExecutionPacket): void {
  packet.blocked = packet.blockedReasons.length > 0;
  packet.controlTowerReadiness.localExecutor = {
    status: packet.blocked ? "blocked" : "passed",
    reasons: [...packet.blockedReasons]
  };
  const previousHealthStatus = packet.levelB.criteria.healthSnapshot;
  packet.levelB = computeLevelBReadiness({
    packet,
    selfHealingRecommendations: packet.levelB.selfHealingRecommendations,
    agentStates: packet.levelB.agentSync.states,
    healthStatus: previousHealthStatus === "unknown" ? undefined : previousHealthStatus
  });
}

export function addExecutionBlocker(packet: ExecutionPacket, reason: string): void {
  packet.blockedReasons.push(reason);
  refreshExecutionPacketReadiness(packet);
}

function formatGateEntry(entry: GateProjectionEntry): string {
  return entry.reasons.length === 0
    ? entry.status
    : `${entry.status} (${entry.reasons.join("; ")})`;
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
    "## Control Tower Readiness",
    "",
    `- Local executor: ${formatGateEntry(packet.controlTowerReadiness.localExecutor)}`,
    `- Director dry-run: ${formatGateEntry(packet.controlTowerReadiness.directorDryRun)}`,
    `- Notion writeback: ${formatGateEntry(packet.controlTowerReadiness.notionWriteback)}`,
    `- External executor: ${formatGateEntry(packet.controlTowerReadiness.externalExecutor)}`,
    "",
    "## Level B Readiness",
    "",
    `- Status: ${packet.levelB.status}`,
    `- Local executor: ${packet.levelB.criteria.localExecutor}`,
    `- Multi-agent coverage: ${packet.levelB.criteria.multiAgentCoverage}`,
    `- Health snapshot: ${packet.levelB.criteria.healthSnapshot}`,
    `- Fail-closed external gates: ${packet.levelB.criteria.failClosedExternalGates}`,
    `- Corrective tasks: ${packet.levelB.criteria.correctiveTasks}`,
    `- Agent sync: ${packet.levelB.agentSync.blockedAgents}/${packet.levelB.agentSync.totalAgents} blocked`,
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
  const controlTowerReadiness = buildControlTowerReadiness(
    blockedReasons,
    selection.externalGateProjection
  );
  const selfHealingRecommendations = buildSelfHealingRecommendations({
    projection: selection.externalGateProjection,
    selected,
    blockedCandidates: selection.blockedCandidates
  });

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
    controlTowerReadiness,
    externalWriteState: {
      writePerformed: false,
      reason: "Live external writes stay fail-closed in Stage A."
    },
    reviewStatus: {
      localSelfReview: "required after implementation diff exists",
      externalReview: "CodeRabbit optional; record exact blocker if unavailable"
    },
    levelB: computeLevelBReadiness({
      packet: {
        controlTowerReadiness,
        externalWriteState: {
          writePerformed: false,
          reason: "Live external writes stay fail-closed in Stage A."
        },
        selected,
        blockedReasons
      },
      currentRepoRoot,
      selfHealingRecommendations
    }),
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

function parseNetworkMetrics(output: string): SystemMetrics["network"] {
  const establishedConnections = (output.match(/\bESTABLISHED\b/g) ?? []).length;
  const listeningSockets = (output.match(/\bLISTEN\b/g) ?? []).length;
  return {
    status: "passed",
    listeningSockets,
    establishedConnections,
    error: null
  };
}

export function collectSystemMetrics(options?: {
  networkCommand?: string;
}): SystemMetrics {
  const totalBytes = totalmem();
  const freeBytes = freemem();
  let network: SystemMetrics["network"];
  try {
    const output = execFileSync(options?.networkCommand ?? "netstat", ["-an"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    network = parseNetworkMetrics(output);
  } catch (error) {
    network = {
      status: "unknown",
      listeningSockets: null,
      establishedConnections: null,
      error: error instanceof Error ? error.message : "network metrics unavailable"
    };
  }

  return {
    status: network.status === "unknown" ? "degraded" : "passed",
    cpu: {
      cores: cpus().length,
      loadAverage: loadavg()
    },
    memory: {
      totalBytes,
      freeBytes,
      usedRatio: totalBytes === 0 ? 0 : Math.round(((totalBytes - freeBytes) / totalBytes) * 1000) / 1000
    },
    uptimeSeconds: Math.round(uptime()),
    network
  };
}

export function collectGithubRuns(currentRepoRoot = repoRoot): GithubRunSummary[] {
  try {
    const output = execFileSync(
      "gh",
      [
        "run",
        "list",
        "--limit",
        "5",
        "--json",
        "status,conclusion,workflowName,headBranch,url"
      ],
      {
        cwd: currentRepoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }
    );
    const parsed = JSON.parse(output) as GithubRunSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resolveNotionAuthStatus(
  projection: GateProjection,
  override?: AutonomousHealthSnapshot["notionAuth"]["status"]
): AutonomousHealthSnapshot["notionAuth"] {
  if (override) {
    return {
      status: override,
      source: "override",
      blocker: override === "authorized" ? null : "notion connector is not authorized"
    };
  }
  if (process.env.NOTION_API_KEY && process.env.NOTION_API_KEY.trim().length > 0) {
    return {
      status: "authorized",
      source: "env",
      blocker: null
    };
  }
  const reasons = collectGateReasons(projection);
  return {
    status: "unknown",
    source: "gate-projection",
    blocker: reasons.some((reason) => reason.includes("writeback"))
      ? "Notion live writeback is blocked by promotion gates"
      : "Notion auth was not checked by this local process"
  };
}

function resolveGithubActionsHealth(runs: GithubRunSummary[]): AutonomousHealthSnapshot["githubActions"] {
  const startupFailure = runs.find((run) => run.conclusion === "startup_failure");
  if (startupFailure) {
    return {
      status: "degraded",
      latestRuns: runs,
      blocker: `startup_failure on ${startupFailure.headBranch ?? "unknown branch"}`
    };
  }
  if (runs.length === 0) {
    return {
      status: "unknown",
      latestRuns: [],
      blocker: "GitHub Actions state unavailable from gh CLI"
    };
  }
  const failedRun = runs.find((run) => run.status === "completed" && run.conclusion !== "success");
  return {
    status: failedRun ? "degraded" : "passed",
    latestRuns: runs,
    blocker: failedRun ? `latest non-success conclusion: ${failedRun.conclusion}` : null
  };
}

function buildSubsystems(options: {
  packet: ExecutionPacket;
  system: SystemMetrics;
  notionAuth: AutonomousHealthSnapshot["notionAuth"];
  githubActions: AutonomousHealthSnapshot["githubActions"];
  agentSync: LevelBReadiness["agentSync"];
}): SubsystemHealth[] {
  const externalReasons = uniqueStrings([
    ...options.packet.controlTowerReadiness.directorDryRun.reasons,
    ...options.packet.controlTowerReadiness.notionWriteback.reasons,
    ...options.packet.controlTowerReadiness.externalExecutor.reasons
  ]);

  return [
    {
      id: "governance",
      status: options.packet.controlTowerReadiness.localExecutor.status === "passed" ? "passed" : "blocked",
      summary: "Local executor readiness and fail-closed tracked tree policy.",
      blockers: options.packet.controlTowerReadiness.localExecutor.reasons
    },
    {
      id: "monitoring",
      status: options.system.status,
      summary: "CPU, memory, uptime, and network metrics are captured without repo mutation.",
      blockers: options.system.network.error ? [options.system.network.error] : [],
      metrics: options.system
    },
    {
      id: "communication",
      status:
        options.notionAuth.status === "authorized" && options.githubActions.status === "passed"
          ? "passed"
          : "degraded",
      summary: "External communication remains report-only unless Notion and GitHub are healthy.",
      blockers: [
        ...(options.notionAuth.blocker ? [options.notionAuth.blocker] : []),
        ...(options.githubActions.blocker ? [options.githubActions.blocker] : [])
      ]
    },
    {
      id: "agent-sync",
      status: options.agentSync.status,
      summary: "Every mode must expose a valid three-agent ownership pack.",
      blockers: options.agentSync.states.flatMap((agent) => agent.blockers)
    },
    {
      id: "external-gates",
      status: externalReasons.length === 0 ? "passed" : "degraded",
      summary: "External gates are visible and fail-closed for repo-local Level B.",
      blockers: externalReasons
    }
  ];
}

function resolveHealthStatus(subsystems: SubsystemHealth[]): LevelBStatus {
  if (subsystems.some((subsystem) => subsystem.status === "blocked")) return "blocked";
  if (subsystems.some((subsystem) => subsystem.status === "degraded" || subsystem.status === "unknown")) {
    return "degraded";
  }
  return "passed";
}

export function buildAutonomousHealthSnapshot(options?: {
  currentRepoRoot?: string;
  generatedAt?: string;
  packet?: ExecutionPacket;
  allowDirtyTracked?: boolean;
  allowNonBaseBranch?: boolean;
  notionAuthStatus?: AutonomousHealthSnapshot["notionAuth"]["status"];
  githubRuns?: GithubRunSummary[];
  systemMetrics?: SystemMetrics;
  gitStatus?: string[];
  trackedGitStatus?: string[];
}): AutonomousHealthSnapshot {
  const currentRepoRoot = options?.currentRepoRoot ?? repoRoot;
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const gitStatus = options?.gitStatus ?? getGitStatus({ repoRoot: currentRepoRoot });
  const trackedGitStatus =
    options?.trackedGitStatus ?? getGitStatus({ repoRoot: currentRepoRoot, trackedOnly: true });
  const packet =
    options?.packet ??
    prepareExecutionPacket({
      currentRepoRoot,
      gitStatus,
      trackedGitStatus,
      currentBranch: getCurrentBranchOrDefault(currentRepoRoot),
      allowDirtyTracked: options?.allowDirtyTracked,
      allowNonBaseBranch: options?.allowNonBaseBranch
    });
  const system = options?.systemMetrics ?? collectSystemMetrics();
  const notionAuth = resolveNotionAuthStatus(
    readGateProjection(currentRepoRoot),
    options?.notionAuthStatus
  );
  const githubRuns = options?.githubRuns ?? collectGithubRuns(currentRepoRoot);
  const githubActions = resolveGithubActionsHealth(githubRuns);
  const selfHealingRecommendations = buildSelfHealingRecommendations({
    projection: readGateProjection(currentRepoRoot),
    selected: packet.selected,
    notionAuthStatus: notionAuth.status,
    githubRuns
  });
  const levelB = computeLevelBReadiness({
    packet,
    currentRepoRoot,
    generatedAt,
    healthStatus: "degraded",
    selfHealingRecommendations
  });
  const subsystems = buildSubsystems({
    packet,
    system,
    notionAuth,
    githubActions,
    agentSync: levelB.agentSync
  });
  const status = resolveHealthStatus(subsystems);

  return {
    schemaVersion: 1,
    generatedAt,
    status,
    repoRoot: currentRepoRoot,
    gitStatus,
    trackedGitStatus,
    system,
    notionAuth,
    githubActions,
    subsystems,
    agentSync: levelB.agentSync,
    selfHealingRecommendations
  };
}

function buildHealthReport(snapshot: AutonomousHealthSnapshot): string {
  return [
    "# Autonomous Health Snapshot",
    "",
    `- Generated at: ${snapshot.generatedAt}`,
    `- Status: ${snapshot.status}`,
    `- Repo: ${snapshot.repoRoot}`,
    `- CPU cores: ${snapshot.system.cpu.cores}`,
    `- Memory free: ${snapshot.system.memory.freeBytes}`,
    `- Notion auth: ${snapshot.notionAuth.status}`,
    `- GitHub Actions: ${snapshot.githubActions.status}`,
    `- Agent sync: ${snapshot.agentSync.status} (${snapshot.agentSync.blockedAgents}/${snapshot.agentSync.totalAgents} blocked)`,
    "",
    "## Subsystems",
    "",
    ...snapshot.subsystems.map(
      (subsystem) =>
        `- ${subsystem.id}: ${subsystem.status}${subsystem.blockers.length > 0 ? ` (${subsystem.blockers.join("; ")})` : ""}`
    ),
    "",
    "## Self-Healing Recommendations",
    "",
    ...(snapshot.selfHealingRecommendations.length === 0
      ? ["- none"]
      : snapshot.selfHealingRecommendations.map(
          (recommendation) =>
            `- ${recommendation.id}: ${recommendation.title} [${recommendation.severity}]`
        ))
  ].join("\n");
}

export function writeHealthArtifacts(snapshot: AutonomousHealthSnapshot, currentRepoRoot = repoRoot): void {
  const currentOutputDir = path.join(currentRepoRoot, "reports", "autonomous");
  mkdirSync(currentOutputDir, { recursive: true });
  writeFileSync(
    path.join(currentOutputDir, "health-latest.json"),
    `${JSON.stringify(snapshot, null, 2)}\n`
  );
  writeFileSync(path.join(currentOutputDir, "health-latest.md"), `${buildHealthReport(snapshot)}\n`);
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
    `- Gate snapshot: ${result.nextTask.externalGateProjection.available ? "available" : "missing"} (${result.nextTask.externalGateProjection.sourcePath})`,
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
    "## Control Tower Readiness",
    "",
    `- Local executor: ${formatGateEntry(result.executionPacket.controlTowerReadiness.localExecutor)}`,
    `- Director dry-run: ${formatGateEntry(result.executionPacket.controlTowerReadiness.directorDryRun)}`,
    `- Notion writeback: ${formatGateEntry(result.executionPacket.controlTowerReadiness.notionWriteback)}`,
    `- External executor: ${formatGateEntry(result.executionPacket.controlTowerReadiness.externalExecutor)}`,
    "",
    "## Level B",
    "",
    `- Status: ${result.executionPacket.levelB.status}`,
    `- Agent sync: ${result.executionPacket.levelB.agentSync.status}`,
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
  const health = buildAutonomousHealthSnapshot({
    currentRepoRoot,
    generatedAt,
    packet: executionPacket,
    gitStatus: options?.gitStatus,
    trackedGitStatus: options?.trackedGitStatus
  });
  executionPacket.levelB = computeLevelBReadiness({
    packet: executionPacket,
    currentRepoRoot,
    generatedAt,
    healthStatus: health.status,
    agentStates: health.agentSync.states,
    selfHealingRecommendations: health.selfHealingRecommendations
  });
  executionPacket.executionBrief = buildExecutionBrief(executionPacket);
  if (options?.verify !== false) {
    executionPacket.verificationResults = runVerificationStack(
      executionPacket.verificationCommands,
      currentRepoRoot
    );
    const failedChecks = executionPacket.verificationResults.filter((result) => !result.ok);
    if (failedChecks.length > 0) {
      addExecutionBlocker(
        executionPacket,
        `Verification failed: ${failedChecks.map((result) => result.command).join(", ")}`
      );
    }
    executionPacket.executionBrief = buildExecutionBrief(executionPacket);
  }

  writeExecutionArtifacts(executionPacket, currentRepoRoot);
  writeHealthArtifacts(health, currentRepoRoot);

  const result: AutonomousCycleResult = {
    schemaVersion: 1,
    generatedAt,
    mode: "dry-run-cycle",
    selectedTaskId: nextTask.selected?.id ?? null,
    blocked: executionPacket.blocked,
    blockedReasons: executionPacket.blockedReasons,
    nextTask,
    executionPacket,
    health,
    artifacts: {
      nextTaskJson: "reports/autonomous/next-best-task-latest.json",
      founderReport: "reports/autonomous/founder-report-latest.md",
      executorPacketJson: "reports/autonomous/executor-packet-latest.json",
      executorBrief: "reports/autonomous/executor-brief-latest.md",
      healthJson: "reports/autonomous/health-latest.json",
      healthReport: "reports/autonomous/health-latest.md",
      cycleJson: "reports/autonomous/cycle-latest.json",
      cycleReport: "reports/autonomous/cycle-report-latest.md"
    }
  };

  writeCycleArtifacts(result, currentRepoRoot);
  return result;
}

function buildLevelBReport(result: LevelBCycleResult): string {
  return [
    "# Autonomous Level B Report",
    "",
    `- Generated at: ${result.generatedAt}`,
    `- Mode: ${result.mode}`,
    `- Status: ${result.status}`,
    `- Selected task: ${result.nextTask.selected?.id ?? "none"}`,
    `- Local executor: ${result.levelB.criteria.localExecutor}`,
    `- Multi-agent coverage: ${result.levelB.criteria.multiAgentCoverage}`,
    `- Health snapshot: ${result.levelB.criteria.healthSnapshot}`,
    `- Fail-closed external gates: ${result.levelB.criteria.failClosedExternalGates}`,
    "",
    "## Blockers",
    "",
    ...(result.levelB.blockers.length === 0 ? ["- none"] : result.levelB.blockers.map((blocker) => `- ${blocker}`)),
    "",
    "## Self-Healing",
    "",
    ...(result.levelB.selfHealingRecommendations.length === 0
      ? ["- none"]
      : result.levelB.selfHealingRecommendations.map(
          (recommendation) => `- ${recommendation.id}: ${recommendation.title}`
        ))
  ].join("\n");
}

function writeLevelBArtifacts(result: LevelBCycleResult, currentRepoRoot = repoRoot): void {
  const currentOutputDir = path.join(currentRepoRoot, "reports", "autonomous");
  mkdirSync(currentOutputDir, { recursive: true });
  writeFileSync(
    path.join(currentOutputDir, "level-b-latest.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  writeFileSync(path.join(currentOutputDir, "level-b-latest.md"), `${buildLevelBReport(result)}\n`);
}

export function runLevelBCycle(options?: {
  currentRepoRoot?: string;
  write?: boolean;
  allowDirtyTracked?: boolean;
  allowNonBaseBranch?: boolean;
  generatedAt?: string;
  notionAuthStatus?: AutonomousHealthSnapshot["notionAuth"]["status"];
  githubRuns?: GithubRunSummary[];
  systemMetrics?: SystemMetrics;
}): LevelBCycleResult {
  const currentRepoRoot = options?.currentRepoRoot ?? repoRoot;
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const gitStatus = getGitStatus({ repoRoot: currentRepoRoot });
  const trackedGitStatus = getGitStatus({ repoRoot: currentRepoRoot, trackedOnly: true });
  const nextTask = selectNextTask({
    currentRepoRoot,
    mode: "executor",
    gitStatus,
    trackedGitStatus
  });
  const executionPacket = prepareExecutionPacket({
    currentRepoRoot,
    currentBranch: getCurrentBranchOrDefault(currentRepoRoot),
    gitStatus,
    trackedGitStatus,
    allowDirtyTracked: options?.allowDirtyTracked,
    allowNonBaseBranch: options?.allowNonBaseBranch
  });
  const health = buildAutonomousHealthSnapshot({
    currentRepoRoot,
    generatedAt,
    packet: executionPacket,
    notionAuthStatus: options?.notionAuthStatus,
    githubRuns: options?.githubRuns,
    systemMetrics: options?.systemMetrics,
    gitStatus,
    trackedGitStatus,
    allowDirtyTracked: options?.allowDirtyTracked,
    allowNonBaseBranch: options?.allowNonBaseBranch
  });
  const levelB = computeLevelBReadiness({
    packet: executionPacket,
    currentRepoRoot,
    generatedAt,
    healthStatus: health.status,
    agentStates: health.agentSync.states,
    selfHealingRecommendations: health.selfHealingRecommendations
  });
  executionPacket.levelB = levelB;
  executionPacket.executionBrief = buildExecutionBrief(executionPacket);
  const status = levelB.status;

  const result: LevelBCycleResult = {
    schemaVersion: 1,
    generatedAt,
    mode: options?.write ? "level-b-write" : "level-b-dry-run",
    status,
    health,
    nextTask,
    executionPacket,
    levelB,
    artifacts: {
      healthJson: "reports/autonomous/health-latest.json",
      healthReport: "reports/autonomous/health-latest.md",
      levelBJson: "reports/autonomous/level-b-latest.json",
      levelBReport: "reports/autonomous/level-b-latest.md"
    }
  };

  if (options?.write) {
    writeHealthArtifacts(health, currentRepoRoot);
    writeExecutionArtifacts(executionPacket, currentRepoRoot);
    writeNextTaskArtifacts(nextTask, currentRepoRoot);
    writeLevelBArtifacts(result, currentRepoRoot);
  }

  return result;
}
