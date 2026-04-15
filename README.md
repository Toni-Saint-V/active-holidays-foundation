# Active Holidays Foundation

Phase 1 scaffold for a new `Active Holidays` codebase.

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
- bootable Express API with `/api/health`
- shared contract baseline in `shared/contracts`
- theme tokens and base Tailwind setup
- strict TS/Vite/Vitest baseline

## Architecture Guardrails

- `src/` is browser-facing application code.
- `server/` is server-only code and must never be imported into client modules.
- `shared/contracts/` is the stable cross-layer surface for small typed DTOs and schemas.
- Phase 1 keeps contracts minimal on purpose and does not introduce real domain or API logic yet.

Next phases will add:

- domain contracts
- local JSON DB
- deterministic decision engine
- typed API routes
- interactive product flows
