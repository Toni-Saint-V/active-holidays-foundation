import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  hashValue,
  readJsonFile,
  readOptionalJsonFile,
  exists,
  compareStrings,
  latestIso,
  normalizeIso,
  parseIsoToMs
} from "./automation-contract-utils.ts";
import {
  AUTOMATION_REGISTRY,
  type ArtifactKey,
  type AutomationId
} from "./automation-registry.ts";
import {
  OPERATIONAL_SURFACES,
  PACKET_LIFECYCLE_STATES,
  derivePacketDedupeKey,
  derivePacketKey,
  getOperationalSurfaceContractHash,
  getOperationalSurfaceContractVersion,
  type NotionAuditOutcome,
  type OperationalSurface,
  type PacketLifecycleState
} from "./notion-operational-contract.ts";
import { REPO_RUNTIME_MANIFEST } from "./repo-runtime-manifest.ts";

export type WaiverSeverity = "low" | "medium" | "high" | "critical";

export type CheckWaiver = {
  waiverId: string;
  appliesTo: string;
  affectedChecks: string[];
  affectedAutomationIds: AutomationId[];
  affectedSurfaces: string[];
  reason: string;
  severity: WaiverSeverity;
  owner: string;
  approvedAt: string;
  expiresAt: string;
};

export type CheckWaiverState = {
  schemaVersion: number;
  waivers: CheckWaiver[];
};

export type ManualApproval = {
  approvalId: string;
  surface: OperationalSurface;
  targetId: string | null;
  dataSourceId: string | null;
  contractHash: string | null;
  contractVersion: string | null;
  diffHash: string;
  approvedAt: string;
  approvedBy: string;
  expiresAt: string;
};

export type ManualApprovalState = {
  schemaVersion: number;
  approvals: ManualApproval[];
};

export type RuntimeMaturityState = {
  schemaVersion: number;
  updatedAt: string;
  requiredFeeders: Array<{
    automationId: AutomationId;
    maxAgeHours: number;
    requiredArtifacts: ArtifactKey[];
  }>;
  expectedArtifacts: Record<AutomationId, ArtifactKey[]>;
  gatingRules: {
    synthesisRequires: string[];
    directorDryRunRequires: string[];
    directorLiveWriteRequires: string[];
    executorRequires: string[];
  };
  waiverHooks: string[];
};

export const SUPPORTED_WAIVER_HOOK_PATTERNS = [
  "freshness:<automationId>",
  "executor:<dedupeKey>"
] as const;

export type GateEligibilitySnapshotOptions = {
  includeVolatileState?: boolean;
};

export type NotionWritebackPromotionState = {
  schemaVersion: number;
  updatedAt: string;
  surfaces: Record<
    OperationalSurface,
    {
      currentState:
        | "report_only"
        | "audit_passed_pending_enable"
        | "writeback_enabled"
        | "schema_drift_blocked"
        | "operator_disabled";
      targetId: string | null;
      dataSourceId: string | null;
      requiredContractHash: string | null;
      requiredContractVersion: string | null;
      requiredDiffHash: string | null;
      operatorUpdatedAt: string;
      operatorUpdatedBy: string;
      rationale: string;
    }
  >;
  stateHistory: Array<{
    surface: OperationalSurface;
    toState: string;
    changedAt: string;
    changedBy: string;
    reason: string;
  }>;
};

export type LegacyDecisionBridge = {
  legacyRowId: string;
  syncKey: string;
  futureDatabaseTargetStatus:
    | "legacy_title_read_only"
    | "pending_database_cutover"
    | "sync_key_only"
    | "hard_fail_unbound";
};

export type OpenDecisionsLegacyBridgeState = {
  schemaVersion: number;
  updatedAt: string;
  rows: LegacyDecisionBridge[];
};

export type NotionSurfaceLockState = {
  schemaVersion: number;
  auditedAt: string;
  canonicalAnchors: Record<
    string,
    {
      pageId: string;
      title: string;
      status: "confirmed" | "legacy_read_only";
    }
  >;
  operationalSurfaces: Record<
    OperationalSurface,
    {
      auditOutcome: NotionAuditOutcome;
      liveTitle: string | null;
      targetId: string | null;
      dataSourceId: string | null;
      surfaceContractHash: string | null;
      surfaceContractVersion: string | null;
      targetResolutionLifecycle:
        | "legacy_title_read_only"
        | "sync_key_only"
        | "live_id_bound"
        | "hard_fail_unbound";
      compat: {
        additiveOnly: boolean;
        missingProperties: string[];
        conflictingProperties: string[];
        matchedProperties: string[];
      };
      notes: string[];
    }
  >;
};

type ObservedStateEntry = {
  filePath: string;
  observedAt: string | null;
  contentHash: string;
  payload: unknown;
};

type ReportArtifactStatus = {
  path: string;
  exists: boolean;
  timestamp: string | null;
  timestampSource: "frontmatter" | "filename" | null;
  contentHash: string | null;
};

export type ReportInventoryEntry = {
  automationId: AutomationId;
  latest: ReportArtifactStatus;
  datedReports: ReportArtifactStatus[];
  artifactPresence: Record<ArtifactKey, boolean>;
};

export type DryRunDiffSurfaceStatus = {
  status: "missing" | "current" | "conflict";
  currentDiffHash: string | null;
  currentPacketKeys: string[];
  conflictKeys: string[];
  evidenceSource: "none" | "report_artifact" | "runtime_observed";
  invalidPacketCount: number;
  reasons: string[];
};

export type GatePacketProjection = {
  packetKey: string;
  surface: OperationalSurface;
  syncKey: string;
  sourceReportId: string;
  lastVerifiedAt: string;
  packetLifecycle: PacketLifecycleState;
  diffHash: string;
  dedupeKey: string;
  evidenceSource: "report_artifact" | "runtime_observed";
  targetBindingStatus: "passed" | "blocked_by_target_binding";
  supersessionStatus: "passed" | "blocked_by_packet_supersession";
  promotionStatus: string;
  approvalStatus: string;
  status: "eligible" | "blocked";
  reasons: string[];
};

export type GateEligibilitySnapshot = {
  schemaVersion: number;
  evaluatedAt: string;
  sourceHashes: {
    runtimeMaturity: string;
    notionSurfaceLock: string;
    notionWritebackPromotion: string;
    manualApprovals: string;
    checkWaivers: string;
    openDecisionsLegacyBridge: string;
    observedState: string;
    executionRuns: string;
    reportInventory: string;
    dryRunReportEvidence: string;
    dryRunObservedEvidence: string;
  };
  feederStatus: Record<
    AutomationId,
    {
      status: "pass" | "blocked_by_missing_artifacts" | "blocked_by_freshness";
      maxAgeHours: number;
      latestReportAgeHours: number | null;
      missingArtifacts: ArtifactKey[];
      waivedBy: string[];
    }
  >;
  dependencyStatus: Record<AutomationId, Record<AutomationId, DependencyGateStatus>>;
  notionAudit: Record<
    OperationalSurface,
    {
      auditOutcome: NotionAuditOutcome;
      targetBindingPassed: boolean;
      targetResolutionLifecycle: string;
    }
  >;
  promotionStatus: Record<
    OperationalSurface,
    {
      currentState: string;
      matchedApprovalIds: string[];
      promotionBindingStatus:
        | "not_required"
        | "matched"
        | "missing"
        | "target_mismatch"
        | "contract_mismatch"
        | "diff_mismatch";
      approvalStatus:
        | "not_required"
        | "missing"
        | "matched"
        | "expired"
        | "contract_mismatch"
        | "diff_mismatch"
        | "target_mismatch";
      currentContractHash: string;
      currentContractVersion: string;
      currentDiffHash: string | null;
    }
  >;
  dryRunDiffStatus: Record<OperationalSurface, DryRunDiffSurfaceStatus>;
  invalidDryRunPackets: InvalidDryRunDiffPacket[];
  eligibility: {
    synthesis: {
      status: "eligible" | "blocked";
      reasons: string[];
      automationIds: AutomationId[];
    };
    directorDryRun: {
      status: "eligible" | "blocked";
      reasons: string[];
    };
    directorLiveWrite: {
      status: "eligible" | "blocked";
      reasons: string[];
      enabledSurfaces: OperationalSurface[];
    };
    executor: {
      status: "eligible" | "blocked";
      reasons: string[];
      blockingDedupeKeys: string[];
      subGates: {
        freshness: "passed" | "blocked";
        writebackPromotion: "passed" | "blocked";
        readyPacketObserved: "passed" | "blocked";
        eligiblePacketPresent: "passed" | "blocked";
        executorLane: "passed" | "blocked";
      };
      eligiblePackets: GatePacketProjection[];
      blockedPackets: GatePacketProjection[];
    };
  };
  projectionHash: string;
};

