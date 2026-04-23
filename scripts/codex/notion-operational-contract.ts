import { hashValue } from "./automation-contract-utils.ts";

export const NOTION_OPERATIONAL_CONTRACT_VERSION =
  "2026-04-23-control-tower-v2.1";

export const CANONICAL_NOTE_KINDS = [
  "Suggested Update",
  "Drift Note",
  "Decision Required"
] as const;

export const PACKET_LIFECYCLE_STATES = [
  "draft",
  "ready_for_sync",
  "blocked",
  "applied",
  "superseded",
  "stale"
] as const;

export const TARGET_RESOLUTION_LIFECYCLE_STATES = [
  "legacy_title_read_only",
  "sync_key_only",
  "live_id_bound",
  "hard_fail_unbound"
] as const;

export const NOTION_AUDIT_OUTCOMES = [
  "confirmed",
  "blocked_by_schema_contract",
  "blocked_by_property_conflict",
  "blocked_by_surface_drift",
  "blocked_by_missing_binding"
] as const;

export const PACKET_ENVELOPE_REQUIRED_FIELDS = [
  "packetKey",
  "syncKey",
  "sourceReportId",
  "lastVerifiedAt",
  "packetLifecycle",
  "diffHash",
  "dedupeKey"
] as const;

export const PACKET_SUPERSESSION_FIELDS = [
  "supersedesPacketKey",
  "supersededByPacketKey",
  "supersessionReason"
] as const;

export const OPERATIONAL_SURFACES = [
  "Execution",
  "Open Decisions",
  "Build Briefs",
  "Release Gate",
  "Automation Inbox",
  "Opportunities",
  "Review Findings & Learnings"
] as const;

export type CanonicalNoteKind = (typeof CANONICAL_NOTE_KINDS)[number];
export type PacketLifecycleState = (typeof PACKET_LIFECYCLE_STATES)[number];
export type TargetResolutionLifecycleState = (typeof TARGET_RESOLUTION_LIFECYCLE_STATES)[number];
export type NotionAuditOutcome = (typeof NOTION_AUDIT_OUTCOMES)[number];
export type OperationalSurface = (typeof OPERATIONAL_SURFACES)[number];

export type PacketIdentity = {
  surface: OperationalSurface;
  syncKey: string;
  sourceReportId: string;
  lastVerifiedAt: string;
  diffHash: string;
};

export type PacketDedupeIdentity = {
  surface: OperationalSurface;
  syncKey: string;
};

export function derivePacketKey(input: PacketIdentity): string {
  return `${input.surface}:${input.syncKey}:${input.sourceReportId}:${input.lastVerifiedAt}:${input.diffHash}`;
}

export function derivePacketDedupeKey(input: PacketDedupeIdentity): string {
  return `executor:${input.surface}:${input.syncKey}`;
}

export type NotionPropertyType =
  | "title"
  | "text"
  | "status"
  | "select"
  | "multi_select"
  | "date"
  | "checkbox"
  | "number"
  | "person"
  | "relation"
  | "created_time"
  | "last_edited_time";

export type AllowedWriteMode =
  | "UPSERT_RECORD_BY_SYNC_KEY"
  | "UPSERT_UNRESOLVED_BY_SYNC_KEY"
  | "UPDATE_NOTE_BLOCK_BY_SYNC_KEY";

type CanonicalAnchorDefinition = {
  key: string;
  title: string;
  noteKinds: readonly CanonicalNoteKind[];
  writeMode: "UPDATE_NOTE_BLOCK_BY_SYNC_KEY";
  aliases?: readonly string[];
};

type OperationalSurfaceDefinition = {
  surface: OperationalSurface;
  targetKind: "data_source";
  requiredProperties: Record<string, NotionPropertyType>;
  allowedWriteModes: readonly AllowedWriteMode[];
  syncKeyNamespace: string;
  packetLifecycle: readonly PacketLifecycleState[];
  targetResolution: {
    discoveryMode: "title_or_name_read_only_until_lock";
    lockedWriteMode: "locked_target_id_and_sync_key_only";
    blockedReason: "blocked_by_target_binding";
    allowedLifecycleStatesForWrite: readonly TargetResolutionLifecycleState[];
    recordTitleRole: "display_only";
  };
  additiveCompatRules: readonly string[];
};

