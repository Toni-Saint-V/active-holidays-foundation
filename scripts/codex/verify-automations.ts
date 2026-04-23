import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  AUTOMATION_REGISTRY,
  AUTOMATION_REGISTRY_MAP,
  type ArtifactKey,
  type AutomationContract,
  type AutomationId
} from "./automation-registry.ts";
import {
  computeGateEligibilitySnapshot,
  loadTrackedRuntimeState,
  SUPPORTED_WAIVER_HOOK_PATTERNS,
  type CheckWaiver,
  type ManualApproval,
  type NotionWritebackPromotionState
} from "./automation-runtime-governance.ts";
import {
  CANONICAL_ANCHORS,
  NOTION_AUDIT_OUTCOMES,
  OPERATIONAL_SURFACES,
  PACKET_ENVELOPE_REQUIRED_FIELDS,
  PACKET_LIFECYCLE_STATES,
  PACKET_SUPERSESSION_FIELDS,
  TARGET_RESOLUTION_LIFECYCLE_STATES,
  getOperationalSurfaceContract,
  getOperationalSurfaceContractHash,
  getOperationalSurfaceContractVersion,
  type OperationalSurface
} from "./notion-operational-contract.ts";
import { REPO_RUNTIME_MANIFEST } from "./repo-runtime-manifest.ts";
import { resolveSharedSkillCompatSnapshot } from "./shared-skill-compat.ts";
import {
  compareStrings,
  exists,
  hashValue,
  isIsoDateLike
} from "./automation-contract-utils.ts";

type ParsedAutomationDefinition = {
  dirName: string;
  id: string | null;
  name: string | null;
  status: string | null;
  rrule: string | null;
  executionEnvironment: string | null;
  model: string | null;
  reasoningEffort: string | null;
  prompt: string;
  cwds: string[];
  rawToml: string;
  sampleOutput: string;
};

const REQUIRED_DOCS = [
  "AUTOMATIONS_AUDIT.md",
  "AUTOMATIONS_ROADMAP.md",
  "AUTOMATIONS_OPERATING_MODEL.md",
  "AUTOMATIONS_NOTION_AI_HANDOFF.md",
  "RUNBOOK.md",
  "README.md",
  ".codex/automations/README.md",
  "reports/automations/README.md"
] as const;

const REQUIRED_HELPERS = [
  "scripts/codex/repo-runtime-manifest.ts",
  "scripts/codex/automation-contract-utils.ts",
  "scripts/codex/automation-registry.ts",
  "scripts/codex/notion-operational-contract.ts",
  "scripts/codex/shared-skill-compat.ts",
  "scripts/codex/automation-runtime-governance.ts",
  "scripts/codex/sync-automations.ts",
  "scripts/automations/check-source-freshness.ts",
  "scripts/automations/check-flow-instrumentation.ts",
  "scripts/automations/check-skill-duplication.ts",
  "scripts/automations/check-context-surface.ts"
] as const;

const REQUIRED_GITIGNORE_LINES = [
  "reports/automations/state/*",
  "!reports/automations/state/runtime-maturity.json",
  "!reports/automations/state/notion-writeback-promotion.json",
  "!reports/automations/state/open-decisions-legacy-bridge.json",
  "!reports/automations/state/manual-approvals.json",
  "!reports/automations/state/gate-eligibility-snapshot.json",
  "reports/automations/state/runtime-observed/",
  "reports/automations/state/execution-runs/"
] as const;

const VOLATILE_ONLY_FIELDS = [
  "activationObservedAt",
  "lastRunAt",
  "lastResult",
  "cleanStreak",
  "streakProgression",
  "runtimeEligibilityObservations"
] as const;

const DRY_RUN_DIFF_STATUSES = ["missing", "current", "conflict"] as const;

const REQUIRED_OPERATIONAL_DOC_MARKERS: Record<string, string[]> = {
  "AUTOMATIONS_OPERATING_MODEL.md": [
    ".codex/automations/notion-surface-lock.json",
    "reports/automations/state/gate-eligibility-snapshot.json",
    "reports/automations/state/manual-approvals.json",
    "recordTitle` is display-only",
    "read-only discovery before lock",
    "blocked_by_target_binding"
  ],
  "AUTOMATIONS_NOTION_AI_HANDOFF.md": [
    ".codex/automations/notion-surface-lock.json",
    "reports/automations/state/gate-eligibility-snapshot.json",
    "locked id + `syncKey`",
    "`recordTitle` is display-only",
    "read-only discovery before lock",
    "blocked_by_target_binding"
  ],
  ".codex/automations/README.md": [
    "gate-eligibility-snapshot.json",
    "manual approvals are addressable and fail-closed",
    "operational DB writes never resolve targets by title or name after a locked target id or data source id exists"
  ],
  "reports/automations/README.md": [
    "gate-eligibility-snapshot.json",
    "`recordTitle` is display-only",
    "locked target ids"
  ]
};

const PROHIBITED_LEGACY_PHRASES = [
  "exact surface names contract-owned until repo stores live ids",
  "primary mapping rule is the exact operational surface name"
] as const;

const NOTION_REPORT_AUTOMATIONS = new Set<AutomationId>([
  "ah-open-decisions-curator",
  "ah-release-gate-sync",
  "ah-review-learning-distiller",
  "ah-notion-sync-director"
]);

const NOTION_ELIGIBILITY_AUTOMATIONS = new Set<AutomationId>([
  "ah-open-decisions-curator",
  "ah-release-gate-sync",
  "ah-review-learning-distiller",
  "ah-next-best-action-distiller",
  "ah-notion-sync-director",
  "ah-draft-pr-executor"
]);

const LEGACY_VOCAB_AUTOMATIONS = new Set<AutomationId>([
  "ah-product-os-radar",
  "ah-execution-brief-sync",
  "ah-design-drift-vs-contract",
  "ah-open-decisions-curator",
  "ah-release-gate-sync",
  "ah-review-learning-distiller",
  "ah-notion-sync-director"
]);

function extractQuoted(text: string, key: string): string | null {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*"([^"\\n]+)"`, "m"));
  return match?.[1] ?? null;
}

function extractMultilinePrompt(text: string): string {
  const match = text.match(/^prompt\s*=\s*"""\n([\s\S]*?)\n"""/m);
  return match?.[1] ?? "";
}

