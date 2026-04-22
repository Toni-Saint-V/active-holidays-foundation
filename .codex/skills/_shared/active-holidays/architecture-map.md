# Active Holidays Architecture Map

## Layer Ownership

- `src/`
  Browser-facing UI, screen routing, client-side instrumentation, Zustand state, and visual components
- `server/`
  Express routes, case store, scenario lab, recommendations, logger, and seed/catalog loading
- `shared/contracts/`
  DTOs, schemas, enums, and stable cross-layer contracts
- `shared/domain/`
  Deterministic engine, fingerprints, rules, confidence, offers, volatility, and next-action logic
- `data/`
  seed cases, catalogs, sources, scenarios, and baselines
- `scripts/`
  deterministic verification for engine drift and Codex automation/context checks

## State Ownership

- `src/state/caseStore.ts`
  Active case, result, scenario-lab state, audit data, bootstrap status
- `server/lib/caseStore.ts`
  persisted case mutations, ledger snapshots, replayable records, dedupe rules
- `shared/contracts/*`
  stable shapes that UI and server share

Do not leak `server/lib/caseStore.ts` shapes into the browser directly. Go through contracts and routes.

## Key File Map

### Result and trust loop

- `src/screens/result/ResultScreen.tsx`
- `src/screens/result/ResultCompareSurface.tsx`
- `src/screens/result/AiRecommendationPanel.tsx`
- `src/screens/documents/DocumentsScreen.tsx`
- `src/screens/trust/TrustScreen.tsx`
- `src/screens/human-review/HumanReviewScreen.tsx`

### Deterministic engine and actions

- `shared/domain/engine/orchestrator.ts`
- `shared/domain/engine/fingerprint.ts`
- `shared/domain/action/resolve.ts`
- `shared/domain/offers/*`
- `shared/domain/rules/*`

### API and persistence

- `server/routes/cases.ts`
- `server/routes/decisions.ts`
- `server/lib/caseStore.ts`
- `server/lib/decisionScenarioLab.ts`
- `server/lib/recommendations.ts`

### Visual system

- `src/styles/index.css`
- `src/theme/tokens.ts`
- `src/ui/primitives.tsx`
- `src/ui/*`

### Instrumentation and verification

- `src/instrumentation/events.ts`
- `src/instrumentation/screenView.ts`
- `server/middleware/logger.ts`
- `scripts/verify-engine-drift.ts`
- `scripts/automations/check-*.ts`

## Boundary Rules

- `src/` must not import `server/`
- shared contracts define browser-visible shapes
- server routes should validate request/response surfaces through contracts or explicit zod schemas
- UI screens should consume derived result state, not seed JSON details
- AI recommendation output must stay subordinate to deterministic result payloads and scenario compare output
