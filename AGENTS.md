# AGENTS.md

## Core Rules

- Domain logic first, UI second.
- Never claim completeness without verification.
- Never leak secrets or server-only data to browser code.
- UI must depend on stable domain contracts, not raw storage shapes.
- All visible UI copy must be in Russian.
- Prefer the strongest real implementation over broad fake completeness.
- Repo-local custom Codex skills live in `.codex/skills` and should stay versioned with the repository when they affect this project's workflow.

## Project Ownership Rules

- Keep the whole Active Holidays project in view, not just the current file or isolated task.
- Do not behave like a narrow ticket executor when project continuity matters.
- Proactively define or surface the next strongest concrete task when it helps move the project forward.
- Keep delivery aligned with the current project phase, real constraints, and source-of-truth artifacts.
- When useful, prepare handoff-ready next-step blocks for Lovable, Cursor, Codex, or GitHub instead of making the user restate the work.

## Notion Discipline Rules

- When Notion is part of the workflow and access exists, treat it as a living source of truth, not passive reference material.
- Reconcile repo reality with Notion before making major planning, scope, or status claims.
- Keep task framing, progress, and execution state aligned between the implementation and Notion.
- After meaningful progress, scope change, or decision change, update the relevant Notion artifact or prepare the exact update block immediately.
- Do not let Notion drift away from the actual project state.

## Protocol Rules

- Ordinary discussion and clarification may use normal natural language.
- Structured formatting is mandatory only for execution-related outputs:
  - specs
  - implementation plans
  - task handoff blocks
  - status/progress blocks when they affect execution
  - checklists, risks, and acceptance criteria
- Do not force structured JSON for casual conversation unless the user explicitly asks for it.
- For any UI task, first show a PNG preview and wait for explicit user approval before changing UI code.
- Live browser screenshots are implementation proof only; they do not replace pre-implementation PNG approval.
- If a task mixes UI and non-UI work, non-UI execution may proceed, but the UI slice stays blocked until approval.

## Automation Rules

- Repo-local Codex automations live in `.codex/automations/`.
- Keep repo-local skills only when they differ from the shared global version; byte-identical copies should be removed instead of shadowing them.
- Automation definitions must stay runnable from `/Users/user/Projects/active-holidays-foundation`.
- Run `npm run automations:verify` after editing automation prompts, schedules, or supporting docs.
- Use `npm run automations:sync -- --dry-run` before copying repo-local automations into `$CODEX_HOME`.
- Runtime outputs belong in `reports/automations/` and must not turn into committed noise.

## Artifact Ownership Rules

- Keep deterministic source-of-truth state tracked only when a repo contract explicitly lists it.
- Keep browser captures in `output/playwright/`; use them as local proof or external review evidence, not as default committed source.
- Keep generated PDFs and copy packs in `output/pdf/` unless a curated document is intentionally moved into docs or Notion.
- Keep design approval packs in `reports/design/`; commit them only as a deliberate artifact pack after explicit approval.
- Keep scratch generation work in `tmp/` and root `.playwright-cli/` local-only.

## Plugin / MCP Surface Rules

- Prefer existing runtime plugins and shared skills before adding any repo-local plugin scaffold.
- Do not invent plugin manifests, marketplace entries, or MCP config shapes.
- Repo-local plugin work must stay anchored to real files: `plugins/*/.codex-plugin/plugin.json`, optional `.agents/plugins/marketplace.json`, and optional `.cursor/mcp.json`.
- If a repo-local plugin is added, it must solve a repeated repo-local workflow that skills, docs, or automations could not already cover cleanly.

## Skill Routing Rules

- Resolve exactly one primary operating mode before loading bundles or templates.
- Use `.codex/skills/modes.md`, `npm run skills:detect-mode`, or `npm run skills:start` to classify the task.
- Bundle choice and template choice must follow that same primary mode.
- Treat extra mode candidates as context only, not as permission to combine multiple primary modes.
- `skill-system-governance` is the primary mode for repo-local Codex surface work such as `.codex/skills/*`, `.codex/automations/*`, routing docs, `README.md`, `AGENTS.md`, and validator guidance.
- `skill-system-governance` is not a new abstraction layer; it is the maintenance mode for the existing router and operating docs.
- Move to `plugin-surface` only when plugin or MCP files are the dominant changed surface.

## Phase 1 Boundary

- Allowed: scaffold, routing, theme, tooling, client shell, server health route.
- Deferred: decision engine, data model, real API routes, AI interactions.

## Verification Rules

- Run `npm run build` after scaffold changes.
- Run `npm run test` after test or app-shell changes.
- Run `npm run typecheck` before closing a phase.
