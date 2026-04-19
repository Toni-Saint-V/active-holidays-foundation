# AGENTS.md

## Core Rules

- Domain logic first, UI second.
- Never claim completeness without verification.
- Never leak secrets or server-only data to browser code.
- UI must depend on stable domain contracts, not raw storage shapes.
- All visible UI copy must be in Russian.
- Prefer the strongest real implementation over broad fake completeness.
- Repo-local custom Codex skills live in `.codex/skills` and should stay versioned with the repository when they affect this project's workflow.

## Automation Rules

- Repo-local Codex automations live in `.codex/automations/`.
- Keep repo-local skills only when they differ from the shared global version; byte-identical copies should be removed instead of shadowing them.
- Automation definitions must stay runnable from `/Users/user/Projects/active-holidays-foundation`.
- Run `npm run automations:verify` after editing automation prompts, schedules, or supporting docs.
- Use `npm run automations:sync -- --dry-run` before copying repo-local automations into `$CODEX_HOME`.
- Runtime outputs belong in `reports/automations/` and must not turn into committed noise.

## Phase 1 Boundary

- Allowed: scaffold, routing, theme, tooling, client shell, server health route.
- Deferred: decision engine, data model, real API routes, AI interactions.

## Verification Rules

- Run `npm run build` after scaffold changes.
- Run `npm run test` after test or app-shell changes.
- Run `npm run typecheck` before closing a phase.
