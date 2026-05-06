# Active Holidays Skill Packs

Use this file when you want the whole skill catalog organized by meaning.

This is a search catalog, not a second router. The executable routing still stays:

`situation -> primary_mode -> bundle -> template -> optional skills -> verification`

## Fast Search

Search this file by situation, surface, or risk:

```bash
rg -n "ui|lovable|result|ai|contract|bug|review|notion|plugin|mcp|test|copy|fallback" .codex/skills/packs.md
```

Common aliases:

| Search | Meaning |
| --- | --- |
| `ui`, `screen`, `visual`, `cta`, `copy` | UI/design/copy work |
| `lovable`, `figma`, `handoff` | generator or design handoff |
| `result`, `trust`, `documents`, `human-review` | core decision loop |
| `ai`, `recommendation`, `prompt`, `model` | AI recommendation boundary |
| `contract`, `schema`, `api`, `dto` | shared contract/API work |
| `bug`, `fallback`, `stale`, `retry` | reliability/root-cause work |
| `test`, `golden`, `scenario`, `drift` | regression proof |
| `review`, `merge`, `pr`, `release` | ship gate |
| `notion`, `docs`, `status` | handoff/source-of-truth docs |
| `plugin`, `mcp`, `connector` | plugin/MCP surface |

## Pack Levels

- Large pack: complete work scenario.
- Medium pack: surface or risk family inside a scenario.
- Small skill: one concrete behavior module.

Do not load every skill in a large pack. Start with the medium pack that owns the current risk.

## Large Packs

### L1. Control And Operating System

Use for next task, project control, Notion/repo drift, skills, automations, owner overload, and "what now?"

- primary modes: `skill-system-governance`, or the product mode returned by `skills:autopilot`
- first command: `npm run skills:autopilot -- --prompt "<request>"`

Medium packs:

- routing hygiene: `ah-repo-automation`, `ah-backend-contracts`
- task shaping: `ah-product-strategy`, `ah-review-release`
- owner relief: `ah-review-release`, `ah-review-release`
- automation safety: `ah-repo-automation`, `ah-backend-contracts`, `ah-review-release`

Output:

- one next best task
- one owner decision if needed
- exact handoff or update block
- verification command

### L2. Product Decision Loop

Use for result, trust, documents, compare, scenario lab, human review, and any change that affects the user's path after intake.

- primary mode: `result-flow`

Medium packs:

- result integration: `ah-result-flow`, `ah-ui-direction`
- trust and escalation: `ah-review-release`, `ah-ui-implementation`
- compare and alternatives: `ah-ai-trust-layer`, `ah-visual-qa`
- Russian trust copy: `ah-ui-direction`
- contract touchpoints: `ah-backend-contracts`

Output:

- stronger existing loop
- no detached side screen unless justified
- clear verdict, next action, trust cue, human-review path

### L3. UI And Design Delivery

Use for visual hierarchy, screen layout, premium polish, CTA, mobile behavior, user-facing copy, screenshots, and browser proof.

- primary mode: `premium-ui`
- hard gate: PNG preview and explicit approval before UI code

Medium packs:

- approval protocol: `ah-control-protocol`
- visual execution: `ah-ui-implementation`, `ah-ui-implementation`
- UX and conversion: `ah-ui-direction`, `ah-ui-direction`
- accessibility: `ah-ui-implementation`
- visual verification: `ah-visual-qa`
- performance: `ah-visual-qa`

Output:

- approved visual direction
- implemented UI only after PNG approval
- desktop/mobile proof when relevant

### L4. Lovable And Design Handoff

Use for Lovable prompts, Figma/Figma Make prompts, screen contracts, route prompts, and UI-only generator handoffs.

- primary mode: `premium-ui` for UI work, `skill-system-governance` for prompt/process cleanup

Medium packs:

- generator boundary: `ah-backend-contracts`, `ah-product-strategy`
- copy contract: `ah-ui-direction`
- UI states: `ah-ui-direction`, `ah-ui-implementation`
- visual direction: `ah-ui-implementation`, `ah-ui-implementation`
- review gate: `ah-review-release`, `ah-review-release`

Output:

- one route or coherent flow
- exact Russian copy and option labels
- static `?state=` fixtures
- explicit forbidden scope

Hard ban:

- no backend, domain logic, API wiring, localStorage, telemetry, invented labels or copy

### L5. AI Recommendation And Trust Boundary

Use for AI recommendation, explanation UX, prompts, model output, fallback text, cache/state, tool calling, and observability.

- primary mode: `ai-recommendation-boundary`

Medium packs:

- ownership boundary: `ah-ai-trust-layer`, `ah-ai-trust-layer`
- cache and lifecycle: `ah-ai-trust-layer`, `ah-backend-contracts`
- prompt layer: `ah-ai-trust-layer`, `ah-ai-trust-layer`
- observability: `ai-observability`
- proof: `ah-visual-qa`, `ah-review-release`
- copy: `ah-ui-direction`

Output:

- AI explains current facts
- deterministic engine owns verdicts, ranking, next actions and compare outcomes
- fallback remains useful and honest

### L6. Contracts, API, State, Architecture

Use for shared contracts, schemas, DTOs, API routes, parsers, Zustand state, screen models, and client/server boundary work.

- primary mode: `contract-boundary`

Medium packs:

- architecture boundary: `ah-backend-contracts`
- contract proof: `ah-visual-qa`
- production safety: `ah-backend-contracts`
- root-cause changes: `ah-backend-contracts`
- docs/handoff: `ah-product-strategy`

Output:

- shared contract and real callers updated together
- no browser/server leaks
- no compatibility guesses

### L7. Reliability, Bugfix, Fallback

Use for broken flows, stale state, degraded data, retries, transient failures, cross-case bleed, missing AI/recommendation data, or unsafe fallbacks.

- primary mode: `reliability-hardening`

Medium packs:

- root cause: `ah-backend-contracts`
- degraded behavior: `ah-backend-contracts`
- state/cache: `ah-ai-trust-layer`
- production edge cases: `ah-backend-contracts`
- trust regression: `ah-review-release`
- deterministic proof: `ah-visual-qa`

Output:

- failure traced to real cause
- smallest safe fix
- degraded path still useful
- regression test added when feasible

### L8. Verification, Tests, Golden Proof

Use when the main work is proof: tests, seeded scenarios, replay, drift, engine verification, visual QA, release evidence.

- primary mode: `regression-proof`

Medium packs:

- golden scenarios: `ah-visual-qa`
- release gate: `ah-review-release`
- self-review: `ah-review-release`, `ah-review-release`
- browser proof: `ah-visual-qa`
- performance proof: `ah-visual-qa`
- trust proof: `ah-review-release`

Output:

- narrow proof tied to real risk
- exact command run
- remaining gap named

### L9. Review, Merge, Release Gate

Use for code review, PR readiness, "can this merge?", post-review fixes, final ship/block decisions.

- primary mode: `review-gate`

Medium packs:

- strict review: `ah-review-release`
- broad review: `ah-review-release`
- defect sweep: `ah-review-release`
- release evidence: `ah-review-release`
- trust/user-facing risk: `ah-review-release`
- performance/UI risk: `ah-visual-qa`, `ah-visual-qa`

Output:

- findings first
- severity ordered
- exact file/line evidence when available
- ship/block verdict
- verification and residual risk

### L10. Skill, Automation, Router Governance

Use for `.codex/skills`, automations, router docs, AGENTS, README, validator behavior, skill cleanup, semantic grouping, and workflow friction.

- primary mode: `skill-system-governance`
- deep orchestration: use `npm run skills:orchestrate -- --prompt "<request>"` when the task asks for skill/subagent/prompt-quality control

Medium packs:

- catalog hygiene: `ah-repo-automation`
- boundary consistency: `ah-backend-contracts`
- operator docs: `ah-product-strategy`
- validation: `ah-review-release`, `ah-review-release`
- final review: `ah-review-release`
- orchestration switch: `ah-control-protocol`, `_internal/deep-orchestration-mode.md`

Output:

- fewer duplicate paths
- clearer routing
- no parallel abstraction
- verifier passes

### L11. Plugin, MCP, Connector Surface

Use for plugin manifests, MCP config, `.cursor/mcp.json`, marketplace entries, connector routing, local plugin thresholds.

- primary mode: `plugin-surface`

Medium packs:

- plugin/MCP governance: `ah-repo-automation`
- repo hygiene: `ah-repo-automation`
- boundary safety: `ah-backend-contracts`
- production workflow safety: `ah-backend-contracts`
- docs: `ah-product-strategy`
- scaffold only when justified: global `plugin-creator`

Output:

- prove whether a plugin/MCP change is needed
- prefer existing runtime plugins/shared skills before scaffolding
- state whether the result is docs-only, validation-only, or real local plugin work

### L12. Documentation, Handoff, Notion, PR Text

Use for Notion updates, Lovable/Codex/Cursor prompts, PR descriptions, release notes, owner status, evidence packs.

- primary mode: use the mode of the work being documented

Medium packs:

- handoff clarity: `ah-product-strategy`
- status/release proof: `ah-review-release`
- trust-safe user copy: `ah-ui-direction`
- review/PR gate: `ah-review-release`
- source-of-truth drift: `ah-repo-automation`

Output:

- what changed
- product impact
- evidence
- next action
- risks or blocker

## Medium Pack Index

### Protocol And Approval

- `ah-control-protocol`
- Use for: every non-trivial task, especially UI approval and structured execution artifacts.

### Product Flow And Trust

- `ah-result-flow`
- `ah-ui-direction`
- `ah-review-release`
- `ah-ai-trust-layer`
- `ah-ui-direction`
- Use for: result, compare, documents, trust, human review, next-action clarity.

### Premium UI

- `ah-ui-implementation`
- `ah-ui-implementation`
- `ah-ui-implementation`
- `ah-visual-qa`
- `ah-visual-qa`
- Use for: visual hierarchy, spacing, CTA, responsive behavior, browser proof.

### AI And Recommendation

- `ah-ai-trust-layer`
- `ah-ai-trust-layer`
- `ai-observability`
- `ah-ai-trust-layer`
- `ah-ai-trust-layer`
- `ah-backend-contracts`
- Use for: AI output, prompt changes, tool behavior, stale-safe state, fallback.

### Contracts And Architecture

- `ah-backend-contracts`
- `ah-backend-contracts`
- `ah-visual-qa`
- `ah-backend-contracts`
- Use for: schemas, routes, DTOs, state ownership, server/client boundaries.

### Verification And Release

- `ah-review-release`
- `ah-review-release`
- `ah-review-release`
- `ah-review-release`
- `ah-visual-qa`
- Use for: final gate, review findings, merge readiness, seeded proof.

### Repo Operating Surface

- `ah-repo-automation`
- `ah-product-strategy`
- `ah-repo-automation`
- Use for: skills, automations, router docs, plugin/MCP surface, Notion/handoff discipline.

## Atomic Skill Index

### Domain, AI, Trust

- `ah-ai-trust-layer`: AI explains facts; engine owns decisions.
- `ah-ai-trust-layer`: case-bound AI state, invalidation, no cross-case bleed.
- `ai-observability`: logging and visibility for AI paths without noise.
- `ah-backend-contracts`: degraded states stay useful and honest.
- `ah-ai-trust-layer`: narrow, justified model/tool behavior.
- `ah-ai-trust-layer`: primary vs alternative vs compare-only discipline.
- `ah-ai-trust-layer`: short grounded prompts for repo AI surfaces.
- `ah-review-release`: deterministic ownership, disclaimers, compare and human-review checks.

### Product Flow, Copy, UX

- `ah-result-flow`: improve result loop without side-screen sprawl.
- `ah-ui-direction`: friction, CTA logic, dead ends, conversion and trust clarity.
- `ah-ui-direction`: concise Russian copy without fake certainty.
- `ah-ui-implementation`: focus, contrast, tap targets, dialogs, interaction clarity.

### UI, Visual, Browser

- `ah-ui-implementation`: premium hierarchy, layout, CTA, composition after PNG approval.
- `ah-ui-implementation`: tokens, spacing, radii, surfaces, visual consistency.
- `ah-visual-qa`: render, bundle, motion and interaction-cost sanity.
- `ah-visual-qa`: real browser verification and screenshots.

### Engineering, Data, Reliability

- `ah-backend-contracts`: client/server/shared boundaries and state ownership.
- `ah-backend-contracts`: reproduce, trace, smallest deterministic fix.
- `ah-visual-qa`: seeded scenario and semantic regression proof.
- `ah-backend-contracts`: edge states, idempotency, rollback and maintainability.

### Review, Release, Docs

- `ah-review-release`: strict findings-first review and merge gate.
- `ah-product-strategy`: concise docs, QA evidence, next-step handoff.
- `ah-review-release`: architect, UX, QA, performance, trust and maintainability lenses.
- `ah-review-release`: second-pass defect hunt before final status.
- `ah-review-release`: final checks, proof, known gaps and rollback awareness.

### Skill, Plugin, Process

- `ah-repo-automation`: plugin/MCP threshold and config governance.
- `ah-control-protocol`: structured execution protocol and PNG-before-UI gate.
- `ah-repo-automation`: folder/doc/skill/router cleanup and duplicate pressure.

## Minimal Load Rule

Use the smallest set that covers the risk:

- Small copy fix: `ah-ui-direction` + finish gate.
- UI layout after PNG approval: `ah-ui-implementation` + `ah-ui-implementation` + `ah-ui-implementation`.
- AI prompt change: `ah-ai-trust-layer` + `ah-ai-trust-layer` + `ah-backend-contracts`.
- Contract change: `ah-backend-contracts` + `ah-visual-qa` + `ah-backend-contracts`.
- Merge review: `ah-review-release` + `ah-review-release`.

If the pack feels too large, drop skills until every remaining skill has a specific risk to cover.
