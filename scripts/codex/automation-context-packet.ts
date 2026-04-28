import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  AUTOMATION_REGISTRY,
  type AutomationId,
  type AutomationRole,
  type GatingClass
} from "./automation-registry.ts";
import { compareStrings, exists, hashValue, readJsonFile } from "./automation-contract-utils.ts";
import { selectNextTask, type NextTaskResult } from "../autonomous/runtime.ts";

type GateEligibilityEntry = {
  status: string;
  reasons?: string[];
  automationIds?: string[];
};

type GateDependencyStatusEntry = {
  status: string;
  missingArtifacts?: string[];
};

export type GateEligibilitySnapshot = {
  schemaVersion: number;
  evaluatedAt?: string;
  projectionHash?: string;
  feederStatus?: Record<string, unknown>;
  dependencyStatus?: Record<string, Record<string, unknown>>;
  eligibility?: {
    synthesis?: GateEligibilityEntry;
    directorDryRun?: GateEligibilityEntry;
    directorLiveWrite?: GateEligibilityEntry;
    executor?: GateEligibilityEntry;
  };
};

type CandidateFile = {
  schemaVersion: number;
  candidates: Array<{
    id: string;
    title: string;
    category: string;
    evidence: string[];
    requiresApproval: string[];
  }>;
};

type TaskStatusFile = {
  schemaVersion: number;
  tasks: Array<{
    id: string;
    status: string;
    updatedAt: string;
  }>;
};

export type AutomationContextReportInput = {
  automationId: AutomationId;
  role: AutomationRole;
  gatingClass: GatingClass;
  latestReportPath: string;
  latestReportExists: boolean;
  datedReportExists: boolean;
  latestReportHash: string | null;
  heading: string | null;
};

export type AutomationContextStatusReason = {
  code:
    | "missing_gate_eligibility_snapshot"
    | "missing_required_reports"
    | "stale_gate_snapshot"
    | "synthesis_blocked";
  scope: "gate-snapshot" | "dependency-inventory" | "synthesis";
  automationIds: string[];
  source: "gate-eligibility-snapshot" | "filesystem-reconciliation";
};

export type AutomationContextPacket = {
  schemaVersion: 1;
  generatedAt: string;
  mode: "report-first";
  status: "ready" | "distillation_incomplete";
  statusReasons: string[];
  statusReasonDetails: AutomationContextStatusReason[];
  sources: {
    latestReportsGlob: "reports/automations/runs/*/latest.md";
    gateEligibilitySnapshot: "reports/automations/state/gate-eligibility-snapshot.json";
    taskCandidates: ".autonomous/task-candidates.json";
    taskStatus: ".autonomous/task-status.json";
    scoringModel: ".autonomous/scoring-model.json";
    gitStatus: "git status --short";
  };
  constraints: {
    externalMemoryApi: "disabled";
    context7: "docs-only";
    langGraphCheckpointMemory: "runtime-smoke-or-explicit-persistence-only";
    liveWriteback: "blocked-unless-gate-snapshot-passes";
    mutationPolicy: "report-first";
  };
  latestReports: AutomationContextReportInput[];
  missingRequiredReports: string[];
  missingRequiredReportArtifacts: Record<string, string[]>;
  staleGateSnapshotReports: string[];
  staleGateSnapshotArtifacts: Record<string, string[]>;
  gateSnapshot: {
    exists: boolean;
    evaluatedAt: string | null;
    projectionHash: string | null;
    eligibility: {
      synthesis: GateEligibilityEntry | null;
      directorDryRun: GateEligibilityEntry | null;
      directorLiveWrite: GateEligibilityEntry | null;
      executor: GateEligibilityEntry | null;
    };
  };
  autonomousTasks: {
    candidateCount: number;
    statusById: Record<string, string>;
    selectedExecutorSafeTask: {
      id: string;
      title: string;
      category: string;
      verification: string[];
    } | null;
  };
  deterministicRecommendation: {
    kind:
      | "backfill_missing_reports"
      | "refresh_gate_snapshot"
      | "repair_context_inputs"
      | "no_executor_safe_task"
      | "use_selected_executor_safe_task";
    title: string;
    blockedBy: string[];
    verify: string[];
  };
};