export function getTrackedStatePaths(repoRoot: string) {
  return {
    runtimeMaturity: path.join(repoRoot, REPO_RUNTIME_MANIFEST.runtimeMaturityPath),
    notionWritebackPromotion: path.join(
      repoRoot,
      REPO_RUNTIME_MANIFEST.notionWritebackPromotionPath
    ),
    manualApprovals: path.join(repoRoot, REPO_RUNTIME_MANIFEST.manualApprovalsPath),
    openDecisionsLegacyBridge: path.join(
      repoRoot,
      REPO_RUNTIME_MANIFEST.openDecisionsLegacyBridgePath
    ),
    notionSurfaceLock: path.join(repoRoot, REPO_RUNTIME_MANIFEST.notionSurfaceLockPath),
    checkWaivers: path.join(repoRoot, REPO_RUNTIME_MANIFEST.checkWaiversPath),
    gateEligibilitySnapshot: path.join(
      repoRoot,
      REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath
    )
  };
}

async function walkJsonFiles(root: string): Promise<string[]> {
  if (!(await exists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(target)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(target);
    }
  }
  return files.sort(compareStrings);
}

function toHoursDifference(laterIso: string, earlierIso: string | null): number | null {
  if (!earlierIso) return null;
  const later = parseIsoToMs(laterIso);
  const earlier = parseIsoToMs(earlierIso);
  if (later === null || earlier === null) return null;
  return Number(((later - earlier) / (1000 * 60 * 60)).toFixed(2));
}