export const CANONICAL_ANCHORS: readonly CanonicalAnchorDefinition[] = [
  {
    key: "P0_MASTER_DOC",
    title: "P0 · Master Doc — Vision & Boundaries",
    noteKinds: CANONICAL_NOTE_KINDS,
    writeMode: "UPDATE_NOTE_BLOCK_BY_SYNC_KEY",
    aliases: ["00 · Vision & Product"]
  },
  {
    key: "P0_DEFINITION_OF_FINAL",
    title: "P0 · Definition of Final",
    noteKinds: CANONICAL_NOTE_KINDS,
    writeMode: "UPDATE_NOTE_BLOCK_BY_SYNC_KEY"
  },
  {
    key: "P1_UX_ARCHITECTURE",
    title: "P1 · UX Architecture — Flow / State / Screens",
    noteKinds: CANONICAL_NOTE_KINDS,
    writeMode: "UPDATE_NOTE_BLOCK_BY_SYNC_KEY"
  },
  {
    key: "P2_SCREEN_CONTRACTS",
    title: "P2 · Screen Contracts for Lovable",
    noteKinds: CANONICAL_NOTE_KINDS,
    writeMode: "UPDATE_NOTE_BLOCK_BY_SYNC_KEY"
  },
  {
    key: "ROADMAP_INDEX",
    title: "04 · Roadmap",
    noteKinds: CANONICAL_NOTE_KINDS,
    writeMode: "UPDATE_NOTE_BLOCK_BY_SYNC_KEY"
  },
  {
    key: "LEGACY_OPEN_DECISIONS_PAGE",
    title: "P0 · Open Decisions",
    noteKinds: [],
    writeMode: "UPDATE_NOTE_BLOCK_BY_SYNC_KEY"
  }
] as const;

export const OPERATIONAL_SURFACE_CONTRACTS: Record<
  OperationalSurface,
  OperationalSurfaceDefinition
