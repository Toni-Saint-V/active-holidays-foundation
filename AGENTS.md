# AGENTS.md

## Core Rules

- Domain logic first, UI second.
- Never claim completeness without verification.
- Never leak secrets or server-only data to browser code.
- UI must depend on stable domain contracts, not raw storage shapes.
- All visible UI copy must be in Russian.
- Prefer the strongest real implementation over broad fake completeness.

## Phase 1 Boundary

- Allowed: scaffold, routing, theme, tooling, client shell, server health route.
- Deferred: decision engine, data model, real API routes, AI interactions.

## Verification Rules

- Run `npm run build` after scaffold changes.
- Run `npm run test` after test or app-shell changes.
- Run `npm run typecheck` before closing a phase.
