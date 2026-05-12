# Project Operator Context Pack

Generated: 2026-05-12
Branch: `research/project-context-pack-2026-05-12`
Scope: read-only repo inspection plus this single markdown report.

## Product Summary

Active Holidays Foundation is an AI-first visa and travel-readiness product for Russian citizens planning international travel, with the M1 wedge focused on Schengen readiness from Moscow/Saint Petersburg.

In plain terms: the user selects a destination, answers a short intake, gets a readiness/risk result, and can escalate complex cases to human review. The broader backend/domain layer also supports deterministic decisioning, offer ranking, scenario comparison, human-review operations, evidence freshness, and automation governance.

The current public UI is a Next.js App Router M1 surface:

- `/` selects a Schengen destination and starts the check.
- `/intake` collects dates, purpose, refusal context, and optional document upload intent.
- `/calculating` shows a short transition state.
- `/result` shows a readiness/risk result and next action.
- `/human-review` collects contact/context for expert escalation and can generate an AI brief.

The strongest product boundary in the repo is: deterministic domain contracts decide; AI may explain, draft, summarize, or structure, but must not own readiness decisions or make visa certainty claims.

## MVP Definition

MVP appears to be M1 visa readiness, not a broad travel marketplace.

Required for MVP based on `docs/product-canon-v1.md`, `README.md`, and current code:

- Focused public flow: Landing -> Quick Visa Intake -> Deterministic Verdict -> Trust Layer -> Insurance Attach / Human Review Lead.
- Russian-first user-facing copy.
- Stable verdict contract based on `ResultPayload` and canonical engine verdicts.
- Public readiness presentation adapter for six user-facing states without replacing the four engine verdicts.
- Trust layer showing sources, freshness, confidence, assumptions, and human fallback.
- Human review lead flow that is honest if lead-only and production-safe if operational.
- Insurance attach as first monetization proof, with clear disclosure and no forced purchase language.
- Local verification gate: typecheck, tests, build, plus domain/automation checks where relevant.

Current MVP gap: the backend/domain layer is stronger than the public Next UI integration. The public `/result` UI currently derives a local `VerdictKind` from query params/days and carries `ENGINE_CLASS = deterministic-mock-v0`; it does not render the full server/shared `ResultPayload` contract.

## Main User Flows

1. Public visa-readiness flow:
   Landing country choice -> `/intake?country=...` -> dates/purpose/refusal questions -> optional document modal -> `/calculating` -> `/result`.

2. Preliminary vs verified result:
   Intake can continue without documents as `resultType=preliminary`, or with a simulated document upload as `resultType=verified`; result copy and cards change accordingly.

3. Human review lead:
   Result CTA or risk/plan action -> `/human-review` with country/verdict/date params -> user enters name/contact/context -> optional AI brief -> submit CTA.

4. Screen-level AI helper flow:
   Next API routes under `/api/ai/*` validate inputs with Zod and call `src/lib/aiSurfaces.ts`; if `OPENAI_API_KEY` is absent, deterministic recovery/fallback copy is used.

5. Domain API flow:
   Express server on `PORT` default `3001` exposes cases, result recompute, decisions/replay, rules, sources, paths, intake preview, scenario lab, recommendations, and human review workbench endpoints.

6. Human review operations flow:
   Public case-level endpoints can create/reuse handoff requests; internal workbench endpoints under `/api/human-review/*` require `ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN` for queue, actions, learning, and calibration.

7. Autonomous operator flow:
   `.autonomous/*`, `.codex/automations/*`, and `scripts/autonomous/*` select next safe tasks, produce dry-run packets, verify gates, and keep external writes fail-closed.

8. YepCode task-orchestrator flow:
   `automation/yepcode/active-holidays-orchestrator` normalizes founder notes into task JSON, Notion payload drafts, GitHub issue payload drafts, and Codex briefs; production writes require explicit env and `allow_external_writes=true`.

## Architecture Map

Frontend:

- Framework: Next.js 14 App Router, React 18, TypeScript strict, Tailwind.
- Entry routes: `src/app/page.tsx`, `src/app/intake/page.tsx`, `src/app/calculating/page.tsx`, `src/app/result/page.tsx`, `src/app/human-review/page.tsx`.
- Client components: `IntakePageClient`, `CalculatingPageClient`, `ResultPageClient`, `HumanReviewPageClient`.
- Shared UI components: `src/components/*`.
- Frontend helpers: `src/lib/constants.ts`, `src/lib/countryData.ts`, `src/lib/verdict.ts`, `src/lib/aiSurfaces.ts`, `src/lib/apiClient.ts`.
- Instrumentation files exist under `src/instrumentation`, but current App Router screens do not appear wired to the older `src/screens` automation checks.

