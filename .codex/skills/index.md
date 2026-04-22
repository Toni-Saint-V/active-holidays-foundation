# Active Holidays Skill Router

Use this file as the repo-local routing map for Codex work in `active-holidays-foundation`.

## Start Here

1. Load [protocol-structured-json-and-png-gate/SKILL.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/protocol-structured-json-and-png-gate/SKILL.md) first.
2. Resolve exactly one primary mode from [modes.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/modes.md), `npm run skills:detect-mode`, `npm run skills:start`, or `npm run skills:autopilot`.
3. Load the smallest shared context that answers the task.
4. Match the task either by problem type or by the changed files.
5. Open [bundles.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/bundles.md) for the one bundle attached to that mode.
6. Open [task-templates.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/task-templates.md) for the exact execution shape attached to that mode.
7. Add only the secondary skills the touched surface truly needs.
8. Finish with the review bundle from this file before calling the work complete.

## Routing Contract

- `modes.md` chooses the single primary mode.
- `bundles.md` narrows that mode into a lean loadout.
- `task-templates.md` gives the execution shape for that same mode.
- Default-on rules add supporting skills; they do not create a second primary mode.
- If `skills:detect-mode` or `skills:start` returns multiple candidates, only the top `mode` is active.

## Autopilot Flow

Use the entrypoints by intent:

- `skills:detect-mode`:
  only resolve the primary mode and candidate context.
- `skills:start`:
  resolve the mode and get the execution packet, file surface, verify commands, and adaptive agent recommendation.
- `skills:autopilot`:
  resolve the mode and get the full efficiency layer: routing confidence, execution lane, `recommendedAgentPack`, `executionPlan`, canonical `multiAgentPack`, and telemetry report.

Read the autopilot packet in this order:

1. `mode`
2. `routingConfidence`
3. `executionLane`
4. `recommendedAgentPack`
5. `executionPlan`
6. `verifyCommands`
7. `multiAgentPack`
8. `telemetryReport`

## Automatic Multi-Agent Packs

- `recommendedAgentPack` is adaptive for the current run.
  It reacts to surface complexity, confidence, review-only state, and PNG blocking.
- `multiAgentPack` is the stable mode-level ownership map from the registry.
  It should stay consistent across tasks in the same mode family.

Use both:

- start from `recommendedAgentPack` when you need the fastest safe split right now
- use `multiAgentPack` when you are shaping a durable repeatable operating model

## `skill-system-governance` Boundary

- `skill-system-governance` is the primary mode for repo-local Codex surface work.
- It owns routing docs, bundles, templates, `.codex` guidance, validator docs, and repo operating docs such as `README.md` and `AGENTS.md`.
- It is not a new abstraction layer over the router. It is the mode that maintains the existing router.
- If the task is truly about plugin or MCP surface behavior, switch to `plugin-surface`. If it is just `.codex` docs that mention plugins, stay in `skill-system-governance`.

## Base Context

Load the smallest shared context that answers the task:

- `./_shared/active-holidays/product-context.md`
  Product scope, source-of-truth rules, invariants, and core surfaces.
- `./_shared/active-holidays/architecture-map.md`
  Layer boundaries, state ownership, and important files.
- `./_shared/active-holidays/flow-map.md`
  Landing -> intake -> result -> trust/documents/human-review plus scenario-lab and AI recommendation branches.
- `./_shared/active-holidays/trust-and-ai-boundaries.md`
  Exact "AI explains, engine decides" contract, compare-only semantics, and fallback rules.
- `./_shared/active-holidays/terminology.md`
  Shared naming for verdicts, scenarios, compare-only, replay, drift, and trust surfaces.
- `./_shared/active-holidays/review-checklists.md`
  Architect/UI/UX/QA/Perf/Trust/Release checklists and finish conditions.
- `./_shared/active-holidays/anti-patterns.md`
  Repeated failure modes to reject before shipping.
- `./_shared/active-holidays/premium-ui-playbook.md`
  Premium UI rules for result, recommendation, trust, human-review, and landing surfaces.
- `./_shared/active-holidays/plugin-surface.md`
  Decision boundary for runtime plugins, local plugin scaffolds, and MCP surface changes.
- `./modes.md`
  Concrete operating modes and automatic mode detection rules for this repository.

## Route By Task Family

