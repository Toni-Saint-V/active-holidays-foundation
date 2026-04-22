---
name: architecture-guardrails
description: Use when Active Holidays work changes state, routes, shared contracts, or domain boundaries and must keep client, server, and shared ownership clean.
---

# Architecture Guardrails

## Goal

Keep the codebase easy to reason about and safe to extend.

## When To Use

- `src/state/caseStore.ts`
- `src/lib/apiClient.ts`
- `server/routes/*`
- `server/lib/*`
- `shared/contracts/*`
- `shared/domain/*`

## Load Shared Context

- `../_shared/active-holidays/architecture-map.md`
- `../_shared/active-holidays/anti-patterns.md`

## Workflow

1. Identify the owning layer and the public contract the change will affect.
2. For schema or payload changes, update the shared contract, server validation / route, client parser / caller, and the nearest real tests in one pass.
3. Keep business rules in `shared/domain` or server-side orchestration, not in presentational UI.
4. Make state ownership explicit.
5. Add tests where a boundary or lifecycle assumption changed.

## Hard Rules

- `src/` must not import `server/`.
- Do not change a shared contract without updating the real callers and parsers in the same change.
- Do not leak raw storage shapes into UI components.
- Do not create a second owner for the same state.
- Prefer extending contracts over hidden ad-hoc payload shapes.
- If payload meaning changes materially, keep rollout or version coordination explicit.

## Companion Skills

- `golden-evals`
- `production-hardening`
- `docs-and-handoff`