Backend:

- Express app in `server/index.ts`.
- Catalog loading: `server/lib/catalogs.ts` from `data/db/*.json`.
- Case/decision state: `server/lib/caseStore.ts`.
- Human review persistence: local JSON under `output/server-state/*` by default, configurable by env.
- Middleware: Zod validation, internal token guard, request logging, error handling.
- Routes: `/api/health`, `/api/cases`, `/api/sources`, `/api/rules`, `/api/paths`, `/api/intake`, `/api/decisions`, `/api/scenarios`, `/api/human-review`.

Shared domain:

- Contracts: `shared/contracts/*` are the authority for API/domain payloads.
- Engine: `shared/domain/engine/*`, with `ENGINE_VERSION = rdc.v1` and `ENGINE_REVISION = 2026.04.18`.
- Core modules: rules, offers, risk, confidence, volatility, evidence, audit, action, signals, AI/adaptive intake.
- Public readiness adapter: `shared/contracts/publicReadiness.ts`.
- M1 scope contract: `shared/contracts/m1Scope.ts`.

Data:

- Seed catalogs in `data/db`: 5 cases, 8 visa rules, 6 travel paths, 5 residency programs, 6 insurance products, 16 sources, 14 rule-evidence rows, 4 restrictions, 4 decision log rows.
- Scenario matrix in `data/scenarios/scenarios.json`: 5 baseline scenarios across travel, residency, and insurance.
- Drift baselines in `data/scenarios/baseline/*.json`.

Scripts and automation:

- Verification scripts: typecheck, Vitest, Next build, forbidden copy, import boundaries, engine drift, agent stack, M1 scope audit.
- Codex/router scripts: `scripts/codex/*`.
- Repo automations: `.codex/automations/*` plus registry/governance checks.
- Autonomous OS: `.autonomous/*` plus `scripts/autonomous/*`.
- UI QA scripts: `scripts/ui/*`.
- YepCode orchestrator: `automation/yepcode/active-holidays-orchestrator/*`.

CI/release:

- `.github/workflows/ui-polish-gate.yml` runs on PRs and manual dispatch.
- `.github/workflows/autonomous-checks.yml` is manual only because docs state automatic Actions are blocked by billing.
- PR template requires local `npm run verify:local` output.

## Source Of Truth

Authoritative files:

- Product scope: `docs/product-canon-v1.md`.
- Current public UI surface: `README.md` plus `src/app/*`.
- Operator rules: `AGENTS.md`.
- Runtime scripts/dependencies: `package.json`.
- Domain contracts: `shared/contracts/*`.
- Deterministic engine: `shared/domain/engine/*`.
- Catalog truth: `data/db/*.json`.
- Scenario truth/drift: `data/scenarios/scenarios.json` and `data/scenarios/baseline/*.json`.
- Automation registry: `scripts/codex/automation-registry.ts` and `.codex/automations/*`.
- Autonomous OS: `.autonomous/operating-system.md`, `.autonomous/task-candidates.json`, `scripts/autonomous/runtime.ts`.
- CI intent: `.github/workflows/*` and `.github/pull_request_template.md`.

Conflicts and drift:

- `README.md` says current stack is Next.js and no legacy Vite/React Router screen tree should exist. This matches current `src/app`.
- `docs/m1-readiness-audit.md` contains older audit notes referencing Vite build output and extra non-M1 routes that are not present in the current tracked `src/app` tree.
- `automation/yepcode/active-holidays-orchestrator/README.md` says framework is Vite + React + TypeScript; current repo is Next.js App Router.
- `.autonomous/task-candidates.json` and several `.codex/skills/_shared/*` docs reference legacy `src/screens/*`, `src/presentation/*`, and `src/ui/*` paths that do not exist.
- `scripts/audit-m1-scope.ts` reads `src/app/router.tsx` and `src/app/AppShell.tsx`, which do not exist in this branch.
- `scripts/automations/check-screen-surface.ts` and `scripts/automations/check-flow-instrumentation.ts` expect `src/screens` and older instrumentation wiring; likely stale against the current App Router UI.
- `package.json` includes `product:intelligence:*` scripts pointing to `scripts/product/build-product-intelligence.ts`, but `scripts/product` is absent.
- `package.json` `verify` uses `pnpm run ...` while the user-requested commands and several docs use `npm`; the repo has `pnpm-lock.yaml`, so package-manager policy should be explicit.

