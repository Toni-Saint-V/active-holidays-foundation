# Automation Reports

Runtime outputs from the Active Holidays automation suite belong here.

Conventions:

- dated runs: `reports/automations/runs/<automation-id>/YYYY-MM-DD.md`
- current pointer: `reports/automations/runs/<automation-id>/latest.md`
- optional local state: `reports/automations/state/<automation-id>.json`

These runtime paths are gitignored. Example outputs live next to each automation definition in `.codex/automations/<id>/sample-output.md`.

Notion-aware loop:

- feeder and synthesis automations write evidence here first
- `ah-notion-sync-director` may then use the latest reports as the only write-back source for Notion operational surfaces
- for Notion-facing packets, prefer carrying the repo-owned envelope:
  - `recordTitle`
  - `syncKey`
  - `notionSurface`
  - `writeMode`
  - `sourceReportId`
  - `source`
  - `confidence`
  - `lastVerifiedAt`
  - `actionNeeded`
