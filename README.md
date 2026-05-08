# Active Holidays Foundation

Next.js M1 surface for Active Holidays: AI-first visa travel readiness for Russian citizens.

## Production UI Surface

Public user-facing routes:

- `/` — landing with the plane hero asset
- `/intake` — 4-question intake
- `/calculating` — short transition state before verdict
- `/result` — verdict, country-specific photo, documents, risk, AI plan
- `/human-review` — expert handoff form

No legacy Vite UI, React Router screen tree, `src/screens`, `src/ui`, or generated `dist` surface should exist in this branch.

## Current Stack

- Next.js 14 App Router
- React 18
- TypeScript strict
- TailwindCSS
- OpenAI SDK with Responses API for screen-level AI insight blocks
- Express/server + shared domain contracts for the broader product logic
- Vitest for domain and integration tests

## Key UI Files

- `src/app/page.tsx`
- `src/app/intake/IntakePageClient.tsx`
- `src/app/calculating/CalculatingPageClient.tsx`
- `src/app/result/ResultPageClient.tsx`
- `src/app/human-review/HumanReviewPageClient.tsx`
- `src/components/*`
- `src/lib/constants.ts`
- `src/lib/countryData.ts`
- `src/lib/verdict.ts`
- `src/lib/aiSurfaces.ts`
- `public/photos/plane.webp`
- `public/photos/landmark-it.webp`
- `public/photos/landmark-es.webp`
- `public/photos/landmark-fr.webp`
- `public/photos/landmark-gr.webp`

## Scripts

- `pnpm run dev` — local Next.js app
- `pnpm run build` — production build
- `pnpm run typecheck` — TypeScript check
- `pnpm run test` — Vitest suite
- `pnpm run verify` — forbidden-copy check, typecheck, build
- `pnpm run server` — Express API for domain/runtime work

## Environment

- `OPENAI_API_KEY` enables real AI screen insights. Without it, safe deterministic fallback text is rendered.
- `OPENAI_SCREEN_AI_MODEL` can override the screen AI model.
- `ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN` protects internal server transitions when server routes are used.
- Human review runtime state is local-only under `output/server-state/` unless explicitly configured otherwise.

## Scope Guard

The current UI branch should keep only the M1 user flow and its direct support code. General business/domain logic under `server/` and `shared/` remains part of the project because it supports current and future Active Holidays decisions.