- Skill-system governance:
  use the `Skill-system governance` bundle and template.
- AI recommendation boundary fix:
  use [bundles.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/bundles.md) section `AI recommendation boundary fix` and the matching template in [task-templates.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/task-templates.md).
- Structured contract or schema change:
  use the `Structured contract or schema change` bundle and template.
- Result flow integration change:
  use the `Result flow integration change` bundle and template.
- Premium UI or UX refinement:
  use the `Premium UI or UX refinement` bundle and template.
- Reliability or fallback hardening:
  use the `Reliability or fallback hardening` bundle and template.
- Regression-test expansion:
  use the `Regression-test expansion` bundle and template.
- Plugin / MCP surface governance:
  use the `Plugin / MCP surface governance` bundle and template.
- Final multi-lens review of a moderate change:
  use the `Final multi-lens review of a moderate change` bundle and template.

## File-First Routing

These file patterns are primary-mode hints. They do not justify loading multiple primary bundles.

- `.codex/skills/*`, `.codex/automations/*`, `scripts/codex/*`, `scripts/automations/*`, `AGENTS.md`, `README.md`, `RUNBOOK.md`, `AUTOMATIONS_*.md`:
  start with the skill-system governance bundle.
- `server/lib/recommendations.ts`, `shared/contracts/recommendations.ts`, `src/screens/result/AiRecommendationPanel.tsx`, `server/routes/recommendations.integration.test.ts`:
  start with the AI recommendation boundary bundle.
- `shared/contracts/*`, `server/routes/*`, `src/lib/apiClient.ts`, `shared/contracts/*.compat.test.ts`:
  start with the structured contract or schema bundle.
- `src/screens/result/*`, `src/screens/trust/*`, `src/screens/documents/*`, `src/screens/human-review/*`, `src/state/caseStore.ts`:
  start with the result flow integration bundle.
- `src/screens/landing/*`, `src/screens/result/*`, `src/ui/*`, `src/theme/tokens.ts`, `src/styles/index.css`:
  start with the premium UI or UX refinement bundle.
- `src/state/caseStore.ts`, `server/lib/recommendations.ts`, `server/lib/decisionScenarioLab.ts`, `src/screens/result/AiRecommendationPanel.tsx`:
  start with the reliability or fallback hardening bundle when the issue is retry, stale state, missing enhancement data, or degraded UX.
- `*.test.ts`, `*.integration.test.ts`, `scripts/verify-engine-drift.ts`, `data/scenarios/*`:
  start with the regression-test expansion bundle.
- `.cursor/mcp.json`, `.agents/plugins/marketplace.json`, `plugins/*/.codex-plugin/plugin.json`, `.codex/automations/ah-plugin-mcp-surface-watch/automation.toml`, `scripts/automations/check-context-surface.ts`:
  start with the plugin / MCP surface governance bundle.
- diff / PR / review-only work:
  start with the final multi-lens review bundle and add `bank-grade-review` for merge gates.

## Default-On Rules

- Every non-trivial task: `protocol-structured-json-and-png-gate`
- Every non-trivial change: `qa-self-review` + `multi-lens-review` + `release-readiness`
- Any state, route, domain, or shared-contract change: `architecture-guardrails`
- Any user-facing copy: `russian-trust-safe-copy`
- Any UI/screen/layout work: PNG preview first, user approval second, then `frontend-premium-ui` + `design-system-enforcer` + `product-ux-flow-review`
- Any AI/recommendation/prompt surface: `ai-boundary-and-trust` + `offer-semantics` + `fallback-safe-behavior`
- Any bugfix: `bugfix-root-cause`
- Any docs/handoff/summary for implemented work: `docs-and-handoff`
- Any repo-local plugin / MCP / connector surface change: `plugin-surface-governance` + `repo-hygiene-and-structure`
- Any `.codex` surface, repo-local routing, validator, or automation-governance work: `repo-hygiene-and-structure` + `architecture-guardrails`

## Skill Registry

### Domain and trust

