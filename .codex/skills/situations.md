# Active Holidays Skill Situations

Use this file when you know the situation but do not want to remember skill names.

This is a human-facing map over the existing router. It does not create new modes.

For the full large/medium/small hierarchy, use `packs.md`.

## How To Use

1. Pick the closest situation below.
2. Use the listed `primary_mode`.
3. Load the linked bundle in `bundles.md`.
4. Add only the optional skills that match the touched surface.
5. Run the verify commands for that surface.

If two situations match, choose the one that owns the first risky decision.

## Always-On Base

For every non-trivial task:

- start with `ah-control-protocol`
- keep ordinary discussion natural, but structure specs, handoffs, risks and acceptance criteria
- if UI code is involved, stop for PNG approval before implementation
- use deep orchestration only when the task is broad, ambiguous, high-risk, or explicitly asks for skill/subagent planning
- finish non-trivial work with `ah-review-release`

## Situation Map

### 1. "I do not know what to do next"

Use when the owner asks for the next strongest task, daily control, roadmap focus, or overload reduction.

- `primary_mode`: `skill-system-governance` if the problem is operating-system/routing/process; otherwise use the product surface mode returned by `skills:autopilot`
- core skills: `ah-repo-automation`, `ah-product-strategy`, `ah-review-release`
- output: one next action, why now, acceptance criteria, verification, what to ignore
- command: `npm run skills:autopilot -- --prompt "<request>"`

### 2. UI, visual polish, screen hierarchy, CTA, copy

Use when changing visible UI, layout, spacing, hierarchy, components, CTA weight, or Russian on-screen copy.

- `primary_mode`: `premium-ui`
- core skills: `ah-ui-implementation`, `ah-ui-direction`
- add: `ah-visual-qa` for browser proof, `ah-visual-qa` for motion/dense UI
- hard gate: PNG preview and explicit approval before UI code
- verify: targeted UI tests, browser screenshot proof when implemented, `npm run typecheck`

### 3. Lovable prompt or UI handoff

Use when preparing or reviewing a Lovable task, especially route-level UI work.

- `primary_mode`: `premium-ui` for UI surfaces; `skill-system-governance` if the work is only prompt/process cleanup
- core skills: `ah-control-protocol`, `ah-product-strategy`, `ah-ui-direction`
- add: `ah-backend-contracts` when the prompt risks backend/domain/API drift
- output: one route or coherent flow, static `?state=` fixtures, exact Russian copy, explicit forbidden scope
- hard ban: backend, stores, services, API wiring, localStorage, telemetry, invented labels/copy

### 4. Result flow, trust, documents, compare, human review

Use when improving the decision loop after intake.

- `primary_mode`: `result-flow`
- core skills: `ah-result-flow`, `ah-ui-direction`, `ah-review-release`, `ah-ui-implementation`
- add: `ah-backend-contracts` for route/state/contracts, `ah-ai-trust-layer` for compare/recommendation semantics
- output: strengthened existing loop, not a detached side screen
- verify: targeted component/integration tests, `npm run typecheck`

### 5. AI recommendation, explanation, prompt, model output

Use when AI touches recommendations, explanations, prompt text, fallback behavior, or ownership boundaries.

- `primary_mode`: `ai-recommendation-boundary`
- core skills: `ah-ai-trust-layer`, `ah-review-release`, `ah-visual-qa`
- add: `ah-ai-trust-layer` for prompts and tool behavior, `.codex/skills/_internal/ai-observability.md` for generation-path visibility
- rule: AI explains current facts; deterministic engine owns verdicts, ranking, next actions and compare outcomes
- verify: recommendation tests, route integration tests, `npm run typecheck`, `npm run verify:engine` if semantics changed

### 6. Contract, schema, API route, DTO, parser

Use when changing shared payloads, route validation, API callers, screen models, or cross-layer types.

- `primary_mode`: `contract-boundary`
- core skills: `ah-backend-contracts`, `ah-visual-qa`
- add: `ah-backend-contracts` if driven by a defect, `ah-product-strategy` for rollout notes
- rule: update contract and real callers together; do not leave compatibility guesses
- verify: targeted contract/route tests, `npm run typecheck`, `npm run test`

### 7. Bug, fallback, stale state, retry, degraded behavior

Use when something fails, disappears, leaks across cases, or breaks under partial data.