> = {
  Execution: {
    surface: "Execution",
    targetKind: "data_source",
    requiredProperties: {
      Record: "title",
      "Sync Key": "text",
      Area: "text",
      Status: "status",
      Source: "text",
      Confidence: "select",
      "Last Verified At": "date",
      "Action Needed": "text",
      Evidence: "text"
    },
    allowedWriteModes: ["UPSERT_RECORD_BY_SYNC_KEY"],
    syncKeyNamespace: "execution",
    packetLifecycle: PACKET_LIFECYCLE_STATES,
    targetResolution: {
      discoveryMode: "title_or_name_read_only_until_lock",
      lockedWriteMode: "locked_target_id_and_sync_key_only",
      blockedReason: "blocked_by_target_binding",
      allowedLifecycleStatesForWrite: ["sync_key_only", "live_id_bound"],
      recordTitleRole: "display_only"
    },
    additiveCompatRules: [
      "Additive properties or views are allowed.",
      "Write or update by title or name is forbidden once lock exists.",
      "Target resolution after lock requires locked target id plus syncKey."
    ]
  },
  "Open Decisions": {
    surface: "Open Decisions",
    targetKind: "data_source",
    requiredProperties: {
      Record: "title",
      "Sync Key": "text",
      Layer: "text",
      "Decision Status": "status",
      Recommendation: "text",
      "Why Now": "text",
      Urgency: "select",
      Owner: "text",
      Source: "text",
      Confidence: "select",
      "Last Verified At": "date",
      "Action Needed": "text",
      Evidence: "text"
    },
    allowedWriteModes: ["UPSERT_RECORD_BY_SYNC_KEY"],
    syncKeyNamespace: "decision",
    packetLifecycle: PACKET_LIFECYCLE_STATES,
    targetResolution: {
      discoveryMode: "title_or_name_read_only_until_lock",
      lockedWriteMode: "locked_target_id_and_sync_key_only",
      blockedReason: "blocked_by_target_binding",
      allowedLifecycleStatesForWrite: ["sync_key_only", "live_id_bound"],
      recordTitleRole: "display_only"
    },
    additiveCompatRules: [
      "Legacy same-page table may stay read-only during migration.",
      "Live operational DB must be locked by target id before writeback.",
      "Title or display text is not an identity field.",
      "Once a lock exists, write or update by title or name is forbidden."
    ]
  },
  "Build Briefs": {
    surface: "Build Briefs",
    targetKind: "data_source",
    requiredProperties: {
      Record: "title",
      "Sync Key": "text",
      Scope: "text",
      Ready: "checkbox",
      "Inputs Verified": "checkbox",
      "Acceptance Criteria": "text",
      Verify: "text",
      "Prompt Block": "text",
      Source: "text"
    },
    allowedWriteModes: ["UPSERT_RECORD_BY_SYNC_KEY"],
    syncKeyNamespace: "brief",
    packetLifecycle: PACKET_LIFECYCLE_STATES,
    targetResolution: {
      discoveryMode: "title_or_name_read_only_until_lock",
      lockedWriteMode: "locked_target_id_and_sync_key_only",
      blockedReason: "blocked_by_target_binding",
      allowedLifecycleStatesForWrite: ["sync_key_only", "live_id_bound"],
      recordTitleRole: "display_only"
    },
    additiveCompatRules: [
      "Compat must be additive-first against the locked live Build Briefs schema.",
      "Existing Build Brief views and relations may stay intact.",
      "Missing repo-owned fields must be added without removing live fields.",
      "Once a lock exists, write or update by title or name is forbidden."
    ]
  },
  "Release Gate": {
    surface: "Release Gate",
    targetKind: "data_source",
    requiredProperties: {
      Record: "title",
      "Sync Key": "text",
      Surface: "text",
      Gate: "text",
      Status: "status",
      "Blocking Reason": "text",
      Source: "text",
      Confidence: "select",
      "Last Verified At": "date",
      Evidence: "text"
    },
    allowedWriteModes: ["UPSERT_RECORD_BY_SYNC_KEY"],
    syncKeyNamespace: "gate",
    packetLifecycle: PACKET_LIFECYCLE_STATES,
    targetResolution: {
      discoveryMode: "title_or_name_read_only_until_lock",
      lockedWriteMode: "locked_target_id_and_sync_key_only",
      blockedReason: "blocked_by_target_binding",
      allowedLifecycleStatesForWrite: ["sync_key_only", "live_id_bound"],
      recordTitleRole: "display_only"
    },
    additiveCompatRules: [
      "No writeback until live surface exists and audit outcome is confirmed.",
      "Gate status remains repo-owned and evidence-backed.",
      "Once a lock exists, write or update by title or name is forbidden."
    ]
  },
  "Automation Inbox": {
    surface: "Automation Inbox",
    targetKind: "data_source",
    requiredProperties: {
      Record: "title",
      "Sync Key": "text",
      "Packet Type": "select",
      Severity: "select",
      Status: "status",
      "Action Needed": "text",
      "Routed To": "text",
      Source: "text",
      Confidence: "select",
      "Last Verified At": "date"
    },
    allowedWriteModes: ["UPSERT_UNRESOLVED_BY_SYNC_KEY"],
    syncKeyNamespace: "inbox",
    packetLifecycle: PACKET_LIFECYCLE_STATES,
    targetResolution: {
      discoveryMode: "title_or_name_read_only_until_lock",
      lockedWriteMode: "locked_target_id_and_sync_key_only",
      blockedReason: "blocked_by_target_binding",
      allowedLifecycleStatesForWrite: ["sync_key_only", "live_id_bound"],
      recordTitleRole: "display_only"
    },
    additiveCompatRules: [
      "Only unresolved packets may be upserted.",
      "New record creation is allowed only when syncKey materially changes.",
      "Once a lock exists, write or update by title or name is forbidden."
    ]
  },
  Opportunities: {
    surface: "Opportunities",
    targetKind: "data_source",
    requiredProperties: {
      Record: "title",
      "Sync Key": "text",
      Idea: "text",
      "Why Now": "text",
      Impact: "select",
      Complexity: "select",
      Source: "text",
      Confidence: "select",
      Status: "status"
    },
    allowedWriteModes: ["UPSERT_RECORD_BY_SYNC_KEY"],
    syncKeyNamespace: "opportunity",
    packetLifecycle: PACKET_LIFECYCLE_STATES,
    targetResolution: {
      discoveryMode: "title_or_name_read_only_until_lock",
      lockedWriteMode: "locked_target_id_and_sync_key_only",
      blockedReason: "blocked_by_target_binding",
      allowedLifecycleStatesForWrite: ["sync_key_only", "live_id_bound"],
      recordTitleRole: "display_only"
    },
    additiveCompatRules: [
      "Opportunity status is operational and must not overwrite canonical pages.",
      "Once a lock exists, write or update by title or name is forbidden."
    ]
  },
  "Review Findings & Learnings": {
    surface: "Review Findings & Learnings",
    targetKind: "data_source",
    requiredProperties: {
      Record: "title",
      "Sync Key": "text",
      Layer: "text",
      Severity: "select",
      "Fix Path": "text",
      Source: "text",
      Confidence: "select",
      Status: "status",
      Evidence: "text"
    },
    allowedWriteModes: ["UPSERT_RECORD_BY_SYNC_KEY"],
    syncKeyNamespace: "learning",
    packetLifecycle: PACKET_LIFECYCLE_STATES,
    targetResolution: {
      discoveryMode: "title_or_name_read_only_until_lock",
      lockedWriteMode: "locked_target_id_and_sync_key_only",
      blockedReason: "blocked_by_target_binding",
      allowedLifecycleStatesForWrite: ["sync_key_only", "live_id_bound"],
      recordTitleRole: "display_only"
    },
    additiveCompatRules: [
      "Learnings stay operational and evidence-backed.",
      "One-off bugs without systemic value must reroute instead of writing here.",
      "Once a lock exists, write or update by title or name is forbidden."
    ]
  }
} as const;