const SOURCE_PATHS = {
  latestReportsGlob: "reports/automations/runs/*/latest.md",
  gateEligibilitySnapshot: "reports/automations/state/gate-eligibility-snapshot.json",
  taskCandidates: ".autonomous/task-candidates.json",
  taskStatus: ".autonomous/task-status.json",
  scoringModel: ".autonomous/scoring-model.json",
  gitStatus: "git status --short"
} as const;
const DEFAULT_DEPENDENCY_CONSUMERS: AutomationId[] = ["ah-next-best-action-distiller"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asGateEntry(value: unknown): GateEligibilityEntry | null {
  if (!isRecord(value) || typeof value.status !== "string") return null;
  return {
    status: value.status,
    reasons: Array.isArray(value.reasons)
      ? value.reasons.filter((entry): entry is string => typeof entry === "string")
      : undefined,
    automationIds: Array.isArray(value.automationIds)
      ? value.automationIds.filter((entry): entry is string => typeof entry === "string")
      : undefined
  };
}

function firstMarkdownHeading(markdown: string): string | null {
  const heading = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("#"));
  return heading ?? null;
}

async function hasDatedMarkdownReport(automationRoot: string): Promise<boolean> {
  if (!(await exists(automationRoot))) return false;
  const entries = await readdir(automationRoot, { withFileTypes: true });
  return entries.some(
    (entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "latest.md"
  );
}

async function readLatestReportInput(
  repoRoot: string,
  automationId: AutomationId,
  role: AutomationRole,
  gatingClass: GatingClass
): Promise<AutomationContextReportInput> {
  const latestReportPath = path.join("reports", "automations", "runs", automationId, "latest.md");
  const automationRoot = path.join(repoRoot, "reports", "automations", "runs", automationId);
  const absolutePath = path.join(repoRoot, latestReportPath);
  const datedReportExists = await hasDatedMarkdownReport(automationRoot);
  if (!(await exists(absolutePath))) {
    return {
      automationId,
      role,
      gatingClass,
      latestReportPath,
      latestReportExists: false,
      datedReportExists,
      latestReportHash: null,
      heading: null
    };
  }

  const markdown = await readFile(absolutePath, "utf8");
  return {
    automationId,
    role,
    gatingClass,
    latestReportPath,
    latestReportExists: true,
    datedReportExists,
    latestReportHash: hashValue(markdown),
    heading: firstMarkdownHeading(markdown)
  };
}

function artifactExistsInReport(
  report: AutomationContextReportInput | undefined,
  artifact: string
): boolean {
  if (!report) return false;
  if (artifact === "latest-md") return report.latestReportExists;
  if (artifact === "dated-report-md") return report.datedReportExists;
  return false;
}

export type RequiredReportReconciliation = {
  missingRequiredReports: AutomationId[];
  missingRequiredReportArtifacts: Record<string, string[]>;
  staleGateSnapshotReports: AutomationId[];
  staleGateSnapshotArtifacts: Record<string, string[]>;
};

function dependencyConsumerContracts(consumerIds: AutomationId[] = DEFAULT_DEPENDENCY_CONSUMERS) {
  const consumerIdSet = new Set(consumerIds);
  return AUTOMATION_REGISTRY.filter((contract) => consumerIdSet.has(contract.id));
}

function asDependencyStatusEntry(value: unknown): GateDependencyStatusEntry | null {
  if (!isRecord(value) || typeof value.status !== "string") return null;
  return {
    status: value.status,
    missingArtifacts: Array.isArray(value.missingArtifacts)
      ? value.missingArtifacts.filter((entry): entry is string => typeof entry === "string")
      : undefined
  };
}

export function reconcileRequiredReportsWithInventory(
  snapshot: GateEligibilitySnapshot | null,
  latestReports: AutomationContextReportInput[],
  consumerIds: AutomationId[] = DEFAULT_DEPENDENCY_CONSUMERS
): RequiredReportReconciliation {
  const reportById = new Map(latestReports.map((report) => [report.automationId, report]));
  const missingRequiredReports: AutomationId[] = [];
  const missingRequiredReportArtifacts: Record<string, string[]> = {};
  const staleGateSnapshotReports: AutomationId[] = [];
  const staleGateSnapshotArtifacts: Record<string, string[]> = {};

  for (const consumer of dependencyConsumerContracts(consumerIds)) {
    const dependencyStatusById = snapshot?.dependencyStatus?.[consumer.id] ?? {};
    for (const upstream of consumer.requiredUpstreams) {
      const report = reportById.get(upstream.automationId);
      const dependency = asDependencyStatusEntry(dependencyStatusById[upstream.automationId]);
      const missingArtifacts =
        dependency?.missingArtifacts && dependency.missingArtifacts.length > 0
          ? dependency.missingArtifacts
          : upstream.requiredArtifacts;
      const realMissingArtifacts = missingArtifacts.filter(
        (artifact) => !artifactExistsInReport(report, artifact)
      );
      const staleSnapshotArtifacts =
        dependency?.status === "blocked_by_missing_artifacts"
          ? missingArtifacts.filter((artifact) => artifactExistsInReport(report, artifact))
          : [];

      if (realMissingArtifacts.length > 0) {
        missingRequiredReports.push(upstream.automationId);
        missingRequiredReportArtifacts[upstream.automationId] =
          realMissingArtifacts.sort(compareStrings);
      }
      if (staleSnapshotArtifacts.length > 0) {
        staleGateSnapshotReports.push(upstream.automationId);
        staleGateSnapshotArtifacts[upstream.automationId] =
          staleSnapshotArtifacts.sort(compareStrings);
      }
    }
  }

  return {
    missingRequiredReports: [...new Set(missingRequiredReports)].sort(compareStrings),
    missingRequiredReportArtifacts,
    staleGateSnapshotReports: [...new Set(staleGateSnapshotReports)].sort(compareStrings),
    staleGateSnapshotArtifacts
  };
}

function buildStatusReasonDetails(
  snapshot: GateEligibilitySnapshot | null,
  missingRequiredReports: string[],
  staleGateSnapshotReports: string[]
): AutomationContextStatusReason[] {
  const reasons: AutomationContextStatusReason[] = [];
  if (!snapshot) {
    reasons.push({
      code: "missing_gate_eligibility_snapshot",
      scope: "gate-snapshot",
      automationIds: [],
      source: "gate-eligibility-snapshot"
    });
  }
  if (missingRequiredReports.length > 0) {
    reasons.push({
      code: "missing_required_reports",
      scope: "dependency-inventory",
      automationIds: missingRequiredReports,
      source: "filesystem-reconciliation"
    });
  }
  if (staleGateSnapshotReports.length > 0) {
    reasons.push({
      code: "stale_gate_snapshot",
      scope: "dependency-inventory",
      automationIds: staleGateSnapshotReports,
      source: "filesystem-reconciliation"
    });
  }

  const synthesis = asGateEntry(snapshot?.eligibility?.synthesis);
  if (synthesis && synthesis.status !== "passed") {
    reasons.push({
      code: "synthesis_blocked",
      scope: "synthesis",
      automationIds: synthesis.automationIds ?? [],
      source: "gate-eligibility-snapshot"
    });
  }

  return reasons.sort((left, right) => compareStrings(left.code, right.code));
}

function formatStatusReason(reason: AutomationContextStatusReason): string {
  if (reason.automationIds.length === 0) return reason.code;
  return `${reason.code}:${reason.automationIds.join(",")}`;
}

function buildStatusReasons(reasonDetails: AutomationContextStatusReason[]): string[] {
  return reasonDetails.map(formatStatusReason).sort(compareStrings);
}

function readStatusById(taskStatus: TaskStatusFile): Record<string, string> {
  return Object.fromEntries(
    taskStatus.tasks
      .map((task) => [task.id, task.status] as const)
      .sort(([left], [right]) => compareStrings(left, right))
  );
}

function selectedTaskSummary(nextTask: NextTaskResult): AutomationContextPacket["autonomousTasks"]["selectedExecutorSafeTask"] {
  if (!nextTask.selected) return null;
  return {
    id: nextTask.selected.id,
    title: nextTask.selected.title,
    category: nextTask.selected.category,
    verification: [
      "npm run autonomous:verify",
      "npm run automations:check:all",
      "npm run skills:verify"
    ]
  };
}

function buildDeterministicRecommendation(
  missingRequiredReports: string[],
  staleGateSnapshotReports: string[],
  statusReasons: string[],
  selectedTask: AutomationContextPacket["autonomousTasks"]["selectedExecutorSafeTask"]
): AutomationContextPacket["deterministicRecommendation"] {
  if (missingRequiredReports.length > 0) {
    return {
      kind: "backfill_missing_reports",
      title: "Backfill gate-blocking automation reports before synthesis",
      blockedBy: missingRequiredReports,
      verify: [
        "npm run automations:check:all",
        "npm run automations:context:packet"
      ]
    };
  }
  if (staleGateSnapshotReports.length > 0) {
    return {
      kind: "refresh_gate_snapshot",
      title: "Refresh gate eligibility snapshot before synthesis",
      blockedBy: staleGateSnapshotReports,
      verify: [
        "npm run automations:snapshot:write -- --allow-runtime-reports",
        "npm run automations:context:packet"
      ]
    };
  }
  if (statusReasons.length > 0) {
    return {
      kind: "repair_context_inputs",
      title: "Repair automation context inputs before synthesis",
      blockedBy: statusReasons,
      verify: [
        "npm run automations:check:all",
        "npm run automations:context:packet"
      ]
    };
  }
  if (!selectedTask) {
    return {
      kind: "no_executor_safe_task",
      title: "No executor-safe task is currently selected",
      blockedBy: ["no_executor_safe_task"],
      verify: [
        "npm run autonomous:verify",
        "npm run automations:context:packet"
      ]
    };
  }

  return {
    kind: "use_selected_executor_safe_task",
    title: `Use executor-safe task: ${selectedTask.title}`,
    blockedBy: [],
    verify: [
      "npm run autonomous:verify",
      "npm run automations:check:all",
      "npm run skills:verify"
    ]
  };
}

export async function buildAutomationContextPacket(options?: {
  repoRoot?: string;
  generatedAt?: string;
}): Promise<AutomationContextPacket> {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const snapshotPath = path.join(repoRoot, SOURCE_PATHS.gateEligibilitySnapshot);
  const snapshot = (await exists(snapshotPath))
    ? await readJsonFile<GateEligibilitySnapshot>(snapshotPath)
    : null;
  const taskCandidates = await readJsonFile<CandidateFile>(
    path.join(repoRoot, SOURCE_PATHS.taskCandidates)
  );
  const taskStatus = await readJsonFile<TaskStatusFile>(path.join(repoRoot, SOURCE_PATHS.taskStatus));
  const latestReports = await Promise.all(
    AUTOMATION_REGISTRY.map((contract) =>
      readLatestReportInput(repoRoot, contract.id, contract.role, contract.gatingClass)
    )
  );
  const sortedLatestReports = latestReports.sort((left, right) =>
    compareStrings(left.automationId, right.automationId)
  );
  const {
    missingRequiredReports,
    missingRequiredReportArtifacts,
    staleGateSnapshotReports,
    staleGateSnapshotArtifacts
  } =
    reconcileRequiredReportsWithInventory(snapshot, sortedLatestReports);
  const statusReasonDetails = buildStatusReasonDetails(
    snapshot,
    missingRequiredReports,
    staleGateSnapshotReports
  );
  const statusReasons = buildStatusReasons(statusReasonDetails);
  const nextTask = selectNextTask({ currentRepoRoot: repoRoot, mode: "executor" });
  const selectedTask = selectedTaskSummary(nextTask);

  return {
    schemaVersion: 1,
    generatedAt,
    mode: "report-first",
    status: statusReasons.length > 0 ? "distillation_incomplete" : "ready",
    statusReasons,
    statusReasonDetails,
    sources: SOURCE_PATHS,
    constraints: {
      externalMemoryApi: "disabled",
      context7: "docs-only",
      langGraphCheckpointMemory: "runtime-smoke-or-explicit-persistence-only",
      liveWriteback: "blocked-unless-gate-snapshot-passes",
      mutationPolicy: "report-first"
    },
    latestReports: sortedLatestReports,
    missingRequiredReports,
    missingRequiredReportArtifacts,
    staleGateSnapshotReports,
    staleGateSnapshotArtifacts,
    gateSnapshot: {
      exists: snapshot !== null,
      evaluatedAt: snapshot?.evaluatedAt ?? null,
      projectionHash: snapshot?.projectionHash ?? null,
      eligibility: {
        synthesis: asGateEntry(snapshot?.eligibility?.synthesis),
        directorDryRun: asGateEntry(snapshot?.eligibility?.directorDryRun),
        directorLiveWrite: asGateEntry(snapshot?.eligibility?.directorLiveWrite),
        executor: asGateEntry(snapshot?.eligibility?.executor)
      }
    },
    autonomousTasks: {
      candidateCount: taskCandidates.candidates.length,
      statusById: readStatusById(taskStatus),
      selectedExecutorSafeTask: selectedTask
    },
    deterministicRecommendation: buildDeterministicRecommendation(
      missingRequiredReports,
      staleGateSnapshotReports,
      statusReasons,
      selectedTask
    )
  };
}

async function main() {
  const packet = await buildAutomationContextPacket();
  if (process.argv.includes("--compact")) {
    console.log(JSON.stringify(packet));
    return;
  }
  console.log(JSON.stringify(packet, null, 2));
}

if (process.argv[1]) {
  const invokedPath = path.resolve(process.argv[1]);
  const currentPath = path.resolve(new URL(import.meta.url).pathname);
  if (invokedPath === currentPath) {
    main().catch((error) => {
      console.error(error instanceof Error ? error.message : "automation context packet failed");
      process.exit(1);
    });
  }
}
