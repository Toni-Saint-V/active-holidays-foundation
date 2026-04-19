# Active Holidays Foundation

Phase 3 decision skeleton for a new `Active Holidays` codebase.

## Stack

- React 18
- TypeScript strict
- Vite
- React Router v6
- TailwindCSS
- Framer Motion
- Zustand
- Express
- Vitest

## Scripts

- `npm run dev` — client
- `npm run server` — API
- `npm run dev:all` — client + API
- `npm run build` — client build
- `npm run test` — unit tests
- `npm run typecheck` — TypeScript check

## Environment

- Copy `.env.example` when you need to override the API port locally.

## Current Scope

This repository currently contains:

- bootable client shell
- route registration for all primary screens
- first deterministic intake -> result flow
- structured result with trust/documents sections
- bootable Express API with `/api/health`
- shared contract baseline in `shared/contracts`
- typed local repository for a small decision session history
- minimal Zustand app state for the active flow workspace
- theme tokens and base Tailwind setup
- strict TS/Vite/Vitest baseline

## Repo-Local Codex Skills

Repo-local skill overrides are versioned in `.codex/skills/`.

Current repo-local override set:

- `bank-grade-review`

The rest of the Active Holidays workflow relies on the shared global skills to
avoid duplicate shadow copies. This matches the current Notion execution layer
for the project, where the active stack includes:

- `product-os-audit`
- `build-brief-orchestrator`
- `lovable-redline`
- `notion-catalog-sync`
- `phase-gate-sync`
- `market-reality-product-innovation`
- `notion-ai-sync-director`
- `lovable-step-prompts`
- `ai-interactive-screen-audit`
- `ui-motion-performance-polish`

## Repo-Local Codex Automations

The automation suite for this repository lives in `.codex/automations/`.

Key entrypoints:

- `AUTOMATIONS_AUDIT.md`
- `AUTOMATIONS_ROADMAP.md`
- `AUTOMATIONS_OPERATING_MODEL.md`
- `RUNBOOK.md`
- `npm run automations:verify`
- `npm run automations:sync -- --dry-run`

## Architecture Guardrails

- `src/` is browser-facing application code.
- `server/` is server-only code and must never be imported into client modules.
- `shared/contracts/` is the stable cross-layer surface for small typed DTOs and schemas.
- Component-local state owns the intake draft until submit.
- Zustand owns only the active submitted workspace and hydration status.
- Deterministic flow logic lives in `src/domain/`, storage details stay in `src/data/`.
- `result`, `documents`, and `trust` consume derived session state rather than raw persistence data.

Next phases will add:

- local JSON DB
- deterministic decision engine
- typed API routes
- interactive product flows
