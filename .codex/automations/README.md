# Active Holidays Repo-Local Automations

This folder contains the repo-local Codex automation suite for `active-holidays-foundation`.

Principles:

- use the same `automation.toml` shape already seen in `$CODEX_HOME/automations`
- keep default status safe (`PAUSED`)
- bind every automation to this repo cwd
- ship a sample output for every automation
- prefer AI-native product/process/agent/UI improvements over infra theatre
- prefer deterministic helpers where the repo exposes enough structure
- keep plugin and MCP surface governance explicit instead of creating speculative local config

Install flow:

```bash
npm run automations:verify
npm run automations:sync -- --dry-run
npm run automations:sync
```

## Notion Control Tower Extension

This branch hardens the control-tower runtime and governance layer only.

Scope:

- `non-UI dominant surface only`
- allowed files: runtime contracts, validator/governance scripts, automation prompts, tracked control-tower state, and supporting docs
- excluded from this branch: user-facing UI implementation surfaces

The suite now supports a Notion-aware operating loop:

1. feeder automations collect repo-backed evidence into `reports/automations/runs/<id>/latest.md`
2. synthesis automations turn that evidence into machine-parseable packets with lifecycle state
3. a deterministic projection snapshot in `reports/automations/state/gate-eligibility-snapshot.json` becomes the single source of truth for synthesis, writeback, and executor eligibility
4. `ah-notion-sync-director` becomes the only automation allowed to prepare or write operational truth back to Notion
5. `ah-draft-pr-executor` may run only after the gate snapshot exposes a concrete `eligiblePackets[]` entry for executor eligibility

Safety contract:

- tracked deterministic state lives in:
  - `.codex/automations/notion-surface-lock.json`
  - `.codex/automations/check-waivers.json`
  - `reports/automations/state/runtime-maturity.json`
  - `reports/automations/state/notion-writeback-promotion.json`
  - `reports/automations/state/open-decisions-legacy-bridge.json`
  - `reports/automations/state/manual-approvals.json`
  - `reports/automations/state/gate-eligibility-snapshot.json`
- volatile runtime-observed state stays local-only in:
  - `reports/automations/state/runtime-observed/*.json`
  - `reports/automations/state/execution-runs/*.json`
- `ah-notion-sync-director` stays `report-first` until live audit, dry-run diff, manual approval, and promotion state all align
- operational DB writes never resolve targets by title or name after a locked target id or data source id exists
- manual approvals are addressable and fail-closed by exact tuple:
  - `surface`
  - `targetId`
  - `dataSourceId`
  - `contractHash` or `contractVersion`
  - `diffHash`
- Notion-facing feeder and synthesis reports should emit the full packet envelope: `recordTitle`, `syncKey`, `notionSurface`, `writeMode`, `sourceReportId`, `source`, `confidence`, `lastVerifiedAt`, `actionNeeded`
- for any operational packet, identity is `syncKey`; `recordTitle` is display-only

Why this split exists:

- it keeps canonical docs safe from accidental overwrite
- it prevents multiple automations from spamming the same Notion surfaces
- it makes every Notion update traceable back to one evidence packet
- it keeps volatile observations out of the writeback decision path

Recommended Notion-pack activation after feeder loops are already producing reports:

Prerequisite feeder/synthesis reports:

1. `ah-product-os-radar`
2. `ah-execution-brief-sync`
3. `ah-design-drift-vs-contract`
4. `ah-truth-freshness-watch`

Then enable the Notion pack:

1. `ah-open-decisions-curator`
2. `ah-release-gate-sync`
3. `ah-review-learning-distiller`
4. `ah-notion-sync-director` in `report-first` mode
5. enable live write-back only after the lock, diff, approval, and promotion state all match
6. enable `ah-draft-pr-executor` only after packet-level executor eligibility is confirmed in the gate snapshot

Related repo doc:

- `AUTOMATIONS_NOTION_AI_HANDOFF.md` for the post-audit Notion AI cleanup pass
