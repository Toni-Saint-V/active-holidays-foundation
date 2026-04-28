# Active Holidays Plugin Surface

## Goal

Keep plugin and MCP surface minimal, real, and worth maintaining.

## Default Decision Order

1. Existing repo-local skills, shared context, and task templates
2. Existing runtime plugins available in the active Codex session
3. Repo-local automation or validation upgrade
4. Repo-local plugin scaffold only when the first three options are not enough

## Runtime Plugin Usage

When available in the current Codex session, prefer existing runtime plugins before creating repo-local plugin scaffolds:

- Figma: design reads, code-connect, design-system translation, and Figma write workflows
- GitHub: PR, review, issue, and CI inspection work
- Notion: source-of-truth reconciliation, execution docs, and planning sync

Do not assume a plugin is available in every environment. Check the live session first.

## Product/System Intelligence Contract

Use `npm run automations:intelligence:contract` to inspect the repo-local contract before changing MCP or agent-flow surfaces.

- Memory MCP is a core decision-memory layer for durable product/system choices, review lessons, and operator preferences.
- GitHub control is the core task/PR/review/CI lane through the active runtime plugin/MCP or `gh` fallback.
- LangGraph is the enhancement layer for complex agent flows and runtime checkpoint state.
- `gate-eligibility-snapshot.json` owns execution eligibility; Memory MCP and LangGraph must not override it.
- Do not create a Landgraf substitute, invented external memory endpoint, or repo-local MCP config until a real binding and repeated workflow are known.

## Repo-Local Plugin Files

- `plugins/*/.codex-plugin/plugin.json`
- optional `.agents/plugins/marketplace.json`
- optional `.cursor/mcp.json`
- supporting repo docs or checks when the surface becomes part of normal workflow

## Local Plugin Threshold

Create or keep a repo-local plugin only when all of the following are true:

- the workflow is repeated enough to justify a maintained local surface
- a normal skill, shared doc, or automation cannot express the workflow cleanly
- the plugin has a clear owner and stable local path in this repository
- the manifest and any marketplace entry follow the real plugin contract instead of an invented shape
- the plugin measurably reduces operator friction instead of adding another layer to reason about

## Anti-Patterns

- creating a plugin for a one-off task or a vague future idea
- adding `.cursor/mcp.json` without a concrete repo-local need
- inventing marketplace fields or plugin manifest structure
- keeping the same workflow rules duplicated across skills, automations, and plugin docs
- creating a repo-local plugin when an existing runtime plugin already covers the job well enough

## Verify

- `npm run skills:verify`
- `npm run automations:check:context`
- `npm run automations:verify` when automation prompts or supporting docs changed

## Companion Skills

- repo-local `plugin-surface-governance`
- repo-local `repo-hygiene-and-structure`
- global `plugin-creator`
