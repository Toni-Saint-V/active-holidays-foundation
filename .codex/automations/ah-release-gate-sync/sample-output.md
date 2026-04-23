# Release Gate Sync · Sample

## GATE SNAPSHOT

- Domain and repo-automation docs are green.
- UI surface remains under active change and is not merge-ready by default.
- Notion sync layer is still proposal-only until the sync director writes evidence-backed records.

## GREEN

- `npm run automations:verify`
- `npm run automations:check:context`

## BLOCKING

- No single `Release Gate` record exists yet in Notion.
- Live Notion audit is unresolved while the connector is unavailable.

## MANUAL VERIFY NEEDED

- Confirm which branches or flows should surface as release candidates in Notion.
- Verify any UI-facing gate after PNG approval and visual QA.

## SYNC CONTRACT

- Gate 1
  - `identity`: `syncKey`
  - `recordTitle`: `Notion control tower write-back gate`
  - `syncKey`: `gate:notion-control-tower:writeback-enabled`
  - `notionSurface`: `Release Gate`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `packetLifecycle`: `blocked`
  - `surface`: `notion-control-tower`
  - `gate`: `writeback-enabled`
  - `status`: `blocked`
  - `blockingReason`: `Schema contract is not yet confirmed against the live workspace.`
  - `sourceReportId`: `ah-release-gate-sync:latest`
  - `source`: `repo verification + automation reports`
  - `confidence`: `high`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Keep live write-back disabled until the schema contract is manually confirmed.`
  - `targetBinding`: `blocked_by_target_binding`
  - `recordTitleRole`: `display-only`

## NOTION TARGET

- Locked `Release Gate` target required from `.codex/automations/notion-surface-lock.json`
- If the live workspace does not expose a locked compatible surface, mark `blocked_by_target_binding` or `blocked_by_surface_drift`.

## VERIFY

- Every blocking item includes evidence.
- No `ready` label is used without proof.
- identity = `syncKey`
- title/name only for read-only discovery before lock.
