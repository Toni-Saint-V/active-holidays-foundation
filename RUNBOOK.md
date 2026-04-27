# Active Holidays Automation Runbook

## What This Repo Now Contains

- repo-local automation definitions: `.codex/automations/`
- deterministic helper scripts for:
  - truth / freshness
  - screen surface
  - flow instrumentation
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
npm run skills:verify
npm run autonomous:verify
npm run yepcode:orchestrator:test
npm run yepcode:orchestrator:dry-run
```

## Autonomous Stage A

Inspect the current safe task selection:

```bash
npm run autonomous:next
```

Prepare an executor packet without mutating git. This is still a preflight gate and expects clean tracked state:

```bash
npm run autonomous:execute -- --json
```

Create the local executor branch and run the baseline verification stack:

```bash
npm run autonomous:execute -- --write
```

## Dry-Run Sync Into Codex Home

```bash
npm run automations:sync -- --dry-run
```

## Install / Update The Suite

```bash
npm run automations:sync
```

Non-dry sync is intended to run from `main` after the repo-owned automation
contract has landed. From an implementation branch, use `--allow-branch-mismatch`
only for an intentional local activation or migration pass.

Optional narrow sync:

```bash
npm run automations:sync -- --only=ah-product-os-radar,ah-ui-premium-polish-pass
```

If you need a destructive reinstall that also resets installed `status`, use:

```bash
npm run automations:sync -- --force-reset-installed-state
```

## Activation Model

- repo defaults are intentionally `PAUSED`
- this keeps the suite safe until the owner chooses which loops go live first
- installed activation lives in `${CODEX_HOME:-$HOME/.codex}/automations/`
- prefer the repo-owned `ah-*` automation ids over legacy unprefixed copies

Recommended first activation order:

1. `ah-product-os-radar`
2. `ah-truth-freshness-watch`
3. `ah-execution-brief-sync`
4. `ah-design-drift-vs-contract`
5. `ah-copy-trust-upgrade`

Legacy installed copies without the `ah-` prefix should stay `PAUSED` once the
matching `ah-*` automation is active. Do not delete them during a migration
unless the owner explicitly asks for destructive cleanup.

Because the local CLI does not expose a stable automation-status command during this audit, activation should be done in the Codex automation UI or by editing the copied `automation.toml` files in `${CODEX_HOME:-$HOME/.codex}/automations/` using the live status value supported by that Codex build. `automations:sync` now preserves the installed `status` field by default; only `--force-reset-installed-state` resets it.

## How To Disable

- safest path: set the installed automation back to `PAUSED`
- or remove the specific automation directory from `${CODEX_HOME:-$HOME/.codex}/automations/`

## Runtime Outputs

- dated runs belong in `reports/automations/runs/<automation-id>/`
- current pointer belongs in `reports/automations/runs/<automation-id>/latest.md`
- tracked deterministic state belongs in:
  - `.codex/automations/notion-surface-lock.json`
  - `.codex/automations/check-waivers.json`
  - `reports/automations/state/runtime-maturity.json`
  - `reports/automations/state/notion-writeback-promotion.json`
  - `reports/automations/state/open-decisions-legacy-bridge.json`
  - `reports/automations/state/manual-approvals.json`
  - `reports/automations/state/gate-eligibility-snapshot.json`
- volatile runtime-observed state belongs in:
  - `reports/automations/state/runtime-observed/*.json`
  - `reports/automations/state/execution-runs/*.json`

Tracked singleton state is part of the repo-owned control-tower contract.
Only volatile runtime-observed state stays gitignored.
Example outputs stay committed next to each automation definition as `sample-output.md`.

## Deterministic Helpers

### Truth freshness and integrity

```bash
npm run automations:check:truth
```

### Screen surface / premium UI baseline

```bash
npm run automations:check:screens
```

### Flow instrumentation

```bash
npm run automations:check:flow
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
npm run skills:verify
```

## Safe Defaults

- default status is paused
- external write-back is disabled
- truth/process automations report first, then human approves changes
- premium UI automations stay focused on one strong improvement at a time
- live Notion writeback stays fail-closed unless lock, contract hash, diff hash, manual approval, and promotion state all match