function extractArray(text: string, key: string): string[] {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*\\[([\\s\\S]*?)\\]`, "m"));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"\n]+)"/g)].map((entry) => entry[1] ?? "");
}

async function listAutomationDirs(root: string): Promise<string[]> {
  if (!(await exists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const matches: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const automationToml = path.join(root, entry.name, "automation.toml");
    if (await exists(automationToml)) matches.push(entry.name);
  }
  return matches.sort(compareStrings);
}

async function parseAutomationDefinition(
  repoRoot: string,
  dirName: string
): Promise<ParsedAutomationDefinition> {
  const base = path.join(repoRoot, ".codex", "automations", dirName);
  const tomlPath = path.join(base, "automation.toml");
  const samplePath = path.join(base, "sample-output.md");
  const rawToml = await readFile(tomlPath, "utf8");
  const sampleOutput = (await exists(samplePath)) ? await readFile(samplePath, "utf8") : "";

  return {
    dirName,
    id: extractQuoted(rawToml, "id"),
    name: extractQuoted(rawToml, "name"),
    status: extractQuoted(rawToml, "status"),
    rrule: extractQuoted(rawToml, "rrule"),
    executionEnvironment: extractQuoted(rawToml, "execution_environment"),
    model: extractQuoted(rawToml, "model"),
    reasoningEffort: extractQuoted(rawToml, "reasoning_effort"),
    prompt: extractMultilinePrompt(rawToml),
    cwds: extractArray(rawToml, "cwds"),
    rawToml,
    sampleOutput
  };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort(compareStrings);
}

function collectObjectKeys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectObjectKeys(entry, `${prefix}[${index}]`));
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }

  const keys: string[] = [];
  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    const current = prefix ? `${prefix}.${key}` : key;
    keys.push(current, ...collectObjectKeys(entryValue, current));
  }
  return keys;
}

function collectUnexpectedKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[]
): string[] {
  const allowed = new Set(allowedKeys);
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .sort(compareStrings);
}

function collectMissingKeys(
  value: Record<string, unknown>,
  requiredKeys: readonly string[]
): string[] {
  return requiredKeys.filter((key) => !(key in value)).sort(compareStrings);
}

function isAutomationId(value: string): value is AutomationId {
  return AUTOMATION_REGISTRY_MAP.has(value as AutomationId);
}

function isOperationalSurface(value: string): value is OperationalSurface {
  return OPERATIONAL_SURFACES.includes(value as OperationalSurface);
}

function includesReportFirst(text: string): boolean {
  return /report[- ]first/i.test(text);
}

function includesIdentitySyncKey(text: string): boolean {
  return /identity(?:\s+is|\s*=|`\s*:\s*`)?\s*`?syncKey`?/i.test(text);
}

function includesDisplayOnlyRecordTitle(text: string): boolean {
  return /recordTitle[\s\S]{0,80}display-only|display-only[\s\S]{0,80}recordTitle/i.test(text);
}

function includesReadOnlyDiscoveryBeforeLock(text: string): boolean {
  return (
    /title(?:\/| or )name[\s\S]{0,120}read-only discovery before lock/i.test(text) ||
    /after lock[\s\S]{0,120}title(?:\/| or )name[\s\S]{0,120}(?:forbidden|запрещ|invalid)/i.test(text)
  );
}

function includesBlockedByTargetBinding(text: string): boolean {
  return text.includes("blocked_by_target_binding");
}

function includesGateSnapshot(text: string): boolean {
  return text.includes(REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath);
}

function includesObservedRuntimePath(text: string): boolean {
  return text.includes(`${REPO_RUNTIME_MANIFEST.runtimeObservedRoot}/`);
}

function includesExecutionRunsPath(text: string): boolean {
  return text.includes(`${REPO_RUNTIME_MANIFEST.executionRunsRoot}/`);
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function scanForCycles(contracts: readonly AutomationContract[]): string[] {
  const adjacency = new Map<AutomationId, AutomationId[]>(
    contracts.map((contract) => [
      contract.id,
      contract.requiredUpstreams.map((dependency) => dependency.automationId)
    ])
  );
  const active = new Set<AutomationId>();
  const visited = new Set<AutomationId>();
  const cycles: string[] = [];

  function visit(node: AutomationId, stack: AutomationId[]) {
    if (active.has(node)) {
      cycles.push([...stack, node].join(" -> "));
      return;
    }
    if (visited.has(node)) return;
    active.add(node);
    visited.add(node);
    for (const next of adjacency.get(node) ?? []) {
      visit(next, [...stack, node]);
    }
    active.delete(node);
  }

  for (const contract of contracts) {
    visit(contract.id, []);
  }

  return unique(cycles).sort(compareStrings);
}

function classifyStatePath(
  relativePath: string,
  trackedPaths: ReadonlySet<string>
): "tracked" | "volatile" | "report" | "other" {
  if (trackedPaths.has(relativePath)) return "tracked";
  if (
    relativePath.startsWith(`${REPO_RUNTIME_MANIFEST.runtimeObservedRoot}/`) ||
    relativePath.startsWith(`${REPO_RUNTIME_MANIFEST.executionRunsRoot}/`)
  ) {
    return "volatile";
  }
  if (relativePath.startsWith(`${REPO_RUNTIME_MANIFEST.runtimeReportsRoot}/`)) {
    return "report";
  }
  return "other";
}

function validateManualApprovalShape(approval: ManualApproval): string[] {
  const failures: string[] = [];
  const record = approval as unknown as Record<string, unknown>;
  const allowedKeys = [
    "approvalId",
    "surface",
    "targetId",
    "dataSourceId",
    "contractHash",
    "contractVersion",
    "diffHash",
    "approvedAt",
    "approvedBy",
    "expiresAt"
  ] as const;

  const extraKeys = collectUnexpectedKeys(record, allowedKeys);
  const missingKeys = collectMissingKeys(record, allowedKeys);
  if (extraKeys.length > 0) {
    failures.push(`manual approval ${approval.approvalId}: unexpected keys ${extraKeys.join(", ")}`);
  }
  if (missingKeys.length > 0) {
    failures.push(`manual approval ${approval.approvalId}: missing keys ${missingKeys.join(", ")}`);
  }
  if (!isOperationalSurface(approval.surface)) {
    failures.push(`manual approval ${approval.approvalId}: invalid surface ${approval.surface}`);
  }
  if (!approval.targetId && !approval.dataSourceId) {
    failures.push(`manual approval ${approval.approvalId}: targetId or dataSourceId is required`);
  }
  if (!approval.contractHash || !approval.contractVersion) {
    failures.push(`manual approval ${approval.approvalId}: contractHash and contractVersion are required`);
  }
  if (!approval.diffHash) {
    failures.push(`manual approval ${approval.approvalId}: diffHash is required`);
  }
  if (!approval.approvedBy) {
    failures.push(`manual approval ${approval.approvalId}: approvedBy is required`);
  }
  if (!isIsoDateLike(approval.approvedAt)) {
    failures.push(`manual approval ${approval.approvalId}: approvedAt must be ISO-like`);
  }
  if (!isIsoDateLike(approval.expiresAt)) {
    failures.push(`manual approval ${approval.approvalId}: expiresAt must be ISO-like`);
  }
  if (
    isIsoDateLike(approval.approvedAt) &&
    isIsoDateLike(approval.expiresAt) &&
    Date.parse(approval.expiresAt) < Date.parse(approval.approvedAt)
  ) {
    failures.push(`manual approval ${approval.approvalId}: expiresAt must not precede approvedAt`);
  }
  return failures;
}

function doesCheckMatchHookPattern(checkId: string, hookPattern: string): boolean {
  const escaped = hookPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `^${escaped.replace(/<[^>]+>/g, "[^:]+")}$`;
  return new RegExp(pattern).test(checkId);
}

function validateWaiverShape(waiver: CheckWaiver, waiverHookPatterns: readonly string[]): string[] {
  const failures: string[] = [];
  const record = waiver as unknown as Record<string, unknown>;
  const allowedKeys = [
    "waiverId",
    "appliesTo",
    "affectedChecks",
    "affectedAutomationIds",
    "affectedSurfaces",
    "reason",
    "severity",
    "owner",
    "approvedAt",
    "expiresAt"
  ] as const;

  const extraKeys = collectUnexpectedKeys(record, allowedKeys);
  const missingKeys = collectMissingKeys(record, allowedKeys);
  if (extraKeys.length > 0) {
    failures.push(`waiver ${waiver.waiverId}: unexpected keys ${extraKeys.join(", ")}`);
  }
  if (missingKeys.length > 0) {
    failures.push(`waiver ${waiver.waiverId}: missing keys ${missingKeys.join(", ")}`);
  }
  if (waiver.affectedChecks.length === 0) {
    failures.push(`waiver ${waiver.waiverId}: affectedChecks must not be empty`);
  }
  for (const checkId of waiver.affectedChecks) {
    if (!waiverHookPatterns.some((pattern) => doesCheckMatchHookPattern(checkId, pattern))) {
      failures.push(`waiver ${waiver.waiverId}: unsupported affectedCheck ${checkId}`);
    }
  }
  if (waiver.affectedAutomationIds.length === 0) {
    failures.push(`waiver ${waiver.waiverId}: affectedAutomationIds must not be empty`);
  }
  for (const automationId of waiver.affectedAutomationIds) {
    if (!AUTOMATION_REGISTRY_MAP.has(automationId)) {
      failures.push(`waiver ${waiver.waiverId}: unknown automation ${automationId}`);
    }
  }
  for (const surface of waiver.affectedSurfaces) {
    if (
      !isOperationalSurface(surface) &&
      !CANONICAL_ANCHORS.some((anchor) => anchor.key === surface)
    ) {
      failures.push(`waiver ${waiver.waiverId}: unknown surface ${surface}`);
    }
  }
  if (!isIsoDateLike(waiver.approvedAt) || !isIsoDateLike(waiver.expiresAt)) {
    failures.push(`waiver ${waiver.waiverId}: approvedAt/expiresAt must be ISO-like`);
  }
  if (isIsoDateLike(waiver.approvedAt) && isIsoDateLike(waiver.expiresAt)) {
    if (Date.parse(waiver.expiresAt) < Date.parse(waiver.approvedAt)) {
      failures.push(`waiver ${waiver.waiverId}: expiresAt must not precede approvedAt`);
    }
    if (Date.parse(waiver.expiresAt) < Date.now()) {
      failures.push(`waiver ${waiver.waiverId}: expired waivers must be removed`);
    }
  }
  return failures;
}

const PROMOTION_STATES = [
  "report_only",
  "audit_passed_pending_enable",
  "writeback_enabled",
  "schema_drift_blocked",
  "operator_disabled"
] as const;

const PROMOTION_STATE_TRANSITIONS: Record<string, readonly string[]> = {
  report_only: ["audit_passed_pending_enable", "schema_drift_blocked", "operator_disabled"],
  audit_passed_pending_enable: [
    "report_only",
    "writeback_enabled",
    "schema_drift_blocked",
    "operator_disabled"
  ],
  writeback_enabled: ["report_only", "schema_drift_blocked", "operator_disabled"],
  schema_drift_blocked: ["report_only", "audit_passed_pending_enable", "operator_disabled"],
  operator_disabled: ["report_only", "audit_passed_pending_enable", "schema_drift_blocked"]
};

function validatePromotionStateHistory(tracked: Awaited<ReturnType<typeof loadTrackedRuntimeState>>): string[] {
  const failures: string[] = [];
  const bySurface = new Map<
    OperationalSurface,
    Array<{
      toState: string;
      changedAt: string;
      changedBy: string;
      reason: string;
    }>
  >();
  for (const entry of tracked.notionWritebackPromotion.stateHistory) {
    if (!isOperationalSurface(entry.surface)) {
      failures.push(`notion-writeback-promotion: unknown history surface ${entry.surface}`);
      continue;
    }
    if (!isIsoDateLike(entry.changedAt)) {
      failures.push(`notion-writeback-promotion: history ${entry.surface} has non-ISO changedAt`);
      continue;
    }
    if (!PROMOTION_STATES.includes(entry.toState as (typeof PROMOTION_STATES)[number])) {
      failures.push(`notion-writeback-promotion: history ${entry.surface} has invalid toState ${entry.toState}`);
    }
    bySurface.set(entry.surface, [...(bySurface.get(entry.surface) ?? []), entry]);
  }

  for (const surface of OPERATIONAL_SURFACES) {
    const currentState = tracked.notionWritebackPromotion.surfaces[surface].currentState;
    const entries = (bySurface.get(surface) ?? []).slice().sort((left, right) =>
      compareStrings(left.changedAt, right.changedAt)
    );
    if (entries.length === 0) continue;

    let previousState: string | null = null;
    for (const entry of entries) {
      if (previousState) {
        const allowedTransitions: readonly string[] =
          PROMOTION_STATE_TRANSITIONS[previousState] ?? [];
        if (!allowedTransitions.includes(entry.toState)) {
          failures.push(
            `notion-writeback-promotion: invalid transition ${surface} ${previousState} -> ${entry.toState}`
          );
        }
      }
      previousState = entry.toState;
    }
    const latest = entries.at(-1);
    if (latest && latest.toState !== currentState) {
      failures.push(
        `notion-writeback-promotion: latest history state ${surface}:${latest.toState} must match currentState ${currentState}`
      );
    }
  }

  return failures;
}

async function main() {
  const repoRoot = process.cwd();
  const automationRoot = path.join(repoRoot, REPO_RUNTIME_MANIFEST.automationRoot);
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const relativePath of [...REQUIRED_DOCS, ...REQUIRED_HELPERS]) {
    if (!(await exists(path.join(repoRoot, relativePath)))) {
      failures.push(`missing required surface ${relativePath}`);
    }
  }

  const trackedStateSet = new Set(
    sortStrings([
      REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath,
      REPO_RUNTIME_MANIFEST.runtimeMaturityPath,
      REPO_RUNTIME_MANIFEST.notionWritebackPromotionPath,
      REPO_RUNTIME_MANIFEST.openDecisionsLegacyBridgePath,
      REPO_RUNTIME_MANIFEST.manualApprovalsPath,
      REPO_RUNTIME_MANIFEST.notionSurfaceLockPath,
      REPO_RUNTIME_MANIFEST.checkWaiversPath
    ])
  );

  for (const relativePath of trackedStateSet) {
    if (!(await exists(path.join(repoRoot, relativePath)))) {
      failures.push(`missing tracked state file ${relativePath}`);
    }
  }

  const gitignorePath = path.join(repoRoot, ".gitignore");
  const gitignoreText = (await exists(gitignorePath)) ? await readFile(gitignorePath, "utf8") : "";
  for (const line of REQUIRED_GITIGNORE_LINES) {
    if (!gitignoreText.includes(line)) {
      failures.push(`.gitignore: missing runtime boundary line ${line}`);
    }
  }

  const automationDirs = await listAutomationDirs(automationRoot);
  const parsedAutomations = await Promise.all(
    automationDirs.map((dirName) => parseAutomationDefinition(repoRoot, dirName))
  );

  if (automationDirs.length === 0) {
    failures.push("no automation.toml files found in .codex/automations");
  }

  const registryIds = AUTOMATION_REGISTRY.map((automation) => automation.id).sort(compareStrings);
  const dirIds = parsedAutomations
    .map((automation) => automation.dirName)
    .sort(compareStrings);

  for (const id of registryIds) {
    if (!dirIds.includes(id)) failures.push(`automation registry entry missing directory ${id}`);
  }
  for (const dirName of dirIds) {
    if (!registryIds.includes(dirName as AutomationId)) {
      failures.push(`automation directory missing registry contract ${dirName}`);
    }
  }

  const cycles = scanForCycles(AUTOMATION_REGISTRY);
  for (const cycle of cycles) {
    failures.push(`automation dependency cycle detected: ${cycle}`);
  }

  const tracked = await loadTrackedRuntimeState(repoRoot);
  const computedSnapshot = await computeGateEligibilitySnapshot(repoRoot, {
    includeVolatileState: false
  });
  const storedSnapshot = tracked.gateEligibilitySnapshot;
  const schemaChecks: Array<{ name: string; value: number }> = [
    { name: "runtime-maturity", value: tracked.runtimeMaturity.schemaVersion },
    { name: "notion-writeback-promotion", value: tracked.notionWritebackPromotion.schemaVersion },
    { name: "manual-approvals", value: tracked.manualApprovals.schemaVersion },
    { name: "open-decisions-legacy-bridge", value: tracked.openDecisionsLegacyBridge.schemaVersion },
    { name: "notion-surface-lock", value: tracked.notionSurfaceLock.schemaVersion },
    { name: "check-waivers", value: tracked.checkWaivers.schemaVersion },
    { name: "computed-gate-eligibility-snapshot", value: computedSnapshot.schemaVersion }
  ];
  for (const check of schemaChecks) {
    if (check.value !== 1) {
      failures.push(`${check.name}: unsupported schemaVersion ${check.value}`);
    }
  }
  if (!storedSnapshot) {
    failures.push(`missing ${REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath}`);
  } else if (storedSnapshot.schemaVersion !== 1) {
    failures.push(`${REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath}: unsupported schemaVersion ${storedSnapshot.schemaVersion}`);
  } else if (hashValue(storedSnapshot) !== hashValue(computedSnapshot)) {
    failures.push(
      `${REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath}: snapshot drift detected; recompute deterministic projection`
    );
  }
  if (computedSnapshot.invalidDryRunPackets.length > 0) {
    for (const invalidPacket of computedSnapshot.invalidDryRunPackets) {
      failures.push(
        `gate snapshot invalid dry-run packet ${invalidPacket.packetHint} (${invalidPacket.reason}) from ${invalidPacket.filePath}`
      );
    }
  }

  const sharedSkillCompat = await resolveSharedSkillCompatSnapshot(repoRoot);
  if (sharedSkillCompat.length === 0) {
    failures.push("shared skill compat resolved to zero snapshots");
  }
  for (const snapshot of sharedSkillCompat) {
    if (!(await exists(snapshot.resolvedPath))) {
      failures.push(`shared skill compat unresolved path ${snapshot.skillName}`);
    }
    if (!snapshot.contentHash) {
      failures.push(`shared skill compat missing contentHash for ${snapshot.skillName}`);
    }
    if (!snapshot.versionMarker) {
      failures.push(`shared skill compat missing versionMarker for ${snapshot.skillName}`);
    }
    if (snapshot.allowedMutationScope.length === 0) {
      failures.push(`shared skill compat missing allowedMutationScope for ${snapshot.skillName}`);
    }
    if (!isIsoDateLike(snapshot.checkedAt)) {
      failures.push(`shared skill compat checkedAt must be ISO-like for ${snapshot.skillName}`);
    }
  }

  const runtimeMaturityExpectedKeys = registryIds;
  const maturityArtifactKeys = Object.keys(tracked.runtimeMaturity.expectedArtifacts).sort(compareStrings);
  if (hashValue(maturityArtifactKeys) !== hashValue(runtimeMaturityExpectedKeys)) {
    failures.push("runtime-maturity expectedArtifacts must cover every registry automation exactly once");
  }

  const requiredFeederIds = [
    "ah-truth-freshness-watch",
    "ah-product-os-radar",
    "ah-execution-brief-sync",
    "ah-design-drift-vs-contract"
  ].sort(compareStrings);
  const maturityFeederIds = tracked.runtimeMaturity.requiredFeeders
    .map((feeder) => feeder.automationId)
    .sort(compareStrings);
  if (hashValue(maturityFeederIds) !== hashValue(requiredFeederIds)) {
    failures.push("runtime-maturity requiredFeeders must match the control-tower feeder contract");
  }
  const supportedWaiverHooks = [...SUPPORTED_WAIVER_HOOK_PATTERNS].sort(compareStrings);
  const configuredWaiverHooks = [...new Set(tracked.runtimeMaturity.waiverHooks)].sort(compareStrings);
  if (hashValue(configuredWaiverHooks) !== hashValue(supportedWaiverHooks)) {
    failures.push(
      `runtime-maturity waiverHooks must exactly match supported hooks: ${supportedWaiverHooks.join(", ")}`
    );
  }

  const trackedJsonObjects: Array<{ relativePath: string; payload: unknown }> = [
    { relativePath: REPO_RUNTIME_MANIFEST.runtimeMaturityPath, payload: tracked.runtimeMaturity },
    {
      relativePath: REPO_RUNTIME_MANIFEST.notionWritebackPromotionPath,
      payload: tracked.notionWritebackPromotion
    },
    { relativePath: REPO_RUNTIME_MANIFEST.manualApprovalsPath, payload: tracked.manualApprovals },
    {
      relativePath: REPO_RUNTIME_MANIFEST.openDecisionsLegacyBridgePath,
      payload: tracked.openDecisionsLegacyBridge
    },
    { relativePath: REPO_RUNTIME_MANIFEST.notionSurfaceLockPath, payload: tracked.notionSurfaceLock },
    { relativePath: REPO_RUNTIME_MANIFEST.checkWaiversPath, payload: tracked.checkWaivers },
    {
      relativePath: REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath,
      payload: storedSnapshot ?? computedSnapshot
    }
  ];

  for (const { relativePath, payload } of trackedJsonObjects) {
    const keyPaths = collectObjectKeys(payload);
    for (const volatileKey of VOLATILE_ONLY_FIELDS) {
      const matches = keyPaths.filter(
        (keyPath) => keyPath === volatileKey || keyPath.endsWith(`.${volatileKey}`)
      );
      if (matches.length > 0) {
        failures.push(
          `${relativePath}: tracked deterministic state must not contain volatile field ${volatileKey}`
        );
      }
    }
  }

  for (const waiver of tracked.checkWaivers.waivers) {
    failures.push(...validateWaiverShape(waiver, configuredWaiverHooks));
  }

  for (const approval of tracked.manualApprovals.approvals) {
    failures.push(...validateManualApprovalShape(approval));
  }
  failures.push(...validatePromotionStateHistory(tracked));

  const canonicalAnchorKeys = CANONICAL_ANCHORS.map((anchor) => anchor.key).sort(compareStrings);
  const lockAnchorKeys = Object.keys(tracked.notionSurfaceLock.canonicalAnchors).sort(compareStrings);
  if (hashValue(canonicalAnchorKeys) !== hashValue(lockAnchorKeys)) {
    failures.push("notion-surface-lock canonicalAnchors must match the machine-owned canonical anchor set");
  }

  const lockSurfaceKeys = Object.keys(tracked.notionSurfaceLock.operationalSurfaces).sort(compareStrings);
  const promotionSurfaceKeys = Object.keys(tracked.notionWritebackPromotion.surfaces).sort(compareStrings);
  const surfaceKeys = [...OPERATIONAL_SURFACES].sort(compareStrings);
  if (hashValue(lockSurfaceKeys) !== hashValue(surfaceKeys)) {
    failures.push("notion-surface-lock operationalSurfaces must match the machine-owned surface set");
  }
  if (hashValue(promotionSurfaceKeys) !== hashValue(surfaceKeys)) {
    failures.push("notion-writeback-promotion surfaces must match the machine-owned surface set");
  }

  for (const surface of OPERATIONAL_SURFACES) {
    const surfaceContract = getOperationalSurfaceContract(surface);
    const contractHash = getOperationalSurfaceContractHash(surface);
    const contractVersion = getOperationalSurfaceContractVersion(surface);
    const lock = tracked.notionSurfaceLock.operationalSurfaces[surface];
    const promotion = tracked.notionWritebackPromotion.surfaces[surface];
    const gatePromotion = computedSnapshot.promotionStatus[surface];

    if (!NOTION_AUDIT_OUTCOMES.includes(lock.auditOutcome)) {
      failures.push(`${surface}: invalid auditOutcome ${lock.auditOutcome}`);
    }
    if (!TARGET_RESOLUTION_LIFECYCLE_STATES.includes(lock.targetResolutionLifecycle)) {
      failures.push(`${surface}: invalid targetResolutionLifecycle ${lock.targetResolutionLifecycle}`);
    }
    if (lock.surfaceContractHash !== contractHash) {
      failures.push(`${surface}: notion-surface-lock surfaceContractHash drifted from machine contract`);
    }
    if (lock.surfaceContractVersion !== contractVersion) {
      failures.push(`${surface}: notion-surface-lock surfaceContractVersion drifted from machine contract`);
    }
    if (lock.dataSourceId && !lock.dataSourceId.startsWith("collection://")) {
      failures.push(`${surface}: locked dataSourceId must use collection:// prefix`);
    }
    if ((lock.targetId || lock.dataSourceId) && lock.targetResolutionLifecycle === "legacy_title_read_only") {
      failures.push(`${surface}: locked operational surfaces must not stay in legacy_title_read_only`);
    }
    if ((lock.targetId || lock.dataSourceId) && lock.targetResolutionLifecycle === "hard_fail_unbound") {
      failures.push(`${surface}: locked operational surfaces must not stay in hard_fail_unbound`);
    }
    if (
      promotion.currentState === "writeback_enabled" ||
      promotion.currentState === "audit_passed_pending_enable"
    ) {
      if (promotion.targetId !== lock.targetId || promotion.dataSourceId !== lock.dataSourceId) {
        failures.push(`${surface}: notion-writeback-promotion target binding must match notion-surface-lock`);
      }
      if (promotion.requiredContractHash !== contractHash) {
        failures.push(`${surface}: notion-writeback-promotion requiredContractHash must match machine contract`);
      }
      if (promotion.requiredContractVersion !== contractVersion) {
        failures.push(`${surface}: notion-writeback-promotion requiredContractVersion must match machine contract`);
      }
    }
    if (gatePromotion.currentContractHash !== contractHash) {
      failures.push(`${surface}: gate snapshot currentContractHash drifted from machine contract`);
    }
    if (gatePromotion.currentContractVersion !== contractVersion) {
      failures.push(`${surface}: gate snapshot currentContractVersion drifted from machine contract`);
    }
    if (
      promotion.currentState === "writeback_enabled" &&
      gatePromotion.promotionBindingStatus !== "matched"
    ) {
      failures.push(
        `${surface}: writeback_enabled requires current lock/contract/diff binding, got ${gatePromotion.promotionBindingStatus}`
      );
    }
    if (
      promotion.currentState === "writeback_enabled" &&
      gatePromotion.approvalStatus !== "matched"
    ) {
      failures.push(
        `${surface}: writeback_enabled requires a matching unexpired manual approval, got ${gatePromotion.approvalStatus}`
      );
    }
    if (
      promotion.currentState === "writeback_enabled" &&
      tracked.notionSurfaceLock.operationalSurfaces[surface].auditOutcome !== "confirmed"
    ) {
      failures.push(`${surface}: writeback_enabled requires audit outcome confirmed`);
    }
    const dryRunDiffStatus = computedSnapshot.dryRunDiffStatus[surface];
    if (!DRY_RUN_DIFF_STATUSES.includes(dryRunDiffStatus.status)) {
      failures.push(`${surface}: invalid dry-run diff status ${dryRunDiffStatus.status}`);
    }
    if (
      dryRunDiffStatus.evidenceSource !== "none" &&
      dryRunDiffStatus.evidenceSource !== "report_artifact" &&
      dryRunDiffStatus.evidenceSource !== "runtime_observed"
    ) {
      failures.push(`${surface}: invalid dry-run evidenceSource ${dryRunDiffStatus.evidenceSource}`);
    }
    if (dryRunDiffStatus.invalidPacketCount < 0) {
      failures.push(`${surface}: invalid dry-run invalidPacketCount ${dryRunDiffStatus.invalidPacketCount}`);
    }
    if (dryRunDiffStatus.status === "conflict" && dryRunDiffStatus.conflictKeys.length === 0) {
      failures.push(`${surface}: dry-run diff conflict must list conflictKeys`);
    }
    if (dryRunDiffStatus.currentDiffHash && dryRunDiffStatus.currentPacketKeys.length === 0) {
      failures.push(`${surface}: current dry-run diff hash must be backed by currentPacketKeys`);
    }
    if (
      promotion.currentState === "writeback_enabled" &&
      dryRunDiffStatus.currentDiffHash === null
    ) {
      failures.push(`${surface}: writeback_enabled requires deterministic ready_for_sync dry-run diff`);
    }
    if (
      promotion.currentState === "writeback_enabled" &&
      dryRunDiffStatus.evidenceSource !== "report_artifact"
    ) {
      failures.push(`${surface}: writeback_enabled requires report_artifact dry-run evidence`);
    }
    if (
      surfaceContract.targetResolution.discoveryMode !== "title_or_name_read_only_until_lock" ||
      surfaceContract.targetResolution.lockedWriteMode !== "locked_target_id_and_sync_key_only" ||
      surfaceContract.targetResolution.blockedReason !== "blocked_by_target_binding" ||
      surfaceContract.targetResolution.recordTitleRole !== "display_only"
    ) {
      failures.push(`${surface}: invalid target resolution contract`);
    }
    if (
      hashValue([...surfaceContract.packetLifecycle].sort(compareStrings)) !==
      hashValue([...PACKET_LIFECYCLE_STATES].sort(compareStrings))
    ) {
      failures.push(`${surface}: packet lifecycle contract drift detected`);
    }
    if (
      !surfaceContract.additiveCompatRules.some((rule) =>
        /write or update by title or name is forbidden/i.test(rule)
      )
    ) {
      failures.push(`${surface}: additive compat rules must ban title/name writes after lock`);
    }
  }

  for (const [relativePath, markers] of Object.entries(REQUIRED_OPERATIONAL_DOC_MARKERS)) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!(await exists(absolutePath))) continue;
    const text = normalizeText(await readFile(absolutePath, "utf8"));
    for (const marker of markers) {
      if (!text.includes(marker)) {
        failures.push(`${relativePath}: missing marker ${marker}`);
      }
    }
    for (const prohibited of PROHIBITED_LEGACY_PHRASES) {
      if (text.includes(prohibited)) {
        failures.push(`${relativePath}: contains deprecated target-resolution phrase "${prohibited}"`);
      }
    }
  }

  for (const automation of parsedAutomations) {
    const samplePath = path.join(
      repoRoot,
      ".codex",
      "automations",
      automation.dirName,
      "sample-output.md"
    );
    if (!(await exists(samplePath))) {
      failures.push(`${automation.dirName}: missing sample-output.md`);
    }
    if (!automation.id) failures.push(`${automation.dirName}: missing id`);
    if (!automation.name) failures.push(`${automation.dirName}: missing name`);
    if (!automation.status) failures.push(`${automation.dirName}: missing status`);
    if (!automation.rrule) failures.push(`${automation.dirName}: missing rrule`);
    if (!automation.model) failures.push(`${automation.dirName}: missing model`);
    if (!automation.reasoningEffort) failures.push(`${automation.dirName}: missing reasoning_effort`);
    if (automation.executionEnvironment !== "worktree") {
      failures.push(`${automation.dirName}: execution_environment must stay worktree`);
    }
    if (!/^prompt\s*=\s*"""/m.test(automation.rawToml)) {
      failures.push(`${automation.dirName}: prompt must use multiline TOML string`);
    }
    if (automation.id && automation.id !== automation.dirName) {
      failures.push(`${automation.dirName}: id must match directory name`);
    }
    if (automation.status && automation.status !== "PAUSED") {
      failures.push(`${automation.dirName}: repo-local automations must stay PAUSED by default`);
    }
    if (automation.cwds.length !== 1 || automation.cwds[0] !== REPO_RUNTIME_MANIFEST.canonicalRepoRoot) {
      failures.push(
        `${automation.dirName}: cwds must contain only ${REPO_RUNTIME_MANIFEST.canonicalRepoRoot}`
      );
    }

    const automationId = automation.id;
    if (!automationId || !isAutomationId(automationId)) {
      if (automationId) failures.push(`${automation.dirName}: unknown automation id ${automationId}`);
      continue;
    }

    const contract = AUTOMATION_REGISTRY_MAP.get(automationId);
    if (!contract) {
      failures.push(`${automation.dirName}: missing machine-owned contract`);
      continue;
    }

    const expectedMutationPolicy =
      contract.role === "director"
        ? "prepared-writeback-only"
        : contract.role === "executor"
          ? "gated-live-write-only"
          : "report-only";
    if (contract.mutationPolicy !== expectedMutationPolicy) {
      failures.push(`${automationId}: mutationPolicy must be ${expectedMutationPolicy}`);
    }
    if (
      contract.role === "director" &&
      contract.gatingClass !== "dry-run-director"
    ) {
      failures.push(`${automationId}: director must use dry-run-director gating class`);
    }
    if (
      contract.role === "executor" &&
      contract.gatingClass !== "executor-lane"
    ) {
      failures.push(`${automationId}: executor must use executor-lane gating class`);
    }
    if (
      contract.role !== "feeder" &&
      !contract.freshnessPolicy.requiresFreshUpstreams
    ) {
      failures.push(`${automationId}: downstream automation must declare freshness dependency`);
    }
    if (
      contract.requiredUpstreams.length > 0 &&
      !contract.freshnessPolicy.blockOnMixedSnapshots
    ) {
      failures.push(`${automationId}: downstream automation must block on mixed snapshots`);
    }
    if (
      hashValue([...tracked.runtimeMaturity.expectedArtifacts[automationId]].sort(compareStrings)) !==
      hashValue([...contract.requiredArtifacts].sort(compareStrings))
    ) {
      failures.push(`${automationId}: runtime-maturity expectedArtifacts drift from registry`);
    }

    for (const upstream of contract.requiredUpstreams) {
      if (!AUTOMATION_REGISTRY_MAP.has(upstream.automationId)) {
        failures.push(`${automationId}: unknown upstream ${upstream.automationId}`);
      }
      if (upstream.requiredArtifacts.length === 0) {
        failures.push(`${automationId}: upstream ${upstream.automationId} must declare requiredArtifacts`);
      }
      if (upstream.maxAgeHours <= 0) {
        failures.push(`${automationId}: upstream ${upstream.automationId} must declare positive maxAgeHours`);
      }
    }
    const dependencySnapshot = computedSnapshot.dependencyStatus[automationId] ?? {};
    const expectedDependencyKeys = contract.requiredUpstreams
      .map((upstream) => upstream.automationId)
      .sort(compareStrings);
    const snapshotDependencyKeys = Object.keys(dependencySnapshot).sort(compareStrings);
    if (hashValue(snapshotDependencyKeys) !== hashValue(expectedDependencyKeys)) {
      failures.push(`${automationId}: dependencyStatus keys must match requiredUpstreams`);
    }
    for (const upstream of contract.requiredUpstreams) {
      const snapshotGate = dependencySnapshot[upstream.automationId];
      if (!snapshotGate) continue;
      if (snapshotGate.maxAgeHours !== upstream.maxAgeHours) {
        failures.push(
          `${automationId}: dependencyStatus maxAgeHours drift for upstream ${upstream.automationId}`
        );
      }
      const invalidMissingArtifacts = snapshotGate.missingArtifacts.filter(
        (artifact) => !upstream.requiredArtifacts.includes(artifact)
      );
      if (invalidMissingArtifacts.length > 0) {
        failures.push(
          `${automationId}: dependencyStatus for ${upstream.automationId} includes invalid missingArtifacts ${invalidMissingArtifacts.join(", ")}`
        );
      }
      if (
        snapshotGate.status !== "pass" &&
        snapshotGate.waivedBy.length === 0 &&
        snapshotGate.latestReportAgeHours === null &&
        snapshotGate.missingArtifacts.length === 0
      ) {
        failures.push(
          `${automationId}: dependencyStatus for ${upstream.automationId} blocks without explicit artifact or freshness evidence`
        );
      }
    }

    const canonicalAnchorErrors = contract.notionSurfaceUsage.canonicalAnchors.filter(
      (anchorKey) => !CANONICAL_ANCHORS.some((anchor) => anchor.key === anchorKey)
    );
    if (canonicalAnchorErrors.length > 0) {
      failures.push(`${automationId}: unknown canonical anchors ${canonicalAnchorErrors.join(", ")}`);
    }
    const operationalSurfaceErrors = contract.notionSurfaceUsage.operationalSurfaces.filter(
      (surface) => !isOperationalSurface(surface)
    );
    if (operationalSurfaceErrors.length > 0) {
      failures.push(`${automationId}: unknown operational surfaces ${operationalSurfaceErrors.join(", ")}`);
    }

    for (const relativePath of contract.statePolicy.readsTrackedState) {
      if (classifyStatePath(relativePath, trackedStateSet) !== "tracked") {
        failures.push(`${automationId}: readsTrackedState must reference tracked deterministic state only (${relativePath})`);
      }
    }
    for (const relativePath of contract.statePolicy.readsVolatileState) {
      if (classifyStatePath(relativePath, trackedStateSet) !== "volatile") {
        failures.push(`${automationId}: readsVolatileState must reference volatile runtime state only (${relativePath})`);
      }
    }
    if (
      (contract.role === "synthesis" ||
        contract.role === "director" ||
        contract.role === "executor") &&
      contract.statePolicy.readsVolatileState.length > 0
    ) {
      failures.push(
        `${automationId}: eligibility-bearing ${contract.role} automation must not read volatile state directly; use gate-eligibility-snapshot.json`
      );
    }
    if (
      (contract.role === "synthesis" ||
        contract.role === "director" ||
        contract.role === "executor") &&
      !contract.statePolicy.readsTrackedState.includes(REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath)
    ) {
      failures.push(`${automationId}: eligibility-bearing automation must read gate-eligibility-snapshot.json`);
    }
    for (const relativePath of contract.statePolicy.writesState) {
      const kind = classifyStatePath(relativePath, trackedStateSet);
      if (kind === "tracked") {
        failures.push(`${automationId}: writesState must never target tracked deterministic state (${relativePath})`);
      }
      if (kind === "other") {
        failures.push(`${automationId}: writesState must stay within runtime reports or volatile runtime state (${relativePath})`);
      }
      if (
        (contract.role === "feeder" || contract.role === "synthesis") &&
        kind === "volatile"
      ) {
        failures.push(`${automationId}: feeder/synthesis automation must not write volatile runtime state`);
      }
    }

    const combinedText = normalizeText(`${automation.prompt}\n${automation.sampleOutput}`);
    if (LEGACY_VOCAB_AUTOMATIONS.has(automationId) && combinedText.includes("Vision, Execution, Open Decisions")) {
      failures.push(`${automationId}: deprecated canonical/operational vocabulary must be removed`);
    }
    for (const prohibited of PROHIBITED_LEGACY_PHRASES) {
      if (combinedText.includes(prohibited)) {
        failures.push(`${automationId}: deprecated target-resolution phrase "${prohibited}"`);
      }
    }

    if (NOTION_ELIGIBILITY_AUTOMATIONS.has(automationId) && !includesGateSnapshot(combinedText)) {
      failures.push(`${automationId}: must use gate-eligibility-snapshot.json for current eligibility`);
    }
    if (
      (contract.role === "synthesis" || contract.role === "director" || contract.role === "executor") &&
      (includesObservedRuntimePath(combinedText) ||
        (contract.role !== "executor" && includesExecutionRunsPath(combinedText)))
    ) {
      failures.push(
        `${automationId}: prompts/samples for eligibility-bearing automations must not read volatile runtime paths directly`
      );
    }

    if (NOTION_REPORT_AUTOMATIONS.has(automationId)) {
      const packetMarkers = [
        "recordTitle",
        "syncKey",
        "notionSurface",
        "writeMode",
        "sourceReportId",
        "source",
        "confidence",
        "lastVerifiedAt",
        "actionNeeded"
      ] as const;
      for (const marker of packetMarkers) {
        if (!combinedText.includes(marker)) {
          failures.push(`${automationId}: missing Notion packet marker ${marker}`);
        }
      }
      if (!combinedText.includes("packetLifecycle")) {
        failures.push(`${automationId}: packetLifecycle must be explicit in prompt or sample`);
      }
      if (!includesIdentitySyncKey(combinedText)) {
        failures.push(`${automationId}: must state that identity is syncKey`);
      }
      if (!includesDisplayOnlyRecordTitle(combinedText)) {
        failures.push(`${automationId}: must state that recordTitle is display-only`);
      }
      if (!includesReadOnlyDiscoveryBeforeLock(combinedText)) {
        failures.push(`${automationId}: must state that title/name is read-only discovery before lock`);
      }
      if (!includesBlockedByTargetBinding(combinedText)) {
        failures.push(`${automationId}: must fail closed with blocked_by_target_binding`);
      }
      if (!combinedText.includes(REPO_RUNTIME_MANIFEST.notionSurfaceLockPath)) {
        failures.push(`${automationId}: must reference notion-surface-lock.json`);
      }
      if (!includesReportFirst(automation.prompt) && automationId !== "ah-draft-pr-executor") {
        failures.push(`${automationId}: report-first safety must be explicit`);
      }
    }

    if (
      automationId === "ah-notion-sync-director" &&
      (!automation.prompt.includes("dry_run") ||
        !automation.prompt.includes(REPO_RUNTIME_MANIFEST.notionWritebackPromotionPath) ||
        !automation.prompt.includes(REPO_RUNTIME_MANIFEST.manualApprovalsPath))
    ) {
      failures.push(
        `${automationId}: director prompt must stay dry_run-gated and reference promotion + manual approvals`
      );
    }

    if (
      automationId === "ah-draft-pr-executor" &&
      (!combinedText.includes("eligiblePackets") ||
        !combinedText.includes("blockedPackets") ||
        !combinedText.includes("ready_for_sync"))
    ) {
      failures.push(
        `${automationId}: executor prompt/sample must consume packet-level eligiblePackets/blockedPackets from gate snapshot`
      );
    }

    if (
      automationId === "ah-product-os-radar" &&
      (!combinedText.includes("P0") ||
        !combinedText.includes("P1") ||
        !combinedText.includes("P2"))
    ) {
      failures.push(`${automationId}: feeder must use canonical P0/P1/P2 vocabulary`);
    }

    if (
      automationId === "ah-execution-brief-sync" &&
      (!combinedText.includes("Execution") ||
        !combinedText.includes(REPO_RUNTIME_MANIFEST.notionSurfaceLockPath) ||
        !includesBlockedByTargetBinding(combinedText))
    ) {
      failures.push(`${automationId}: execution brief sync must resolve Execution through the lock file or block`);
    }

    if (
      automationId === "ah-design-drift-vs-contract" &&
      (!combinedText.includes("P1") ||
        !combinedText.includes("P2") ||
        !/Lovable/i.test(combinedText))
    ) {
      failures.push(`${automationId}: design drift feeder must use P1/P2 plus Lovable-compatible language`);
    }
  }

  const executorEligibility = computedSnapshot.eligibility.executor;
  const executorPackets = [
    ...executorEligibility.eligiblePackets,
    ...executorEligibility.blockedPackets
  ];
  if (
    executorEligibility.status === "eligible" &&
    executorEligibility.eligiblePackets.length === 0
  ) {
    failures.push("gate snapshot executor eligibility cannot be eligible without eligiblePackets");
  }
  if (
    executorEligibility.status === "blocked" &&
    executorEligibility.eligiblePackets.length === 0 &&
    !executorEligibility.reasons.includes("blocked_by_no_ready_packet") &&
    !executorEligibility.reasons.includes("blocked_by_no_eligible_packet")
  ) {
    failures.push("gate snapshot executor blocked state must explain absence of ready packet");
  }
  const expectedSubGateKeys = [
    "freshness",
    "writebackPromotion",
    "readyPacketObserved",
    "eligiblePacketPresent",
    "executorLane"
  ].sort(compareStrings);
  const actualSubGateKeys = Object.keys(executorEligibility.subGates).sort(compareStrings);
  if (hashValue(actualSubGateKeys) !== hashValue(expectedSubGateKeys)) {
    failures.push(
      `gate snapshot executor subGates drifted: expected ${expectedSubGateKeys.join(", ")}`
    );
  }
  for (const [gateName, gateStatus] of Object.entries(executorEligibility.subGates)) {
    if (gateStatus !== "passed" && gateStatus !== "blocked") {
      failures.push(`gate snapshot executor subGate ${gateName} has invalid status ${gateStatus}`);
    }
  }
  for (const packet of executorPackets) {
    if (!isOperationalSurface(packet.surface)) {
      failures.push(`executor packet ${packet.packetKey}: invalid surface ${packet.surface}`);
    }
    if (!packet.syncKey) failures.push(`executor packet ${packet.packetKey}: missing syncKey`);
    if (!packet.sourceReportId) {
      failures.push(`executor packet ${packet.packetKey}: missing sourceReportId`);
    }
    if (!isIsoDateLike(packet.lastVerifiedAt)) {
      failures.push(`executor packet ${packet.packetKey}: lastVerifiedAt must be ISO-like`);
    }
    if (!PACKET_LIFECYCLE_STATES.includes(packet.packetLifecycle)) {
      failures.push(`executor packet ${packet.packetKey}: invalid packetLifecycle`);
    }
    if (packet.status === "eligible") {
      if (packet.packetLifecycle !== "ready_for_sync") {
        failures.push(`executor packet ${packet.packetKey}: eligible packet must be ready_for_sync`);
      }
      if (packet.reasons.length > 0) {
        failures.push(`executor packet ${packet.packetKey}: eligible packet must not have blocking reasons`);
      }
      if (packet.targetBindingStatus !== "passed") {
        failures.push(`executor packet ${packet.packetKey}: eligible packet requires target binding passed`);
      }
      if (packet.promotionStatus !== "matched" || packet.approvalStatus !== "matched") {
        failures.push(`executor packet ${packet.packetKey}: eligible packet requires promotion and approval matched`);
      }
      if (packet.supersessionStatus !== "passed") {
        failures.push(`executor packet ${packet.packetKey}: eligible packet requires supersessionStatus passed`);
      }
      if (packet.evidenceSource !== "report_artifact") {
        failures.push(`executor packet ${packet.packetKey}: eligible packet must use report_artifact evidence`);
      }
    }
    if (packet.status === "blocked" && packet.reasons.length === 0) {
      failures.push(`executor packet ${packet.packetKey}: blocked packet must explain reasons`);
    }
  }

  for (const field of PACKET_ENVELOPE_REQUIRED_FIELDS) {
    const referenced = parsedAutomations.some((automation) =>
      normalizeText(`${automation.prompt}\n${automation.sampleOutput}`).includes(field)
    );
    if (!referenced) {
      failures.push(`packet envelope field ${field} must be represented in automation prompts or samples`);
    }
  }
  for (const field of PACKET_SUPERSESSION_FIELDS) {
    const referenced = parsedAutomations.some((automation) =>
      normalizeText(`${automation.prompt}\n${automation.sampleOutput}`).includes(field)
    );
    if (!referenced) {
      failures.push(`packet supersession field ${field} must be represented in automation prompts or samples`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures.sort(compareStrings)) {
      console.error(`[FAIL] ${failure}`);
    }
    for (const warning of warnings.sort(compareStrings)) {
      console.error(`[WARN] ${warning}`);
    }
    process.exit(1);
  }

  for (const warning of warnings.sort(compareStrings)) {
    console.error(`[WARN] ${warning}`);
  }

  console.log(
    `[OK] verified ${parsedAutomations.length} automation definitions, runtime contracts, and gate projection.`
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Проверка automations завершилась ошибкой."
  );
  process.exit(1);
});
