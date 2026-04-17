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
