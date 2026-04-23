# Notion Sync Director · Sample

## SCHEMA CONTRACT STATUS

- Mode: `dry_run`
- Eligibility source: `reports/automations/state/gate-eligibility-snapshot.json`
- Live write-back remains disabled until the deterministic gate snapshot, lock state, approval tuple, and dry-run diff all match.

## WRITE PLAN BY SURFACE

- `Execution`
  - `identity`: `syncKey`
  - `packetKey`: `Execution:execution:result-flow:notion-control-tower-next-step:2026-04-22T00:00:00.000Z:diff-placeholder`
  - `recordTitle`: `Notion control tower next step`
  - `syncKey`: `execution:result-flow:notion-control-tower-next-step`
  - `notionSurface`: `Execution`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `packetLifecycle`: `blocked`
  - `diffHash`: `diff-placeholder`
  - `dedupeKey`: `executor:Execution:execution:result-flow:notion-control-tower-next-step`
  - `supersedesPacketKey`: `null`
  - `supersededByPacketKey`: `null`
  - `supersessionReason`: `null`
  - `sourceReportId`: `ah-execution-brief-sync:latest`
  - `source`: `ah-execution-brief-sync:latest`
  - `confidence`: `high`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Keep the next-step record aligned with the current repo-backed brief.`
  - `targetBinding`: `blocked_by_target_binding`
  - `recordTitleRole`: `display-only`
- `Open Decisions`
  - `identity`: `syncKey`
  - `recordTitle`: `RDC companion reference-only`
  - `syncKey`: `decision:scope:rdc-companion-reference-only`
  - `notionSurface`: `Open Decisions`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `packetLifecycle`: `blocked`
  - `sourceReportId`: `ah-open-decisions-curator:latest`
  - `source`: `ah-open-decisions-curator:latest`
  - `confidence`: `high`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Confirm scope ownership before enabling live write-back.`
  - `targetBinding`: `blocked_by_surface_drift`
  - `recordTitleRole`: `display-only`
- `Release Gate`
  - `identity`: `syncKey`
  - `recordTitle`: `Notion write-back gate`
  - `syncKey`: `gate:notion-control-tower:writeback-enabled`
  - `notionSurface`: `Release Gate`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `packetLifecycle`: `blocked`
  - `sourceReportId`: `ah-release-gate-sync:latest`
  - `source`: `ah-release-gate-sync:latest`
  - `confidence`: `medium`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Do not mark live write-back ready until the schema contract is manually confirmed.`
  - `targetBinding`: `blocked_by_target_binding`
  - `recordTitleRole`: `display-only`

## WRITTEN TO NOTION OR BLOCKED
- Blocked: live write-back skipped because the deterministic gate snapshot does not authorize writeback and target binding is unresolved.

## SUGGESTED UPDATES

- `P1 · UX Architecture — Flow / State / Screens`: add a drift note about the current release-gate visibility gap.
- `P2 · Screen Contracts for Lovable`: add a decision-required note if a screen contract no longer matches repo reality.

## DRIFT STILL OPEN

- The current Notion hierarchy still needs one explicit operational home for automation-owned truth.

## VERIFY

- Every planned record includes `recordTitle`, `syncKey`, `notionSurface`, `sourceReportId`, `writeMode`, `source`, and `confidence`.
- Every operational packet declares `identity = syncKey`, `packetKey`, `diffHash`, `dedupeKey`, `packetLifecycle`, supersession fields, and `recordTitle` as display-only.
- Canonical pages were not silently overwritten.
- identity = `syncKey`
- title/name only for read-only discovery before lock.
