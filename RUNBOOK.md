# Active Holidays Automation Runbook

## What This Repo Now Contains

- repo-local automation definitions: `.codex/automations/`
- deterministic helper scripts for:
  - truth / freshness
  - screen surface
  - skill dedupe
  - context surface
- install/sync and verification scripts: `scripts/codex/`
- runtime report contract: `reports/automations/`

## Prerequisites

- run from `/Users/user/Projects/active-holidays-foundation`
- Node / npm available
- existing Codex home available at `${CODEX_HOME:-$HOME/.codex}`

## Verify Before Installing

```bash
npm run automations:verify
npm run automations:check:all
```

## Dry-Run Sync Into Codex Home

```bash
npm run automations:sync -- --dry-run
```

## Install / Update The Suite

```bash
npm run automations:sync
```

Optional narrow sync:

```bash
npm run automations:sync -- --only=ah-product-os-radar,ah-ui-premium-polish-pass
```

## Activation Model

- repo defaults are intentionally `PAUSED`
- this keeps the suite safe until the owner chooses which loops go live first

Recommended first activation order:

1. `ah-agent-memory-guard`
2. `ah-skill-dedupe-gap-harvester`
3. `ah-product-os-radar`
4. `ah-ui-premium-polish-pass`
5. `ah-design-drift-vs-contract`

Because the local CLI does not expose a stable automation-status command during this audit, activation should be done in the Codex automation UI or by editing the copied `automation.toml` files in `${CODEX_HOME:-$HOME/.codex}/automations/` using the live status value supported by that Codex build.

## How To Disable

- safest path: set the installed automation back to `PAUSED`
- or remove the specific automation directory from `${CODEX_HOME:-$HOME/.codex}/automations/`

## Runtime Outputs

- dated runs belong in `reports/automations/runs/<automation-id>/`
- current pointer belongs in `reports/automations/runs/<automation-id>/latest.md`
- optional local state belongs in `reports/automations/state/`

These runtime paths are gitignored. Example outputs stay committed next to each automation definition as `sample-output.md`.

## Deterministic Helpers

### Truth freshness and integrity

```bash
npm run automations:check:truth
```

### Screen surface / premium UI baseline

```bash
npm run automations:check:screens
```

### Repo-local skill duplication

```bash
npm run automations:check:skills
```

### Context surface

```bash
npm run automations:check:context
```

## How To Extend The Suite

1. Add a new folder in `.codex/automations/`.
2. Add `automation.toml`.
3. Add `sample-output.md`.
4. Update:
   - `AUTOMATIONS_AUDIT.md`
   - `AUTOMATIONS_ROADMAP.md`
   - `AUTOMATIONS_OPERATING_MODEL.md`
5. Run:

```bash
npm run automations:verify
npm run automations:check:all
```

## Safe Defaults

- default status is paused
- external write-back is disabled
- truth/process automations report first, then human approves changes
- premium UI automations stay focused on one strong improvement at a time