function extractFrontmatterTimestamp(text: string): string | null {
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (!frontmatter) return null;

  for (const key of [
    "lastVerifiedAt",
    "observedAt",
    "generatedAt",
    "reportedAt",
    "reportDate",
    "updatedAt",
    "date"
  ]) {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?\\s*$`, "m"));
    const normalized = normalizeIso(match?.[1]?.trim());
    if (normalized) return normalized;
  }

  return null;
}

function extractTimestampFromFilename(filePath: string): string | null {
  const basename = path.basename(filePath, path.extname(filePath));
  const match = basename.match(
    /(\d{4}-\d{2}-\d{2})(?:[T_ -](\d{2})[-:]?(\d{2})(?:[-:]?(\d{2}))?)?/
  );
  if (!match) return null;

  const [, datePart, hour = "00", minute = "00", second = "00"] = match;
  return normalizeIso(`${datePart}T${hour}:${minute}:${second}.000Z`);
}

async function getDeterministicMarkdownMetadata(
  filePath: string
): Promise<{
  timestamp: string | null;
  timestampSource: "frontmatter" | "filename" | null;
  contentHash: string | null;
}> {
  if (!(await exists(filePath))) {
    return { timestamp: null, timestampSource: null, contentHash: null };
  }

  const text = await readFile(filePath, "utf8");
  const contentHash = hashValue(text);
  const frontmatterTimestamp = extractFrontmatterTimestamp(text);
  if (frontmatterTimestamp) {
    return { timestamp: frontmatterTimestamp, timestampSource: "frontmatter", contentHash };
  }

  const filenameTimestamp = extractTimestampFromFilename(filePath);
  if (filenameTimestamp) {
    return { timestamp: filenameTimestamp, timestampSource: "filename", contentHash };
  }

  return { timestamp: null, timestampSource: null, contentHash };
}

function hasActiveWaiver(
  waivers: CheckWaiver[],
  checkId: string,
  automationId: AutomationId,
  evaluatedAt: string
): string[] {
  const evaluatedAtMs = parseIsoToMs(evaluatedAt);
  if (evaluatedAtMs === null) return [];
  return waivers
    .filter((waiver) => {
      if (!waiver.affectedChecks.includes(checkId)) return false;
      if (!waiver.affectedAutomationIds.includes(automationId)) return false;
      const waiverExpiresAtMs = parseIsoToMs(waiver.expiresAt);
      if (waiverExpiresAtMs === null) return false;
      return waiverExpiresAtMs >= evaluatedAtMs;
    })
    .map((waiver) => waiver.waiverId)
    .sort(compareStrings);
}

async function collectObservedState(repoRoot: string): Promise<ObservedStateEntry[]> {
  const observedRoot = path.join(repoRoot, REPO_RUNTIME_MANIFEST.runtimeObservedRoot);
  const files = await walkJsonFiles(observedRoot);
  const entries: ObservedStateEntry[] = [];

  for (const filePath of files) {
    const payload = await readJsonFile<unknown>(filePath);
    const payloadRecord =
      typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : null;
    const observedAt = normalizeIso(
      typeof payloadRecord?.observedAt === "string"
        ? payloadRecord.observedAt
        : typeof payloadRecord?.lastVerifiedAt === "string"
          ? payloadRecord.lastVerifiedAt
          : null
    );

    entries.push({
      filePath,
      observedAt,
      contentHash: hashValue(payload),
      payload
    });
  }

  return entries;
}

async function collectDirectorDryRunReportEntries(repoRoot: string): Promise<DryRunEvidenceEntry[]> {
  const directorReportRoot = path.join(
    repoRoot,
    REPO_RUNTIME_MANIFEST.runtimeReportsRoot,
    "ah-notion-sync-director"
  );
  const files = await walkJsonFiles(directorReportRoot);
  const entries: DryRunEvidenceEntry[] = [];

  for (const filePath of files) {
    const payload = await readJsonFile<unknown>(filePath);
    entries.push({
      filePath,
      contentHash: hashValue(payload),
      payload,
      evidenceSource: "report_artifact"
    });
  }

  return entries;
}

type DryRunDiffPacket = {
  packetKey: string;
  surface: OperationalSurface;
  syncKey: string;
  sourceReportId: string;
  lastVerifiedAt: string;
  packetLifecycle: PacketLifecycleState;
  diffHash: string;
  dedupeKey: string;
  supersedesPacketKey: string | null;
  supersededByPacketKey: string | null;
  supersessionReason: string | null;
  filePath: string;
  contentHash: string;
  evidenceSource: "report_artifact" | "runtime_observed";
};

type InvalidDryRunDiffPacket = {
  filePath: string;
  evidenceSource: "report_artifact" | "runtime_observed";
  surface: OperationalSurface | null;
  packetHint: string;
  reason: string;
};

type DryRunDiffProjection = {
  currentDiffHashes: Record<OperationalSurface, string | null>;
  surfaceStatus: Record<OperationalSurface, DryRunDiffSurfaceStatus>;
  currentPackets: DryRunDiffPacket[];
  invalidPackets: InvalidDryRunDiffPacket[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseOperationalSurface(value: unknown): OperationalSurface | null {
  return typeof value === "string" && OPERATIONAL_SURFACES.includes(value as OperationalSurface)
    ? (value as OperationalSurface)
    : null;
}

function parsePacketLifecycle(value: unknown): PacketLifecycleState | null {
  return typeof value === "string" && PACKET_LIFECYCLE_STATES.includes(value as PacketLifecycleState)
    ? (value as PacketLifecycleState)
    : null;
}

type DryRunEvidenceEntry = {
  filePath: string;
  contentHash: string;
  payload: unknown;
  evidenceSource: "report_artifact" | "runtime_observed";
};

function collectDryRunDiffPackets(evidenceEntries: DryRunEvidenceEntry[]): {
  packets: DryRunDiffPacket[];
  invalidPackets: InvalidDryRunDiffPacket[];
} {
  const packets: DryRunDiffPacket[] = [];
  const invalidPackets: InvalidDryRunDiffPacket[] = [];

  for (const entry of evidenceEntries) {
    const payload = asRecord(entry.payload);
    if (!payload || payload.kind !== "notion_dry_run_diff") continue;

    const candidatePackets = Array.isArray(payload.packets)
      ? payload.packets
      : Array.isArray(payload.preparedUpdates)
        ? payload.preparedUpdates
        : [payload];

    for (const candidate of candidatePackets) {
      const packet = asRecord(candidate);
      if (!packet) {
        invalidPackets.push({
          filePath: entry.filePath,
          evidenceSource: entry.evidenceSource,
          surface: parseOperationalSurface(payload.surface),
          packetHint: "non-object-candidate",
          reason: "malformed_packet_candidate"
        });
        continue;
      }

      const surface = parseOperationalSurface(packet.surface ?? packet.notionSurface ?? payload.surface);
      const syncKey = typeof packet.syncKey === "string" ? packet.syncKey : null;
      const sourceReportId =
        typeof packet.sourceReportId === "string"
          ? packet.sourceReportId
          : typeof payload.sourceReportId === "string"
            ? payload.sourceReportId
            : null;
      const lastVerifiedAt = normalizeIso(
        typeof packet.lastVerifiedAt === "string"
          ? packet.lastVerifiedAt
          : typeof payload.lastVerifiedAt === "string"
            ? payload.lastVerifiedAt
            : null
      );
      const packetLifecycle = parsePacketLifecycle(packet.packetLifecycle ?? payload.packetLifecycle);

      const missingFields: string[] = [];
      if (!surface) missingFields.push("surface");
      if (!syncKey) missingFields.push("syncKey");
      if (!sourceReportId) missingFields.push("sourceReportId");
      if (!lastVerifiedAt) missingFields.push("lastVerifiedAt");
      if (!packetLifecycle) missingFields.push("packetLifecycle");
      const providedPacketKey =
        typeof packet.packetKey === "string"
          ? packet.packetKey
          : typeof payload.packetKey === "string"
            ? payload.packetKey
            : null;
      const providedDedupeKey =
        typeof packet.dedupeKey === "string"
          ? packet.dedupeKey
          : typeof payload.dedupeKey === "string"
            ? payload.dedupeKey
            : null;
      if (!providedPacketKey) missingFields.push("packetKey");
      if (!providedDedupeKey) missingFields.push("dedupeKey");

      const packetHint = [
        surface ?? "unknown-surface",
        syncKey ?? "unknown-syncKey",
        sourceReportId ?? "unknown-sourceReportId"
      ].join(":");

      if (missingFields.length > 0) {
        invalidPackets.push({
          filePath: entry.filePath,
          evidenceSource: entry.evidenceSource,
          surface,
          packetHint,
          reason: `missing_required_fields:${missingFields.join(",")}`
        });
        continue;
      }

      const diffHash =
        typeof packet.diffHash === "string"
          ? packet.diffHash
          : typeof payload.diffHash === "string"
            ? payload.diffHash
            : null;
      if (!diffHash) {
        invalidPackets.push({
          filePath: entry.filePath,
          evidenceSource: entry.evidenceSource,
          surface,
          packetHint,
          reason: "missing_required_fields:diffHash"
        });
        continue;
      }
      const supersedesPacketKey =
        typeof packet.supersedesPacketKey === "string" ? packet.supersedesPacketKey : null;
      const supersededByPacketKey =
        typeof packet.supersededByPacketKey === "string" ? packet.supersededByPacketKey : null;
      const supersessionReason =
        typeof packet.supersessionReason === "string" ? packet.supersessionReason : null;
      const requiredSurface = surface as OperationalSurface;
      const requiredSyncKey = syncKey as string;
      const requiredSourceReportId = sourceReportId as string;
      const requiredLastVerifiedAt = lastVerifiedAt as string;
      const requiredPacketLifecycle = packetLifecycle as PacketLifecycleState;
      const canonicalPacketKey = derivePacketKey({
        surface: requiredSurface,
        syncKey: requiredSyncKey,
        sourceReportId: requiredSourceReportId,
        lastVerifiedAt: requiredLastVerifiedAt,
        diffHash
      });
      const canonicalDedupeKey = derivePacketDedupeKey({
        surface: requiredSurface,
        syncKey: requiredSyncKey
      });

      if (providedPacketKey !== canonicalPacketKey) {
        invalidPackets.push({
          filePath: entry.filePath,
          evidenceSource: entry.evidenceSource,
          surface,
          packetHint,
          reason: "packet_key_mismatch"
        });
        continue;
      }
      if (providedDedupeKey !== canonicalDedupeKey) {
        invalidPackets.push({
          filePath: entry.filePath,
          evidenceSource: entry.evidenceSource,
          surface,
          packetHint,
          reason: "dedupe_key_mismatch"
        });
        continue;
      }

      packets.push({
        packetKey: canonicalPacketKey,
        surface: requiredSurface,
        syncKey: requiredSyncKey,
        sourceReportId: requiredSourceReportId,
        lastVerifiedAt: requiredLastVerifiedAt,
        packetLifecycle: requiredPacketLifecycle,
        diffHash,
        dedupeKey: canonicalDedupeKey,
        supersedesPacketKey,
        supersededByPacketKey,
        supersessionReason,
        filePath: entry.filePath,
        contentHash: entry.contentHash,
        evidenceSource: entry.evidenceSource
      });
    }
  }

  return {
    packets: packets.sort((left, right) => compareStrings(left.packetKey, right.packetKey)),
    invalidPackets: invalidPackets.sort((left, right) =>
      compareStrings(
        `${left.surface ?? "none"}:${left.packetHint}:${left.filePath}`,
        `${right.surface ?? "none"}:${right.packetHint}:${right.filePath}`
      )
    )
  };
}

function deriveCurrentDiffProjection(evidenceEntries: DryRunEvidenceEntry[]): DryRunDiffProjection {
  const { packets, invalidPackets } = collectDryRunDiffPackets(evidenceEntries);
  const surfaceStatus = {} as Record<OperationalSurface, DryRunDiffSurfaceStatus>;
  for (const surface of OPERATIONAL_SURFACES) {
    const invalidPacketCount = invalidPackets.filter((packet) => packet.surface === surface).length;
    const reasons = ["blocked_by_missing_dry_run_diff"];
    if (invalidPacketCount > 0) {
      reasons.push(`blocked_by_invalid_dry_run_packet:${invalidPacketCount}`);
    }
    surfaceStatus[surface] = {
      status: "missing",
      currentDiffHash: null,
      currentPacketKeys: [],
      conflictKeys: [],
      evidenceSource: "none",
      invalidPacketCount,
      reasons
    };
  }
  const currentDiffHashes = Object.fromEntries(
    OPERATIONAL_SURFACES.map((surface) => [surface, null])
  ) as Record<OperationalSurface, string | null>;

  const groups = new Map<string, DryRunDiffPacket[]>();
  for (const packet of packets) {
    const key = `${packet.surface}:${packet.syncKey}`;
    groups.set(key, [...(groups.get(key) ?? []), packet]);
  }

  const currentPackets: DryRunDiffPacket[] = [];
  const conflictKeysBySurface = new Map<OperationalSurface, string[]>();
  const conflictReasonsBySurface = new Map<OperationalSurface, string[]>();
  const recordConflict = (surface: OperationalSurface, key: string, reason: string) => {
    conflictKeysBySurface.set(surface, [...(conflictKeysBySurface.get(surface) ?? []), key]);
    conflictReasonsBySurface.set(surface, [...(conflictReasonsBySurface.get(surface) ?? []), reason]);
  };

  for (const [groupKey, groupPackets] of groups) {
    const sorted = groupPackets
      .slice()
      .sort((left, right) =>
        compareStrings(
          `${parseIsoToMs(right.lastVerifiedAt) ?? 0}:${right.diffHash}`,
          `${parseIsoToMs(left.lastVerifiedAt) ?? 0}:${left.diffHash}`
        )
      );
    const latestAt = sorted[0]?.lastVerifiedAt;
    if (!latestAt) continue;

    const latestPackets = sorted.filter((packet) => packet.lastVerifiedAt === latestAt);
    const surface = latestPackets[0]?.surface;
    if (!surface) continue;

    const supersededKeys = new Set<string>();
    for (const packet of latestPackets) {
      if (packet.supersedesPacketKey) supersededKeys.add(packet.supersedesPacketKey);
      if (packet.supersededByPacketKey) supersededKeys.add(packet.packetKey);
      if (packet.packetLifecycle === "superseded" || packet.packetLifecycle === "stale") {
        supersededKeys.add(packet.packetKey);
      }
    }

    const activeReadyPackets = latestPackets.filter(
      (packet) =>
        packet.packetLifecycle === "ready_for_sync" && !supersededKeys.has(packet.packetKey)
    );
    const activeReadyDiffHashes = new Set(activeReadyPackets.map((packet) => packet.diffHash));

    if (activeReadyPackets.length === 0) {
      if (latestPackets.some((packet) => packet.packetLifecycle === "ready_for_sync")) {
        recordConflict(surface, groupKey, "blocked_by_packet_supersession");
      }
      continue;
    }

    if (activeReadyPackets.length > 1) {
      recordConflict(surface, groupKey, "blocked_by_multiple_current_packets_for_sync_key");
    }
    if (activeReadyDiffHashes.size > 1) {
      recordConflict(surface, groupKey, "blocked_by_multiple_current_dry_run_diffs");
    }
    if (activeReadyPackets.length > 1 || activeReadyDiffHashes.size > 1) {
      continue;
    }

    currentPackets.push(activeReadyPackets[0]);
  }

  for (const surface of OPERATIONAL_SURFACES) {
    const invalidPacketCount = invalidPackets.filter((packet) => packet.surface === surface).length;
    const surfaceCurrentPackets = currentPackets
      .filter((packet) => packet.surface === surface)
      .sort((left, right) => compareStrings(left.packetKey, right.packetKey));
    const conflictKeys = (conflictKeysBySurface.get(surface) ?? []).sort(compareStrings);
    const conflictReasons = [...new Set(conflictReasonsBySurface.get(surface) ?? [])].sort(compareStrings);

    if (conflictKeys.length > 0) {
      const reasons = conflictReasons.length > 0 ? conflictReasons : ["blocked_by_diff_conflict"];
      if (invalidPacketCount > 0) {
        reasons.push(`blocked_by_invalid_dry_run_packet:${invalidPacketCount}`);
      }
      surfaceStatus[surface] = {
        status: "conflict",
        currentDiffHash: null,
        currentPacketKeys: surfaceCurrentPackets.map((packet) => packet.packetKey),
        conflictKeys,
        evidenceSource: surfaceCurrentPackets[0]?.evidenceSource ?? "none",
        invalidPacketCount,
        reasons: [...new Set(reasons)].sort(compareStrings)
      };
      continue;
    }

    if (surfaceCurrentPackets.length === 0) {
      if (invalidPacketCount > 0) {
        surfaceStatus[surface] = {
          ...surfaceStatus[surface],
          invalidPacketCount,
          reasons: [...surfaceStatus[surface].reasons, `blocked_by_invalid_dry_run_packet:${invalidPacketCount}`]
        };
      }
      continue;
    }

    const readyPackets = surfaceCurrentPackets.filter(
      (packet) => packet.packetLifecycle === "ready_for_sync"
    );
    const uniqueDiffHashes = new Set(readyPackets.map((packet) => packet.diffHash));
    const currentDiffHash = uniqueDiffHashes.size === 1 ? [...uniqueDiffHashes][0] : null;
    const evidenceSource = surfaceCurrentPackets[0]?.evidenceSource ?? "none";
    currentDiffHashes[surface] = currentDiffHash;
    const reasons = currentDiffHash
      ? []
      : readyPackets.length === 0
        ? ["blocked_by_no_ready_dry_run_diff"]
        : ["blocked_by_multiple_current_dry_run_diffs"];
    if (invalidPacketCount > 0) {
      reasons.push(`blocked_by_invalid_dry_run_packet:${invalidPacketCount}`);
    }
    if (evidenceSource === "runtime_observed") {
      reasons.push("blocked_by_unreplayable_dry_run_diff_source");
    }
    surfaceStatus[surface] = {
      status: "current",
      currentDiffHash,
      currentPacketKeys: surfaceCurrentPackets.map((packet) => packet.packetKey),
      conflictKeys: [],
      evidenceSource,
      invalidPacketCount,
      reasons: [...new Set(reasons)].sort(compareStrings)
    };
  }

  return {
    currentDiffHashes,
    surfaceStatus,
    currentPackets: currentPackets.sort((left, right) => compareStrings(left.packetKey, right.packetKey)),
    invalidPackets
  };
}

type ExecutionRunEntry = Record<string, unknown> & {
  __filePath: string;
  __contentHash: string;
};

async function collectExecutionRunEntries(repoRoot: string): Promise<ExecutionRunEntry[]> {
  const executionRoot = path.join(repoRoot, REPO_RUNTIME_MANIFEST.executionRunsRoot);
  const files = await walkJsonFiles(executionRoot);
  const entries: ExecutionRunEntry[] = [];

  for (const filePath of files) {
    const payload = await readJsonFile<Record<string, unknown>>(filePath);
    entries.push({
      ...payload,
      __filePath: path.relative(repoRoot, filePath),
      __contentHash: hashValue(payload)
    });
  }

  return entries;
}

async function collectReportInventory(
  repoRoot: string,
  options: { includeVolatileState: boolean }
): Promise<Record<AutomationId, ReportInventoryEntry>> {
  const inventory = {} as Record<AutomationId, ReportInventoryEntry>;
  const gateSnapshotExists = await exists(
    path.join(repoRoot, REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath)
  );
  const hasExecutionRunJson = options.includeVolatileState
    ? (await walkJsonFiles(path.join(repoRoot, REPO_RUNTIME_MANIFEST.executionRunsRoot))).length > 0
    : false;

  for (const automation of AUTOMATION_REGISTRY) {
    const automationRoot = path.join(
      repoRoot,
      REPO_RUNTIME_MANIFEST.runtimeReportsRoot,
      automation.id
    );
    const latestPath = path.join(automationRoot, "latest.md");
    const latestExists = options.includeVolatileState ? await exists(latestPath) : false;
    const datedReports: ReportArtifactStatus[] = [];
    let hasDryRunDiffJson = false;

    if (options.includeVolatileState && (await exists(automationRoot))) {
      const entries = await readdir(automationRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (entry.name === "latest.md") continue;
        const filePath = path.join(automationRoot, entry.name);
        if (entry.name.endsWith(".md")) {
          const metadata = await getDeterministicMarkdownMetadata(filePath);
          datedReports.push({
            path: path.relative(repoRoot, filePath),
            exists: true,
            timestamp: metadata.timestamp,
            timestampSource: metadata.timestampSource,
            contentHash: metadata.contentHash
          });
          continue;
        }
        if (
          entry.name.endsWith(".json") &&
          (entry.name === "dry-run-diff.json" || /dry[-_ ]run/i.test(entry.name))
        ) {
          hasDryRunDiffJson = true;
        }
      }
    }

    datedReports.sort((left, right) => compareStrings(left.path, right.path));
    const latestMetadata = latestExists
      ? await getDeterministicMarkdownMetadata(latestPath)
      : null;

    inventory[automation.id] = {
      automationId: automation.id,
      latest: {
        path: path.relative(repoRoot, latestPath),
        exists: latestExists,
        timestamp: latestMetadata?.timestamp ?? null,
        timestampSource: latestMetadata?.timestampSource ?? null,
        contentHash: latestMetadata?.contentHash ?? null
      },
      datedReports,
      artifactPresence: {
        "latest-md": latestExists,
        "dated-report-md": datedReports.length > 0,
        "dry-run-diff-json":
          automation.id === "ah-notion-sync-director" ? hasDryRunDiffJson : false,
        "gate-eligibility-snapshot-json": gateSnapshotExists,
        "execution-run-json":
          automation.id === "ah-draft-pr-executor" ? hasExecutionRunJson : false
      }
    };
  }

  return inventory;
}

function reportMissingArtifacts(
  inventoryEntry: ReportInventoryEntry,
  requiredArtifacts: ArtifactKey[]
): ArtifactKey[] {
  const missing: ArtifactKey[] = [];
  for (const artifact of requiredArtifacts) {
    if (!inventoryEntry.artifactPresence[artifact]) {
      missing.push(artifact);
    }
  }
  return missing;
}

type DependencyGateStatus = {
  status: "pass" | "blocked_by_missing_artifacts" | "blocked_by_freshness";
  maxAgeHours: number;
  latestReportAgeHours: number | null;
  missingArtifacts: ArtifactKey[];
  waivedBy: string[];
};

function evaluateDependencyGate(input: {
  inventoryEntry: ReportInventoryEntry;
  requiredArtifacts: ArtifactKey[];
  maxAgeHours: number;
  waivers: CheckWaiver[];
  evaluatedAt: string;
  waiverCheckId: string;
  automationId: AutomationId;
}): DependencyGateStatus {
  const missingArtifacts = reportMissingArtifacts(input.inventoryEntry, input.requiredArtifacts);
  const waiverIds = hasActiveWaiver(
    input.waivers,
    input.waiverCheckId,
    input.automationId,
    input.evaluatedAt
  );
  const latestReportAgeHours = toHoursDifference(input.evaluatedAt, input.inventoryEntry.latest.timestamp);
  const missingDeterministicTimestamp =
    input.inventoryEntry.latest.exists && input.inventoryEntry.latest.timestamp === null;

  if (missingArtifacts.length > 0) {
    return {
      status: "blocked_by_missing_artifacts",
      maxAgeHours: input.maxAgeHours,
      latestReportAgeHours,
      missingArtifacts,
      waivedBy: waiverIds
    };
  }

  if (
    (missingDeterministicTimestamp ||
      latestReportAgeHours === null ||
      latestReportAgeHours > input.maxAgeHours) &&
    waiverIds.length === 0
  ) {
    return {
      status: "blocked_by_freshness",
      maxAgeHours: input.maxAgeHours,
      latestReportAgeHours,
      missingArtifacts: [],
      waivedBy: []
    };
  }

  return {
    status: "pass",
    maxAgeHours: input.maxAgeHours,
    latestReportAgeHours,
    missingArtifacts: [],
    waivedBy: waiverIds
  };
}

function evaluateApprovalStatus(input: {
  surface: OperationalSurface;
  approvalState: ManualApprovalState;
  surfaceLock:
    | NotionSurfaceLockState["operationalSurfaces"][OperationalSurface]
    | undefined;
  currentContractHash: string;
  currentContractVersion: string;
  currentDiffHash: string | null;
  evaluatedAt: string;
  writebackState:
    | "report_only"
    | "audit_passed_pending_enable"
    | "writeback_enabled"
    | "schema_drift_blocked"
    | "operator_disabled";
}): {
  approvalStatus:
    | "not_required"
    | "missing"
    | "matched"
    | "expired"
    | "contract_mismatch"
    | "diff_mismatch"
    | "target_mismatch";
  matchedApprovalIds: string[];
} {
  if (input.writebackState !== "writeback_enabled") {
    return {
      approvalStatus: "not_required",
      matchedApprovalIds: []
    };
  }

  const expectedTargetId = input.surfaceLock?.targetId ?? null;
  const expectedDataSourceId = input.surfaceLock?.dataSourceId ?? null;
  const approvals = input.approvalState.approvals.filter((approval) => approval.surface === input.surface);

  if (approvals.length === 0) {
    return {
      approvalStatus: "missing",
      matchedApprovalIds: []
    };
  }

  let sawExpired = false;
  let sawTargetMismatch = false;
  let sawContractMismatch = false;
  let sawDiffMismatch = false;

  const matchedApprovalIds = approvals
    .filter((approval) => {
      const approvalExpiresAtMs = parseIsoToMs(approval.expiresAt);
      const evaluatedAtMs = parseIsoToMs(input.evaluatedAt);
      if (
        approvalExpiresAtMs === null ||
        evaluatedAtMs === null ||
        approvalExpiresAtMs < evaluatedAtMs
      ) {
        sawExpired = true;
        return false;
      }
      if (
        approval.targetId !== expectedTargetId ||
        approval.dataSourceId !== expectedDataSourceId
      ) {
        sawTargetMismatch = true;
        return false;
      }
      if (!approval.contractHash || !approval.contractVersion) {
        sawContractMismatch = true;
        return false;
      }
      if (approval.contractHash !== input.currentContractHash) {
        sawContractMismatch = true;
        return false;
      }
      if (approval.contractVersion !== input.currentContractVersion) {
        sawContractMismatch = true;
        return false;
      }
      if (input.currentDiffHash === null || approval.diffHash !== input.currentDiffHash) {
        sawDiffMismatch = true;
        return false;
      }
      return true;
    })
    .map((approval) => approval.approvalId)
    .sort(compareStrings);

  if (matchedApprovalIds.length > 0) {
    return {
      approvalStatus: "matched",
      matchedApprovalIds
    };
  }

  if (sawExpired) return { approvalStatus: "expired", matchedApprovalIds: [] };
  if (sawTargetMismatch) return { approvalStatus: "target_mismatch", matchedApprovalIds: [] };
  if (sawContractMismatch) {
    return { approvalStatus: "contract_mismatch", matchedApprovalIds: [] };
  }
  if (sawDiffMismatch) return { approvalStatus: "diff_mismatch", matchedApprovalIds: [] };

  return { approvalStatus: "missing", matchedApprovalIds: [] };
}

function evaluatePromotionBindingStatus(input: {
  promotionState: NotionWritebackPromotionState["surfaces"][OperationalSurface];
  surfaceLock:
    | NotionSurfaceLockState["operationalSurfaces"][OperationalSurface]
    | undefined;
  currentContractHash: string;
  currentContractVersion: string;
  currentDiffHash: string | null;
}):
  | "not_required"
  | "matched"
  | "missing"
  | "target_mismatch"
  | "contract_mismatch"
  | "diff_mismatch" {
  if (input.promotionState.currentState !== "writeback_enabled") {
    return "not_required";
  }

  const surfaceLock = input.surfaceLock;
  if (!surfaceLock) {
    return "target_mismatch";
  }

  if (
    input.promotionState.targetId !== surfaceLock.targetId ||
    input.promotionState.dataSourceId !== surfaceLock.dataSourceId
  ) {
    return "target_mismatch";
  }

  if (!input.promotionState.requiredContractHash || !input.promotionState.requiredContractVersion) {
    return "missing";
  }

  if (
    input.promotionState.requiredContractHash !== null &&
    input.promotionState.requiredContractHash !== input.currentContractHash
  ) {
    return "contract_mismatch";
  }

  if (
    input.promotionState.requiredContractVersion !== null &&
    input.promotionState.requiredContractVersion !== input.currentContractVersion
  ) {
    return "contract_mismatch";
  }

  if (!input.currentDiffHash || !input.promotionState.requiredDiffHash) {
    return "missing";
  }

  if (input.promotionState.requiredDiffHash !== input.currentDiffHash) {
    return "diff_mismatch";
  }

  return "matched";
}

export async function loadTrackedRuntimeState(repoRoot: string) {
  const paths = getTrackedStatePaths(repoRoot);
  return {
    runtimeMaturity: await readJsonFile<RuntimeMaturityState>(paths.runtimeMaturity),
    notionWritebackPromotion: await readJsonFile<NotionWritebackPromotionState>(
      paths.notionWritebackPromotion
    ),
    manualApprovals: await readJsonFile<ManualApprovalState>(paths.manualApprovals),
    openDecisionsLegacyBridge: await readJsonFile<OpenDecisionsLegacyBridgeState>(
      paths.openDecisionsLegacyBridge
    ),
    notionSurfaceLock: await readJsonFile<NotionSurfaceLockState>(paths.notionSurfaceLock),
    checkWaivers: await readJsonFile<CheckWaiverState>(paths.checkWaivers),
    gateEligibilitySnapshot: await readOptionalJsonFile<GateEligibilitySnapshot>(
      paths.gateEligibilitySnapshot
    )
  };
}

export async function computeGateEligibilitySnapshot(
  repoRoot: string,
  options: GateEligibilitySnapshotOptions = {}
): Promise<GateEligibilitySnapshot> {
  const includeVolatileState = options.includeVolatileState ?? true;
  const tracked = await loadTrackedRuntimeState(repoRoot);
  const reportInventory = await collectReportInventory(repoRoot, { includeVolatileState });
  const observedEntries = includeVolatileState ? await collectObservedState(repoRoot) : [];
  const reportDryRunEntries = includeVolatileState
    ? await collectDirectorDryRunReportEntries(repoRoot)
    : [];
  const executionRuns = includeVolatileState ? await collectExecutionRunEntries(repoRoot) : [];
  const dryRunDiffProjection = deriveCurrentDiffProjection(reportDryRunEntries);
  const observedDryRunProjection = deriveCurrentDiffProjection(
    observedEntries.map((entry) => ({
      filePath: entry.filePath,
      contentHash: entry.contentHash,
      payload: entry.payload,
      evidenceSource: "runtime_observed" as const
    }))
  );
  const currentDiffHashes = dryRunDiffProjection.currentDiffHashes;

  for (const surface of OPERATIONAL_SURFACES) {
    const authoritativeStatus = dryRunDiffProjection.surfaceStatus[surface];
    const observedStatus = observedDryRunProjection.surfaceStatus[surface];
    if (authoritativeStatus.status !== "missing") continue;
    if (observedStatus.status === "missing") continue;
    authoritativeStatus.reasons = [
      ...authoritativeStatus.reasons,
      "blocked_by_unreplayable_dry_run_diff_source"
    ].sort(compareStrings);
  }

  const evaluationCandidates: Array<string | null> = [
    tracked.runtimeMaturity.updatedAt,
    tracked.notionSurfaceLock.auditedAt,
    tracked.notionWritebackPromotion.updatedAt,
    tracked.manualApprovals.approvals.map((approval) => approval.approvedAt).sort(compareStrings).at(-1) ??
      null,
    tracked.checkWaivers.waivers.map((waiver) => waiver.approvedAt).sort(compareStrings).at(-1) ?? null,
    tracked.openDecisionsLegacyBridge.updatedAt,
    ...Object.values(reportInventory).flatMap((entry) => [
      entry.latest.timestamp,
      ...entry.datedReports.map((report) => report.timestamp)
    ]),
    ...observedEntries.map((entry) => entry.observedAt),
    ...executionRuns.map((entry) =>
      typeof entry.observedAt === "string" ? entry.observedAt : null
    )
  ];

  const evaluatedAt =
    latestIso(evaluationCandidates) ?? tracked.runtimeMaturity.updatedAt;

  const feederStatus = {} as GateEligibilitySnapshot["feederStatus"];

  for (const feeder of tracked.runtimeMaturity.requiredFeeders) {
    const inventoryEntry = reportInventory[feeder.automationId];
    feederStatus[feeder.automationId] = evaluateDependencyGate({
      inventoryEntry,
      requiredArtifacts: feeder.requiredArtifacts,
      maxAgeHours: feeder.maxAgeHours,
      waivers: tracked.checkWaivers.waivers,
      evaluatedAt,
      waiverCheckId: `freshness:${feeder.automationId}`,
      automationId: feeder.automationId
    });
  }

  const dependencyStatus = {} as GateEligibilitySnapshot["dependencyStatus"];
  for (const automation of AUTOMATION_REGISTRY) {
    if (automation.requiredUpstreams.length === 0) continue;
    dependencyStatus[automation.id] = {} as Record<AutomationId, DependencyGateStatus>;
    for (const requirement of automation.requiredUpstreams) {
      const inventoryEntry = reportInventory[requirement.automationId];
      dependencyStatus[automation.id][requirement.automationId] = evaluateDependencyGate({
        inventoryEntry,
        requiredArtifacts: requirement.requiredArtifacts,
        maxAgeHours: requirement.maxAgeHours,
        waivers: tracked.checkWaivers.waivers,
        evaluatedAt,
        waiverCheckId: `freshness:${requirement.automationId}`,
        automationId: automation.id
      });
    }
  }

  const failingFeeders = Object.entries(feederStatus)
    .filter(([, status]) => status.status !== "pass")
    .map(([automationId]) => automationId)
    .sort(compareStrings);
  const feederFreshnessBlocked = failingFeeders.length > 0;

  const dependencyFailuresByAutomation = new Map<AutomationId, string[]>();
  for (const automation of AUTOMATION_REGISTRY) {
    if (automation.requiredUpstreams.length === 0) continue;
    const blockedUpstreams = automation.requiredUpstreams
      .filter((requirement) => {
        const gate = dependencyStatus[automation.id]?.[requirement.automationId];
        return gate?.status !== "pass";
      })
      .map((requirement) => requirement.automationId)
      .sort(compareStrings);
    dependencyFailuresByAutomation.set(automation.id, blockedUpstreams);
  }

  const synthesisAutomationIds = AUTOMATION_REGISTRY.filter(
    (automation) => automation.role === "synthesis"
  ).map((automation) => automation.id);
  const blockedSynthesisAutomations = synthesisAutomationIds
    .filter((automationId) => (dependencyFailuresByAutomation.get(automationId)?.length ?? 0) > 0)
    .sort(compareStrings);

  const directorAutomationId = AUTOMATION_REGISTRY.find((automation) => automation.role === "director")?.id;
  const directorUpstreamFailures = directorAutomationId
    ? dependencyFailuresByAutomation.get(directorAutomationId) ?? []
    : [];
  const executorAutomationId = AUTOMATION_REGISTRY.find((automation) => automation.role === "executor")?.id;
  const executorUpstreamFailures = executorAutomationId
    ? dependencyFailuresByAutomation.get(executorAutomationId) ?? []
    : [];

  const synthesisReasons = blockedSynthesisAutomations.length
    ? [`blocked_by_freshness:${blockedSynthesisAutomations.join(",")}`]
    : [];
  const directorDryRunReasons = directorUpstreamFailures.length
    ? [`blocked_by_freshness:${directorUpstreamFailures.join(",")}`]
    : feederFreshnessBlocked
      ? [`blocked_by_freshness:${failingFeeders.join(",")}`]
      : [];

  const notionAudit = {} as GateEligibilitySnapshot["notionAudit"];
  for (const surface of OPERATIONAL_SURFACES) {
    const lock = tracked.notionSurfaceLock.operationalSurfaces[surface];
    notionAudit[surface] = {
      auditOutcome: lock.auditOutcome,
      targetBindingPassed:
        Boolean(lock.targetId || lock.dataSourceId) && lock.auditOutcome === "confirmed",
      targetResolutionLifecycle: lock.targetResolutionLifecycle
    };
  }

  const promotionStatus = {} as GateEligibilitySnapshot["promotionStatus"];
  for (const surface of OPERATIONAL_SURFACES) {
    const surfacePromotion = tracked.notionWritebackPromotion.surfaces[surface];
    const currentContractHash = getOperationalSurfaceContractHash(surface);
    const currentContractVersion = getOperationalSurfaceContractVersion(surface);
    const promotionBindingStatus = evaluatePromotionBindingStatus({
      promotionState: surfacePromotion,
      surfaceLock: tracked.notionSurfaceLock.operationalSurfaces[surface],
      currentContractHash,
      currentContractVersion,
      currentDiffHash: currentDiffHashes[surface]
    });
    const approvalResult = evaluateApprovalStatus({
      surface,
      approvalState: tracked.manualApprovals,
      surfaceLock: tracked.notionSurfaceLock.operationalSurfaces[surface],
      currentContractHash,
      currentContractVersion,
      currentDiffHash: currentDiffHashes[surface],
      evaluatedAt,
      writebackState: surfacePromotion.currentState
    });

    promotionStatus[surface] = {
      currentState: surfacePromotion.currentState,
      matchedApprovalIds: approvalResult.matchedApprovalIds,
      promotionBindingStatus,
      approvalStatus: approvalResult.approvalStatus,
      currentContractHash,
      currentContractVersion,
      currentDiffHash: currentDiffHashes[surface]
    };
  }


  const liveWriteEnabledSurfaces = OPERATIONAL_SURFACES.filter((surface) => {
    const promotion = promotionStatus[surface];
    const audit = notionAudit[surface];
    return (
      promotion.currentState === "writeback_enabled" &&
      promotion.promotionBindingStatus === "matched" &&
      promotion.approvalStatus === "matched" &&
      Boolean(promotion.currentDiffHash) &&
      audit.auditOutcome === "confirmed" &&
      audit.targetBindingPassed
    );
  });

  const directorLiveWriteReasons: string[] = [];
  if (directorUpstreamFailures.length > 0) {
    directorLiveWriteReasons.push(`blocked_by_freshness:${directorUpstreamFailures.join(",")}`);
  } else if (feederFreshnessBlocked) {
    directorLiveWriteReasons.push(`blocked_by_freshness:${failingFeeders.join(",")}`);
  }
  const diffConflictSurfaces = OPERATIONAL_SURFACES.filter(
    (surface) => dryRunDiffProjection.surfaceStatus[surface].status === "conflict"
  );
  if (diffConflictSurfaces.length > 0) {
    directorLiveWriteReasons.push(`blocked_by_diff_conflict:${diffConflictSurfaces.join(",")}`);
  }
  const writebackTargetSurfaces = OPERATIONAL_SURFACES.filter(
    (surface) =>
      tracked.notionWritebackPromotion.surfaces[surface].currentState === "writeback_enabled"
  );
  for (const surface of writebackTargetSurfaces) {
    for (const reason of dryRunDiffProjection.surfaceStatus[surface].reasons) {
      directorLiveWriteReasons.push(`blocked_by_dry_run_diff:${surface}:${reason}`);
    }
  }
  if (liveWriteEnabledSurfaces.length === 0) {
    directorLiveWriteReasons.push("blocked_by_writeback_promotion");
  }
  const uniqueDirectorLiveWriteReasons = [...new Set(directorLiveWriteReasons)].sort(compareStrings);

  const executorAutomationForWaivers = executorAutomationId ?? "ah-draft-pr-executor";
  const blockingDedupeKeys = executionRuns
    .filter((entry) => {
      const status = typeof entry.status === "string" ? entry.status : null;
      const dedupeKey = typeof entry.dedupeKey === "string" ? entry.dedupeKey : null;
      if (!dedupeKey) return false;
      if (status === "active" || status === "queued") return true;
      if (status !== "abandoned") return false;
      const abandonedWaivers = hasActiveWaiver(
        tracked.checkWaivers.waivers,
        `executor:${dedupeKey}`,
        executorAutomationForWaivers,
        evaluatedAt
      );
      return abandonedWaivers.length === 0;
    })
    .map((entry) => String(entry.dedupeKey))
    .sort(compareStrings);
  const blockingDedupeKeySet = new Set(blockingDedupeKeys);
  const packetFreshnessFailures = [
    ...new Set([...directorUpstreamFailures, ...executorUpstreamFailures])
  ].sort(compareStrings);

  const packetProjections: GatePacketProjection[] = dryRunDiffProjection.currentPackets.map((packet) => {
    const surfaceLock = tracked.notionSurfaceLock.operationalSurfaces[packet.surface];
    const surfacePromotion = tracked.notionWritebackPromotion.surfaces[packet.surface];
    const currentContractHash = getOperationalSurfaceContractHash(packet.surface);
    const currentContractVersion = getOperationalSurfaceContractVersion(packet.surface);
    const packetPromotionBindingStatus = evaluatePromotionBindingStatus({
      promotionState: surfacePromotion,
      surfaceLock,
      currentContractHash,
      currentContractVersion,
      currentDiffHash: packet.diffHash
    });
    const packetApprovalResult = evaluateApprovalStatus({
      surface: packet.surface,
      approvalState: tracked.manualApprovals,
      surfaceLock,
      currentContractHash,
      currentContractVersion,
      currentDiffHash: packet.diffHash,
      evaluatedAt,
      writebackState: surfacePromotion.currentState
    });
    const targetBindingStatus =
      notionAudit[packet.surface].targetBindingPassed &&
      notionAudit[packet.surface].auditOutcome === "confirmed"
        ? "passed"
        : "blocked_by_target_binding";
    const surfaceDiffStatus = dryRunDiffProjection.surfaceStatus[packet.surface];
    const supersessionStatus =
      surfaceDiffStatus.reasons.some((reason) => reason.includes("packet_supersession")) ||
      packet.packetLifecycle === "superseded" ||
      packet.packetLifecycle === "stale"
        ? "blocked_by_packet_supersession"
        : "passed";
    const reasons: string[] = [];

    if (packetFreshnessFailures.length > 0) {
      reasons.push(`blocked_by_freshness:${packetFreshnessFailures.join(",")}`);
    }
    if (targetBindingStatus !== "passed") reasons.push("blocked_by_target_binding");
    if (surfaceDiffStatus.reasons.length > 0) {
      reasons.push(...surfaceDiffStatus.reasons);
    }
    if (packet.evidenceSource !== "report_artifact") {
      reasons.push("blocked_by_unreplayable_dry_run_diff_source");
    }
    if (packet.packetLifecycle !== "ready_for_sync") {
      reasons.push(`blocked_by_packet_lifecycle:${packet.packetLifecycle}`);
    }
    if (supersessionStatus !== "passed") {
      reasons.push(supersessionStatus);
    }
    if (packetPromotionBindingStatus !== "matched") {
      reasons.push(`blocked_by_writeback_promotion:${packetPromotionBindingStatus}`);
    }
    if (packetApprovalResult.approvalStatus !== "matched") {
      reasons.push(`blocked_by_manual_approval:${packetApprovalResult.approvalStatus}`);
    }
    if (blockingDedupeKeySet.has(packet.dedupeKey)) {
      reasons.push(`blocked_by_executor_lane:${packet.dedupeKey}`);
    }
    if (dryRunDiffProjection.surfaceStatus[packet.surface].status === "conflict") {
      reasons.push("blocked_by_diff_conflict");
    }

    return {
      packetKey: packet.packetKey,
      surface: packet.surface,
      syncKey: packet.syncKey,
      sourceReportId: packet.sourceReportId,
      lastVerifiedAt: packet.lastVerifiedAt,
      packetLifecycle: packet.packetLifecycle,
      diffHash: packet.diffHash,
      dedupeKey: packet.dedupeKey,
      evidenceSource: packet.evidenceSource,
      targetBindingStatus,
      supersessionStatus,
      promotionStatus: packetPromotionBindingStatus,
      approvalStatus: packetApprovalResult.approvalStatus,
      status: reasons.length === 0 ? "eligible" : "blocked",
      reasons: [...new Set(reasons)].sort(compareStrings)
    };
  });

  const eligiblePackets = packetProjections.filter((packet) => packet.status === "eligible");
  const blockedPackets = packetProjections.filter((packet) => packet.status === "blocked");

  const executorReasons: string[] = [];
  if (uniqueDirectorLiveWriteReasons.length > 0) {
    executorReasons.push(...uniqueDirectorLiveWriteReasons);
  }
  if (executorUpstreamFailures.length > 0) {
    executorReasons.push(`blocked_by_freshness:${executorUpstreamFailures.join(",")}`);
  }
  if (blockingDedupeKeys.length > 0) {
    executorReasons.push(`blocked_by_executor_lane:${blockingDedupeKeys.join(",")}`);
  }
  if (!packetProjections.some((packet) => packet.packetLifecycle === "ready_for_sync")) {
    executorReasons.push("blocked_by_no_ready_packet");
  } else if (eligiblePackets.length === 0) {
    executorReasons.push("blocked_by_no_eligible_packet");
  }
  const uniqueExecutorReasons = [...new Set(executorReasons)].sort(compareStrings);

  const snapshotWithoutHash: Omit<GateEligibilitySnapshot, "projectionHash"> = {
    schemaVersion: 1,
    evaluatedAt,
    sourceHashes: {
      runtimeMaturity: hashValue(tracked.runtimeMaturity),
      notionSurfaceLock: hashValue(tracked.notionSurfaceLock),
      notionWritebackPromotion: hashValue(tracked.notionWritebackPromotion),
      manualApprovals: hashValue(tracked.manualApprovals),
      checkWaivers: hashValue(tracked.checkWaivers),
      openDecisionsLegacyBridge: hashValue(tracked.openDecisionsLegacyBridge),
      observedState: hashValue(
        observedEntries.map((entry) => ({
          filePath: path.relative(repoRoot, entry.filePath),
          observedAt: entry.observedAt,
          contentHash: entry.contentHash
        }))
      ),
      executionRuns: hashValue(
        executionRuns.map((entry) => ({
          filePath: entry.__filePath,
          observedAt: typeof entry.observedAt === "string" ? entry.observedAt : null,
          contentHash: entry.__contentHash,
          dedupeKey: typeof entry.dedupeKey === "string" ? entry.dedupeKey : null,
          status: typeof entry.status === "string" ? entry.status : null
        }))
      ),
      reportInventory: hashValue(reportInventory),
      dryRunReportEvidence: hashValue(
        reportDryRunEntries.map((entry) => ({
          filePath: path.relative(repoRoot, entry.filePath),
          contentHash: entry.contentHash
        }))
      ),
      dryRunObservedEvidence: hashValue(
        observedDryRunProjection.currentPackets.map((packet) => ({
          packetKey: packet.packetKey,
          filePath: path.relative(repoRoot, packet.filePath),
          contentHash: packet.contentHash
        }))
      )
    },
    feederStatus,
    dependencyStatus,
    notionAudit,
    promotionStatus,
    dryRunDiffStatus: dryRunDiffProjection.surfaceStatus,
    invalidDryRunPackets: dryRunDiffProjection.invalidPackets.map((packet) => ({
      ...packet,
      filePath: path.relative(repoRoot, packet.filePath)
    })),
    eligibility: {
      synthesis: {
        status: synthesisReasons.length === 0 ? "eligible" : "blocked",
        reasons: synthesisReasons,
        automationIds: synthesisAutomationIds
      },
      directorDryRun: {
        status: directorDryRunReasons.length === 0 ? "eligible" : "blocked",
        reasons: directorDryRunReasons
      },
      directorLiveWrite: {
        status: uniqueDirectorLiveWriteReasons.length === 0 ? "eligible" : "blocked",
        reasons: uniqueDirectorLiveWriteReasons,
        enabledSurfaces: liveWriteEnabledSurfaces
      },
      executor: {
        status: uniqueExecutorReasons.length === 0 && eligiblePackets.length > 0 ? "eligible" : "blocked",
        reasons: uniqueExecutorReasons,
        blockingDedupeKeys,
        subGates: {
          freshness:
            packetFreshnessFailures.length > 0 || feederFreshnessBlocked ? "blocked" : "passed",
          writebackPromotion: uniqueDirectorLiveWriteReasons.some((reason) =>
            reason.startsWith("blocked_by_writeback_promotion")
          )
            ? "blocked"
            : "passed",
          readyPacketObserved: packetProjections.some(
            (packet) => packet.packetLifecycle === "ready_for_sync"
          )
            ? "passed"
            : "blocked",
          eligiblePacketPresent: eligiblePackets.length > 0 ? "passed" : "blocked",
          executorLane: blockingDedupeKeys.length > 0 ? "blocked" : "passed"
        },
        eligiblePackets,
        blockedPackets
      }
    }
  };

  return {
    ...snapshotWithoutHash,
    projectionHash: hashValue(snapshotWithoutHash)
  };
}