export function getOperationalSurfaceContract(surface: OperationalSurface): OperationalSurfaceDefinition {
  return OPERATIONAL_SURFACE_CONTRACTS[surface];
}

export function getOperationalSurfaceContractHash(surface: OperationalSurface): string {
  return hashValue(getOperationalSurfaceContract(surface));
}

export function getOperationalSurfaceContractVersion(
  surface: OperationalSurface
): string {
  return `${NOTION_OPERATIONAL_CONTRACT_VERSION}:${OPERATIONAL_SURFACE_CONTRACTS[surface].syncKeyNamespace}`;
}

export function isOperationalSurfaceWriteLocked(
  targetId: string | null,
  dataSourceId: string | null
): boolean {
  return Boolean(targetId || dataSourceId);
}

export function isTitleBasedTargetResolutionForbidden(
  targetId: string | null,
  dataSourceId: string | null
): boolean {
  return isOperationalSurfaceWriteLocked(targetId, dataSourceId);
}

export const NOTION_OPERATIONAL_CONTRACT_HASH = hashValue({
  contractVersion: NOTION_OPERATIONAL_CONTRACT_VERSION,
  canonicalAnchors: CANONICAL_ANCHORS,
  operationalSurfaces: OPERATIONAL_SURFACE_CONTRACTS,
  canonicalNoteKinds: CANONICAL_NOTE_KINDS,
  packetLifecycle: PACKET_LIFECYCLE_STATES,
  packetEnvelopeRequiredFields: PACKET_ENVELOPE_REQUIRED_FIELDS,
  packetSupersessionFields: PACKET_SUPERSESSION_FIELDS,
  targetResolutionLifecycle: TARGET_RESOLUTION_LIFECYCLE_STATES,
  auditOutcomes: NOTION_AUDIT_OUTCOMES
});
