# Draft PR Executor · Sample

## EXECUTION ELIGIBILITY

- Status: `blocked`
- Source of truth: `reports/automations/state/gate-eligibility-snapshot.json`
- Blocking reason: `blocked_by_writeback_promotion`
- `eligiblePackets`: `[]`
- `blockedPackets`: `[]`

## PACKET IDENTITY

- `syncKey`: `execution:control-tower:runtime-hardening`
- packet lifecycle: `ready_for_sync`
- `recordTitle`: `Control tower runtime hardening` (display-only)

## WORKTREE AND BRANCH

- worktree: isolated
- branch: automation-owned
- `dedupeKey`: `executor:Execution:execution:control-tower:runtime-hardening`

## ELIGIBLE PACKETS / BLOCKED PACKETS

- No `eligiblePackets[]` entry exists with `packetLifecycle = ready_for_sync`.
- Executor did not read volatile state directly to override the deterministic snapshot.

## DRAFT PR STATUS

- No draft PR opened because executor eligibility is blocked.

## BLOCKERS OR TERMINAL FAILURE

- `writeback_enabled` is false in the gate snapshot.
- No title-based target resolution was attempted.

## VERIFY

- Executor used only the deterministic gate snapshot.
- No step moved beyond `draft_pr_open`.
