---
name: ah-repo-automation
description: "Active Holidays: repo automation, skills, plugins, MCP и Codex-surface hygiene. Используй для чистки skill catalog, automation checks, plugin/MCP governance и routing docs."
---

# AH Repo Automation

## Goal

Keep the repo's automation and Codex operating surface small, coherent, and verifiable.

## When To Use

- skill catalog cleanup
- `.codex/skills`, `.codex/automations`, scripts/codex changes
- plugin / MCP / connector governance
- automation verification and context checks
- router, bundle, template, mode docs

## Workflow

1. Reduce visible actions before adding new ones.
2. Keep one canonical router contract.
3. Preserve internal rules as docs instead of exposing every rule as a skill.
4. Run skill and automation checks after changes.
5. Use internal references only when needed:
   - `_internal/repo-hygiene-and-structure.md`
   - `_internal/plugin-surface-governance.md`
   - `_internal/docs-and-handoff.md`
   - `_shared/active-holidays/plugin-surface.md`

## Hard Rules

- No duplicate global/repo-local shadow skills unless intentionally justified.
- No 70-item visible action list.
- No speculative plugin or MCP layer.
