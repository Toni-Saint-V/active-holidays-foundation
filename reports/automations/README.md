# Automation Reports

Runtime outputs from the Active Holidays automation suite belong here.

Conventions:

- dated runs: `reports/automations/runs/<automation-id>/YYYY-MM-DD.md`
- current pointer: `reports/automations/runs/<automation-id>/latest.md`
- tracked deterministic control-tower state:
  - `reports/automations/state/runtime-maturity.json`
  - `reports/automations/state/notion-writeback-promotion.json`
  - `reports/automations/state/open-decisions-legacy-bridge.json`
  - `reports/automations/state/manual-approvals.json`
  - `reports/automations/state/gate-eligibility-snapshot.json`
- volatile runtime-observed state:
  - `reports/automations/state/runtime-observed/*.json`
  - `reports/automations/state/execution-runs/*.json`

Tracked singleton state is intentionally committed.
Volatile runtime-observed state stays gitignored.
Example outputs live next to each automation definition in `.codex/automations/<id>/sample-output.md`.

Context packet:

- `npm run automations:context:packet` builds the report-first `automationContextPacket` without writing files
- sources are limited to:
  - `reports/automations/runs/*/latest.md`
  - `reports/automations/state/gate-eligibility-snapshot.json`
  - `.autonomous/task-candidates.json`
  - `.autonomous/task-status.json`
- `.autonomous/scoring-model.json`
- current git status from the local checkout
- if required upstream reports are missing, packet status is `distillation_incomplete`
- if the gate snapshot says a report is missing but the required report artifacts now exist, the packet reports `stale_gate_snapshot`
- no external memory API, live Notion/GitHub write, plugin scaffold, or Context7 runtime dependency is implied

Notion-aware loop:

- feeder and synthesis automations write evidence here first
- deterministic projection in `gate-eligibility-snapshot.json` projects reports, waivers, approvals, locks, and observed state into current gate outcomes
- projection is deterministic from content: report timestamps come from frontmatter or dated filenames, observed JSON requires explicit `observedAt` / `lastVerifiedAt`, and filesystem `mtime` is ignored
- `ah-notion-sync-director` may use only that projection plus locked target ids for any live writeback decision
- for Notion-facing packets, prefer carrying the repo-owned envelope:
  - `packetKey`
  - `recordTitle`
  - `syncKey`
  - `notionSurface`
  - `writeMode`
  - `sourceReportId`
  - `source`
  - `confidence`
  - `lastVerifiedAt`
  - `actionNeeded`
  - `packetLifecycle`
  - `diffHash`
  - `dedupeKey`
  - `supersedesPacketKey`
  - `supersededByPacketKey`
  - `supersessionReason`
- for operational packets, identity is `syncKey`; `recordTitle` is display-only