- `ai-boundary-and-trust`: protects server-owned result fields and trust-safe AI explanation boundaries
- `offer-semantics`: keeps primary vs alternative path semantics and compare-only discipline honest
- `russian-trust-safe-copy`: rewrites visible copy into concise, concrete, non-fake Russian trust language
- `result-flow-integration`: extends the existing result loop without side screens or broad rewrites
- `ai-cache-and-state`: manages case-bound invalidation, stale-safe state, and no-cross-case AI bleed
- `fallback-safe-behavior`: keeps deterministic UX useful when AI is missing, slow, or failing
- `trust-boundary-regression`: regression lens for compare-only, human review, disclaimers, and deterministic ownership
- `prompt-hardening`: tight prompt edits for current repo AI surfaces only
- `ai-observability`: event, audit, and request-path visibility for AI generation and fallback choice
- `golden-evals`: seeded scenario coverage and contract-aligned golden checks
- `minimal-tool-calling`: keeps model/tool surface intentionally narrow and justified
- `production-hardening`: protects rollout safety, edge states, and long-term maintainability

### Engineering and delivery

- `protocol-structured-json-and-png-gate`: mandatory operator protocol for execution-critical structure and PNG-before-UI approval
- `bank-grade-review`: strict repo-local review and Russian handoff skill for merge gates and review tasks
- `frontend-premium-ui`: strong repo-local UI executor for premium hierarchy, composition, CTA clarity, and trust-safe Russian UI
- `playwright-e2e-visual-qa`: browser-based flow verification, screenshots, desktop/mobile sanity, and state coverage
- `repo-hygiene-and-structure`: naming, folder hygiene, dead code pressure, and repo-level clarity
- `plugin-surface-governance`: governs runtime-plugin usage, local plugin thresholds, marketplace state, and MCP config drift
- `architecture-guardrails`: client/server/shared boundaries, state ownership, contract discipline
- `design-system-enforcer`: tokens, spacing, radii, surfaces, borders, and component consistency
- `qa-self-review`: second-pass defect hunt before claiming completion
- `bugfix-root-cause`: deterministic reproduction, contract tracing, smallest safe fix
- `performance-sanity`: render, bundle, motion, and interaction-cost review
- `a11y-trust-usability`: focus, contrast, tap targets, assistive clarity, and trust-safe affordances
- `product-ux-flow-review`: friction, dead ends, CTA logic, and trust/conversion blockers
- `docs-and-handoff`: concise engineering notes, architecture notes, QA evidence, next-step handoff
- `release-readiness`: repo command gates, known limitations, rollback awareness, CI sanity
- `multi-lens-review`: mandatory final architect/UI/UX/QA/perf/trust self-check bundle

## Finish Bundles

- Non-trivial implementation:
  `qa-self-review` -> `multi-lens-review` -> `release-readiness`
- Skill-system or repo-local Codex surface work:
  `repo-hygiene-and-structure` -> `architecture-guardrails` -> `qa-self-review` -> `multi-lens-review` -> `release-readiness`
- User-facing trust-critical implementation:
  add `trust-boundary-regression`
- Merge or review gate:
  add `bank-grade-review`
- Skill-system changes:
  run `npm run skills:verify`, `npm run automations:check:skills`, and `npm run automations:check:context`
- When telemetry is enabled:
  run `npm run skills:telemetry:report` to confirm what the router is actually choosing over time

## Conflict Resolution

- Correctness beats speed.
- One primary mode beats loading three adjacent bundles “just in case”.
- Stable contracts beat clever local shortcuts.
- Approved PNG direction beats live UI improvisation.
- Result-loop integration beats new standalone screens.
- Honest Russian copy beats persuasive fake confidence.
- Deterministic compare beats AI suggestion when they disagree.
- Existing runtime plugin coverage beats a new repo-local plugin until repeated local value is proven.
- If a repo-local skill overlaps with a global one, keep the repo-local version only when it adds Active Holidays-specific rules.

## Finish Flow

1. Load the minimal base context and task bundle.
2. Resolve exactly one primary mode with [modes.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/modes.md), `npm run skills:detect-mode`, `npm run skills:start`, or `npm run skills:autopilot`.
3. Narrow the bundle with [bundles.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/bundles.md) instead of loading every adjacent skill.
4. Execute with the matching template in [task-templates.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/task-templates.md).
5. Run `qa-self-review` during the working pass for obvious weak spots.
6. Run `multi-lens-review` before finalizing.
7. Run `release-readiness` commands for the touched surface.
8. If automation or skill surfaces changed, also run repo-local Codex checks.
9. If plugin or MCP surface changed, also state whether the result was docs-only, validation-only, or a real local plugin addition.