- `primary_mode`: `reliability-hardening`
- core skills: `ah-backend-contracts`, `ah-ai-trust-layer`, `ah-review-release`
- add: `ah-visual-qa` when deterministic semantics may drift
- output: root cause, smallest safe fix, degraded state remains useful
- verify: regression test for the failure, `npm run typecheck`

### 8. Tests, seeded scenarios, replay, drift, golden proof

Use when the main job is adding proof, not changing product behavior.

- `primary_mode`: `regression-proof`
- core skills: `ah-visual-qa`, `ah-review-release`
- add: `ah-backend-contracts` for contract coverage, `ah-review-release` for trust-critical flows
- output: narrow regression proof tied to a known risk
- verify: targeted test command, `npm run verify:engine` when engine/scenario semantics are involved

### 9. Review, merge readiness, PR gate, post-review fixes

Use when the user asks "can this merge?", "review", "findings", or final ship/block status.

- `primary_mode`: `review-gate`
- core skills: `ah-review-release`
- add: `ah-review-release` for result/trust/AI/user-facing diffs
- output: findings first, ordered by severity; then residual risk and verification gaps
- rule: no "ready" without evidence

### 10. Repo-local skills, automations, router, AGENTS, README

Use when improving the work system itself, including maximum skill-mix or super-operator requests.

- `primary_mode`: `skill-system-governance`
- core skills: `ah-repo-automation`, `ah-backend-contracts`, `ah-review-release`
- add: `ah-super-operator` for broad/high-stakes skill orchestration, `ah-product-strategy` for operator docs, `ah-review-release` for validator changes
- rule: strengthen the existing router; do not add a parallel abstraction
- verify: `npm run skills:verify`, `npm run automations:check:skills`, `npm run automations:check:context`

Deep orchestration hotkeys:

- simple: `npm run do -- "<request>"`
- advanced: `npm run skills:orchestrate -- --prompt "<request>"`
- off: `--no-deep-orchestration` or `AH_DEEP_ORCHESTRATION=0`

### 11. Plugin, MCP, connector, marketplace surface

Use when plugin or MCP files are the dominant changed surface.

- `primary_mode`: `plugin-surface`
- core skills: `ah-repo-automation`, `ah-backend-contracts`
- add: global `plugin-creator` only when a real repo-local plugin scaffold is justified
- rule: prefer existing runtime plugins and shared skills before adding a local plugin
- verify: relevant plugin/MCP checks and repo-local skill checks

### 12. Documentation, handoff, Notion update, PR text

Use when the implementation is done or the main output is a transferable artifact.

- `primary_mode`: use the mode of the work being documented; use `skill-system-governance` only for operating docs
- core skills: `ah-product-strategy`, `ah-review-release`
- add: `ah-ui-direction` for user-facing copy, `ah-review-release` for PR/review text
- output: short status, evidence, next action, acceptance criteria, risks
- rule: do not claim external writeback unless it actually happened

## Quick Decision Table

| Situation | Primary mode | First skills |
| --- | --- | --- |
| Next task / control brief | detected by `skills:autopilot` | `ah-repo-automation`, `ah-product-strategy` |
| UI / visual / CTA | `premium-ui` | `ah-ui-implementation`, `ah-ui-direction` |
| Lovable prompt | `premium-ui` or `skill-system-governance` | `ah-product-strategy`, `ah-ui-direction` |
| Result loop | `result-flow` | `ah-result-flow`, `ah-review-release` |
| AI recommendation | `ai-recommendation-boundary` | `ah-ai-trust-layer`, `ah-review-release` |
| Contract/API/schema | `contract-boundary` | `ah-backend-contracts`, `ah-visual-qa` |
| Bug/fallback | `reliability-hardening` | `ah-backend-contracts`, `ah-ai-trust-layer` |
| Tests/proof | `regression-proof` | `ah-visual-qa`, `ah-review-release` |
| Review/merge | `review-gate` | `ah-review-release` |
| Skills/automations/router | `skill-system-governance` | `ah-repo-automation`, `ah-backend-contracts` |
| Plugin/MCP | `plugin-surface` | `ah-repo-automation`, `ah-backend-contracts` |
| Docs/handoff | work's existing mode | `ah-product-strategy`, `ah-review-release` |

## Efficiency Rule

Do not load all skills in a situation. Load the core pair first, then add only the skill that covers the concrete risk in front of you.

Good:

- `premium-ui` + `ah-ui-implementation` + `ah-ui-direction` for a CTA/copy pass after PNG approval

Bad:

- loading every UI, trust, AI, review, performance and release skill for a one-line copy fix
