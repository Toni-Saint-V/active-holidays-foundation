# Review Learning Distiller · Sample

## RECURRING PATTERNS

- Review findings keep exposing the same gap between “looks complete” and “verified complete”.
- Product and execution docs drift when a repo change lands without a matching Notion or automation update.

## SYSTEMIC LEARNINGS

- Release-ready language should stay blocked until the smallest relevant verification stack actually ran.
- Notion-facing execution truth needs a dedicated owner layer instead of ad hoc mentions inside unrelated docs.

## WHAT TO UPDATE

- Tighten `Release Gate` automation expectations.
- Add a clearer `Notion Sync Director` contract to the automation operating model.

## SYNC CONTRACT

- Learning 1
  - `identity`: `syncKey`
  - `recordTitle`: `Release-ready language must stay verification-bound`
  - `syncKey`: `learning:release:verification-bound-language`
  - `notionSurface`: `Review Findings & Learnings`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `packetLifecycle`: `blocked`
  - `layer`: `release`
  - `severity`: `high`
  - `fixPath`: `Tighten release gate wording and proof requirements before any ready verdict.`
  - `status`: `open`
  - `sourceReportId`: `ah-review-learning-distiller:latest`
  - `source`: `review findings + automation reports`
  - `confidence`: `high`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Keep release language blocked until the smallest relevant verification stack actually ran.`
  - `targetBinding`: `blocked_by_target_binding`
  - `recordTitleRole`: `display-only`
- Learning 2
  - `identity`: `syncKey`
  - `recordTitle`: `Notion-facing execution truth needs one owner layer`
  - `syncKey`: `learning:notion:notion-sync-director-owner-layer`
  - `notionSurface`: `Review Findings & Learnings`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `packetLifecycle`: `blocked`
  - `layer`: `notion`
  - `severity`: `medium`
  - `fixPath`: `Keep operational truth flowing through the sync director instead of ad hoc doc edits.`
  - `status`: `open`
  - `sourceReportId`: `ah-review-learning-distiller:latest`
  - `source`: `review findings + automation reports`
  - `confidence`: `medium`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Keep new Notion-facing automations packetized and routed through the director.`
  - `targetBinding`: `blocked_by_target_binding`
  - `recordTitleRole`: `display-only`

## NOTION TARGET

- Locked `Review Findings & Learnings` target required from `.codex/automations/notion-surface-lock.json`
- Cross-link to `Execution` when a repeated pattern affects live work

## VERIFY

- Each learning maps to a repeated pattern, not a one-off bug.
- identity = `syncKey`
- title/name only for read-only discovery before lock.
