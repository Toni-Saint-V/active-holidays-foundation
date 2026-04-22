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

The suite now supports a Notion-aware operating loop:

1. feeder automations collect repo-backed evidence into `reports/automations/runs/<id>/latest.md`
2. synthesis automations turn that evidence into decisions, release truth, and execution briefs
3. `ah-notion-sync-director` becomes the only automation allowed to write operational truth back to Notion

Safety contract:

- `ah-notion-sync-director` stays `report-first` until the repo-owned Notion schema contract is manually confirmed against the live workspace
- exact operational surface names are contract-owned until repo stores live Notion ids
- Notion-facing packets should carry deterministic `syncKey` and explicit `writeMode` when they are meant for future sync

Why this split exists:

- it keeps canonical docs safe from accidental overwrite
- it prevents multiple automations from spamming the same Notion surfaces
- it makes every Notion update traceable back to one evidence packet

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
5. enable live write-back only after the schema contract is checked manually

Related repo doc:

- `AUTOMATIONS_NOTION_AI_HANDOFF.md` for the post-audit Notion AI cleanup pass
