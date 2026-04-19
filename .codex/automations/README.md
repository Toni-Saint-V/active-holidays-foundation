# Active Holidays Repo-Local Automations

This folder contains the repo-local Codex automation suite for `active-holidays-foundation`.

Principles:

- use the same `automation.toml` shape already seen in `$CODEX_HOME/automations`
- keep default status safe (`PAUSED`)
- bind every automation to this repo cwd
- ship a sample output for every automation
- prefer AI-native product/process/agent/UI improvements over infra theatre
- prefer deterministic helpers where the repo exposes enough structure

Install flow:

```bash
npm run automations:verify
npm run automations:sync -- --dry-run
npm run automations:sync
```
