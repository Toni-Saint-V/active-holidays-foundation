---
name: repo-hygiene-and-structure
description: Use when cleaning folders, docs, scripts, or repo-local Codex surfaces in Active Holidays. Keeps naming, directory structure, context docs, skill and automation layers, and plugin or MCP surface lean and internally consistent.
---

# Repo Hygiene And Structure

## Goal

Reduce drift, duplicates, and dead repo surface.

## When To Use

- `.codex/skills/*`
- `.codex/automations/*`
- `plugins/*`, `.agents/plugins/*`, `.cursor/mcp.json`
- `README.md`, runbooks, repo scripts
- cleanup of unused or misleading files

## Workflow

1. Compare docs to the live filesystem before editing.
2. Remove stale references instead of layering more notes on top.
3. Prefer one canonical index/router file over repeated lists.
4. Keep repo-local skills only when they add repo-specific value.
5. Keep plugin and MCP surface justified, not speculative.
6. Flag empty placeholder directories and orphan surfaces.

## Hard Rules

- No duplicate repo-local shadow skills without a real override.
- No docs that promise files or skills that do not exist.
- No empty placeholder structures left unexplained.
- No speculative local plugin or MCP config layer.
- Do not change working paths casually; they are part of the repo contract.

## Companion Skills

- `docs-and-handoff`
- `release-readiness`
