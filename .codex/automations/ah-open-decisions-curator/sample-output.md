# Open Decisions Curator · Sample

## DECISION CANDIDATES

- Should `RDC v3.0 — Companion` stay discoverable as a live execution brief or be explicitly marked reference-only for the current cycle?
- Should release truth live only in repo reports, or also be represented in a dedicated Notion `Release Gate` database?

## WHY THEY MATTER

- The first decision affects scope clarity and whether operators follow a stale narrative instead of the current verdict-first MVP.
- The second decision affects whether Notion can stay operationally honest without manual status stitching.

## RECOMMENDATION

- Mark `RDC v3.0 — Companion` as reference-only and route execution through `P0`, `P1`, `P2`, and `Execution`.
- Add a lightweight `Release Gate` database in Notion and sync only evidence-backed status.

## SYNC CONTRACT

- Decision 1
  - `identity`: `syncKey`
  - `recordTitle`: `RDC v3.0 should be reference-only`
  - `syncKey`: `decision:scope:rdc-companion-reference-only`
  - `packetLifecycle`: `blocked`
  - `decisionStatus`: `open`
  - `urgency`: `high`
  - `owner`: `product-owner`
  - `whyNow`: `Contradictory live docs still compete for execution ownership.`
  - `notionSurface`: `Open Decisions`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `sourceReportId`: `ah-open-decisions-curator:latest`
  - `source`: `repo + automation reports`
  - `confidence`: `high`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Confirm canonical page ownership and mark the companion as reference-only.`
  - `targetBinding`: `blocked_by_surface_drift`
  - `recordTitleRole`: `display-only`
- Decision 2
  - `identity`: `syncKey`
  - `recordTitle`: `Release Gate should exist as an operational surface`
  - `syncKey`: `decision:operations:release-gate-database`
  - `packetLifecycle`: `blocked`
  - `decisionStatus`: `open`
  - `urgency`: `medium`
  - `owner`: `engineering-owner`
  - `whyNow`: `Daily sync cannot stay deterministic while release truth lives only in prose reports.`
  - `notionSurface`: `Open Decisions`
  - `writeMode`: `UPSERT_RECORD_BY_SYNC_KEY`
  - `sourceReportId`: `ah-open-decisions-curator:latest`
  - `source`: `repo + automation reports`
  - `confidence`: `medium`
  - `lastVerifiedAt`: `2026-04-22T00:00:00+03:00`
  - `actionNeeded`: `Confirm whether Release Gate should be created before live write-back is enabled.`
  - `targetBinding`: `blocked_by_target_binding`
  - `recordTitleRole`: `display-only`

## NOTION TARGET

- Locked target required from `.codex/automations/notion-surface-lock.json`
- No title-based resolution after lock
- Linked references: `P0 · Master Doc — Vision & Boundaries`, `P0 · Definition of Final`

## VERIFY

- Each decision has one concrete owner.
- No more than three decisions were raised.
- identity = `syncKey`
- title/name only for read-only discovery before lock.
