---
name: plugin-surface-governance
description: Use when auditing or changing Active Holidays plugin or MCP surface, especially `.cursor/mcp.json`, `.agents/plugins/marketplace.json`, `plugins/*/.codex-plugin/plugin.json`, or runtime-plugin decision rules.
---

# Plugin Surface Governance

## Goal

Keep plugin and MCP additions justified, minimal, and aligned with the existing skill and automation layer.

## When To Use

- plugin or MCP audit work
- deciding whether a repo-local plugin should exist at all
- editing `.cursor/mcp.json`
- editing `.agents/plugins/marketplace.json`
- editing `plugins/*/.codex-plugin/plugin.json`
- tightening plugin discoverability or validation around repo-local workflows

## Load Shared Context

- `../_shared/active-holidays/plugin-surface.md`
- `../_shared/active-holidays/product-context.md`
- `../_shared/active-holidays/anti-patterns.md`
- `../_shared/active-holidays/review-checklists.md`

## Inspect

- `plugins/*/.codex-plugin/plugin.json`
- `.agents/plugins/marketplace.json`
- `.cursor/mcp.json`
- `.codex/skills/README.md`
- `.codex/automations/README.md`
- `.codex/automations/ah-plugin-mcp-surface-watch/automation.toml`
- `scripts/automations/check-context-surface.ts`

## Workflow

1. Inventory the live plugin and MCP surface before proposing any new layer.
2. Separate runtime-plugin capability, repo-local docs/routing gaps, and true repo-local plugin needs.
3. Prefer the smallest durable fix:
   - docs or router update
   - validator or automation upgrade
   - repo-local plugin scaffold only if the first two are not enough
4. If a repo-local plugin is still justified, use the real `plugin-creator` contract and keep manifest plus marketplace state coherent.
5. Verify the surface and state clearly whether the result was a docs-only improvement, a validation improvement, or a real plugin addition.

## Hard Rules

- No invented plugin formats or marketplace fields.
- No repo-local plugin for a one-off task.
- No `.cursor/mcp.json` without a concrete repo-local use case.
- No marketplace entry without a deliberate relationship to the local plugin manifest.
- No duplicated operator context across skills, automations, and plugin docs.

## Companion Skills

- `repo-hygiene-and-structure`
- `release-readiness`
- global `plugin-creator`
