export const REPO_RUNTIME_MANIFEST = {
  repoId: "active-holidays-foundation",
  canonicalRepoRoot: "/Users/user/Projects/active-holidays-foundation",
  branchScope: "codex/control-tower-v2-1-runtime-hardening",
  controlTowerScope: "non-ui dominant surface only",
  automationRoot: ".codex/automations",
  runtimeReportsRoot: "reports/automations/runs",
  runtimeStateRoot: "reports/automations/state",
  runtimeObservedRoot: "reports/automations/state/runtime-observed",
  executionRunsRoot: "reports/automations/state/execution-runs",
  gateEligibilitySnapshotPath: "reports/automations/state/gate-eligibility-snapshot.json",
  runtimeMaturityPath: "reports/automations/state/runtime-maturity.json",
  notionWritebackPromotionPath: "reports/automations/state/notion-writeback-promotion.json",
  openDecisionsLegacyBridgePath:
    "reports/automations/state/open-decisions-legacy-bridge.json",
  manualApprovalsPath: "reports/automations/state/manual-approvals.json",
  notionSurfaceLockPath: ".codex/automations/notion-surface-lock.json",
  checkWaiversPath: ".codex/automations/check-waivers.json",
  skillTelemetryPath: "reports/automations/state/runtime-observed/skill-mode-telemetry.jsonl"
} as const;

export type RepoRuntimeManifest = typeof REPO_RUNTIME_MANIFEST;