## Current Systems And Readiness

Product runtime: Medium / internal beta.

- Next public routes exist and build.
- UI is coherent for the M1 path.
- Runtime gap: public result is still query/local-state driven and marked mock, not fully wired to server `ResultPayload`.

Domain engine: High for repo-local deterministic scenarios.

- Engine has stable version/revision, drift baselines, scenario alignment tests, replay/fingerprint support, evidence fail-closed behavior, and public-readiness adapter.
- Risk: public UI does not yet consume the full engine output.

Data/state reliability: Medium.

- Seed catalogs are Zod-validated and scenario baselines exist.
- Case store is in memory for server runtime; human review/learning state persists to local JSON with atomic temp writes and corruption quarantine.
- Production persistence policy is not equivalent to durable database readiness.

Autonomous OS: Medium.

- Strong repo-local scaffolding exists: deterministic candidate scoring, safety gates, health/Level B packets, automation registry, and fail-closed writeback rules.
- Drift risk is high because multiple candidates/checks point to legacy file paths.

Release governance: Medium.

- Local gates exist and CI has a real UI polish workflow.
- Autonomous checks workflow is manual due billing note.
- PR template correctly requires local proof.

UI/UX: Medium.

- M1 App Router UI is mobile-first, Russian, and trust-aware.
- Result/human-review flow still includes mock/preview markers and simulated document verification.
- Visible legal/trust disclosure is present in places, but full MVP monetization/insurance attach is not implemented in the public result.

Testing/CI: Medium.

- Vitest coverage is broad across contracts, engine, server routes, automations, and UI helpers.
- No Playwright config was found, while UI/automation docs still imply Playwright smoke/visual checks.
- Some automation checks target dead paths.

Documentation: Medium.

- Product canon and README are useful.
- Several automation, YepCode, skill, and autonomous docs are stale relative to the current Next App Router tree.

## Important Scripts

Daily development:

- `npm run dev`: Next dev server.
- `npm run server`: Express API server on `PORT` default `3001`.
- `npm run dev:all`: Next + Express together.
- `npm run typecheck`: TypeScript check.
- `npm test`: Vitest suite.
- `npm run build`: Next production build.

Critical PR/local gate:

- `npm run verify:local`: alias to `npm run verify`.
- `npm run verify`: forbidden-copy check, typecheck, build. Note: uses `pnpm run` internally.
- `npm run verify:forbidden-copy`: blocks risky public claims in `src`.
- `npm run verify:boundaries`: checks browser/server/shared import boundaries.
- `npm run verify:engine`: checks scenario drift against baselines.
- `npm run verify:agent-stack`: OpenAI/LangGraph/Tavily API surface smoke without requiring real keys.

Domain and launch audits:

- `npm run audit:m1-scope`: intended non-blocking M1 route audit, but currently targets missing legacy router files.
- `npm run ui:polish-check`: screen lab + visual diff + typecheck + build.
- `npm run ui:screen-lab`, `npm run ui:baseline:refresh`, `npm run ui:visual-diff`: UI proof tooling.

Codex/operator:

- `npm run do -- "task"`: primary simplified command surface.
- `npm run check`: local branch check bundle.
- `npm run ah -- advanced`: advanced command menu.
- `npm run skills:detect-mode`, `npm run skills:start`, `npm run skills:autopilot`, `npm run skills:orchestrate`: task routing and skill orchestration.
- `npm run skills:verify`, `npm run skills:evaluate-agents`: skill/router integrity.

Automation/autonomous:

- `npm run automations:verify`: repo automation contract checks.
- `npm run automations:check:all`: automation registry/context/truth/screen/flow checks.
- `npm run autonomous:next`: next safe task selection.
- `npm run autonomous:cycle`: dry-run autonomous execution cycle.
- `npm run autonomous:execute`: execution packet.
- `npm run autonomous:health`: health snapshot.
- `npm run autonomous:level-b`: Level B dry-run.
- `npm run autonomous:verify`: autonomous OS verifier.

External orchestration:

- `npm run yepcode:orchestrator:dry-run`: local dry-run task normalization.
- `npm run yepcode:orchestrator:test`: orchestrator checks.

Potentially broken/stale scripts:

