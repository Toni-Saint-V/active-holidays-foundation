# Notion Sync Director · Sample

## SCHEMA CONTRACT STATUS

- Mode: `report-first`
- Live write-back remains disabled until the workspace confirms the repo-owned operational schema.
- Contract-owned operational surfaces:
  - `Execution`
  - `Open Decisions`
  - `Build Briefs`
  - `Release Gate`
  - `Automation Inbox`
  - `Opportunities`
  - `Review Findings & Learnings`

## WRITE PLAN BY SURFACE

- `Execution`
  - `recordTitle`: `Notion control tower next step`
  - `syncKey`: `execution:result-flow:notion-control-tower-next-step`
  - `notionSurface`: `Execution`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `sourceReportId`: `ah-execution-brief-sync:latest`
  - `source`: `ah-execution-brief-sync:latest`
  - `confidence`: `high`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Keep the next-step record aligned with the current repo-backed brief.`
- `Open Decisions`
  - `recordTitle`: `RDC companion reference-only`
  - `syncKey`: `decision:scope:rdc-companion-reference-only`
  - `notionSurface`: `Open Decisions`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `sourceReportId`: `ah-open-decisions-curator:latest`
  - `source`: `ah-open-decisions-curator:latest`
  - `confidence`: `high`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Confirm scope ownership before enabling live write-back.`
- `Release Gate`
  - `recordTitle`: `Notion write-back gate`
  - `syncKey`: `gate:notion-control-tower:writeback-enabled`
  - `notionSurface`: `Release Gate`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `sourceReportId`: `ah-release-gate-sync:latest`
  - `source`: `ah-release-gate-sync:latest`
  - `confidence`: `medium`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Do not mark live write-back ready until the schema contract is manually confirmed.`

## WRITTEN TO NOTION OR BLOCKED
- Blocked: live write-back skipped because the workspace schema has not been manually confirmed.

## SUGGESTED UPDATES

- `P1 · UX Architecture — Flow / State / Screens`: add a drift note about the current release-gate visibility gap.
- `P2 · Screen Contracts for Lovable`: add a decision-required note if a screen contract no longer matches repo reality.

## DRIFT STILL OPEN

- The current Notion hierarchy still needs one explicit operational home for automation-owned truth.

## VERIFY

- Every planned record includes `recordTitle`, `syncKey`, `notionSurface`, `sourceReportId`, `writeMode`, `source`, and `confidence`.
- Canonical pages were not silently overwritten.