- `npm run product:intelligence:build`, `npm run product:intelligence:check`, `npm run product:intelligence:test`, `npm run product:seed`: reference missing `scripts/product/*`.
- `npm run audit:m1-scope`: references missing App Router legacy files.
- `npm run automations:check:screens` and `npm run automations:check:flow`: expect legacy `src/screens` and may fail until updated for current `src/app`.

## Risk Map

1. Public UI/domain split:
   The public Next result flow is not yet rendering the full deterministic server/shared `ResultPayload`; this weakens the "engine decides, UI renders" rule.

2. Stale operator routing:
   Automation, skills, autonomous candidates, and YepCode docs still route some tasks to missing legacy files. ChatGPT/project orchestration can generate bad work unless these paths are reconciled.

3. Production human review persistence:
   Local JSON persistence is robust for local/runtime demos, but production needs owner, SLA, durable store policy, and token configuration.

4. Insurance attach gap:
   Insurance exists as a domain vertical and catalog, but public M1 result does not yet expose a launch-ready insurance attach CTA/events/disclosure.

5. CI ambiguity:
   One workflow is PR-based, another is manual due billing; release truth currently depends on local verification evidence.

6. E2E/visual proof gap:
   Playwright dependency exists and UI scripts exist, but no standard Playwright config was found and older docs say E2E was missing/broken.

7. Package-manager ambiguity:
   `pnpm-lock.yaml` exists and `verify` calls `pnpm`, but common commands/docs use `npm`.

8. AI boundary risk:
   AI generation paths have strong fallback/claim guards, but public operators must preserve the rule that AI does not decide readiness.

## Do Not Touch Areas

- `shared/contracts/*`: contract changes ripple across frontend, server, tests, and automation.
- `shared/domain/engine/*`: deterministic decision logic requires engine revision discipline and drift baseline review.
- `data/db/*` and `data/scenarios/baseline/*`: catalog/baseline mutations affect product truth and drift gates.
- `server/lib/caseStore.ts` and human-review persistence/learning files: state lifecycle and idempotency are fragile.
- `server/middleware/internalApi.ts`: protects internal human-review operations.
- `.codex/automations/*`, `scripts/codex/*`, `.autonomous/*`: operator surface is broad and currently partially stale; avoid casual edits without targeted verification.
- `src/app/*` UI surfaces: AGENTS requires PNG approval before UI code changes.
- Public copy in `src`: forbidden-copy rules protect against visa certainty and internal-engine leakage.
- CI workflows: release proof is currently split between manual and PR gates.

## Recommended Next 10 Tasks

1. Wire public result to `ResultPayload` or explicitly document the current mock boundary.
   Rationale: closes the main MVP gap between domain engine and public UI.

2. Update stale automation/path contracts from `src/screens`/Vite to current `src/app`/Next.
   Rationale: prevents ChatGPT/Codex orchestration from generating work against dead paths.

3. Fix or retire `audit:m1-scope` for App Router.
   Rationale: current script references missing `src/app/router.tsx` and `AppShell.tsx`.

4. Decide package-manager policy and align `verify`.
   Rationale: `npm` and `pnpm` are mixed; daily and CI commands should be unambiguous.

5. Implement M1 insurance attach CTA on the result flow after UI approval.
   Rationale: first monetization proof is explicitly required by product canon.

6. Add launch-safe funnel events for intake completion, verdict shown, human review opened/submitted, insurance shown/clicked.
   Rationale: product cannot optimize conversion without trustworthy events.

7. Add minimal Playwright smoke for `/`, `/intake`, `/result`, `/human-review`.
   Rationale: closes E2E proof gap and supports UI polish gate.

8. Convert human-review public submit into a real persisted backend action or label it lead-only everywhere.
   Rationale: current public form prepares AI brief but needs production lifecycle clarity.

9. Run and repair `automations:check:all` against the current app tree.
   Rationale: autonomous OS readiness depends on automation checks matching repo reality.

10. Refresh YepCode orchestrator discovery docs and generated scopes.
    Rationale: current README and workflow scopes still mention Vite and `src/screens`.

## Questions For Owner

1. Should the public M1 result now be wired directly to the Express/domain `ResultPayload`, or should the current Next-only mock result remain as a design/demo surface for one more phase?

2. Which package manager is authoritative for this branch: `npm` or `pnpm`?

3. Is human review intended to be production lead capture in M1, or explicitly a lead-only/manual follow-up until durable persistence and ops ownership are approved?

4. Should autonomous/automation docs be updated immediately to App Router paths, or preserved as legacy context until a broader automation cleanup task?
