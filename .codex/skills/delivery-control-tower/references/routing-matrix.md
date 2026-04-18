# Routing Matrix

Use this file when the system must behave predictably and without overlap.

## Core principle

Every step starts only when:
- the required input artifact exists,
- the correct upstream owner produced it,
- the previous step's unresolved risks are known.

If one of these is false, route backward instead of pushing forward.

## Allowed transitions

### 1. `product-os-audit`

Starts when:
- repo and Notion need reconciliation
- the team is unsure what is actually true now

Produces:
- drift map
- next target artifact

Allowed next steps:
- `market-reality-product-innovation`
- `notion-ai-sync-director`
- `build-brief-orchestrator`

Blocked if:
- no meaningful product or repo context exists

### 2. `market-reality-product-innovation`

Starts when:
- a product bet, monetization move, or roadmap priority must be pressure-tested

Produces:
- market-validated recommendation set

Allowed next steps:
- `build-brief-orchestrator`
- back to product decision / Notion sync

Blocked if:
- there is no concrete decision to validate

### 3. `notion-ai-sync-director`

Starts when:
- product docs are broad but inconsistent
- Notion needs a first-pass sync under Codex supervision

Produces:
- prompt for Notion AI
- Codex cleanup list

Allowed next steps:
- `build-brief-orchestrator`
- `product-os-audit` for post-sync verification

Blocked if:
- no audited repo-reality summary exists

### 4. `build-brief-orchestrator`

Starts when:
- the product direction is stable enough to turn into execution work

Produces:
- executor-specific brief(s)
- handoff prompt(s)

Allowed next steps:
- `lovable-step-prompts`
- Codex implementation work
- `notion-catalog-sync` if the task is actually a source-of-truth sync

Blocked if:
- open decisions still change implementation shape

### 5. `lovable-step-prompts`

Starts when:
- there is a clear screen contract or UI brief

Produces:
- one step-specific Lovable prompt

Allowed next steps:
- Lovable build
- `lovable-redline`

Blocked if:
- states, routes, or payloads are still guessed

### 6. `lovable-redline`

Starts when:
- a Lovable result or UI concept already exists

Produces:
- concrete UI redline

Allowed next steps:
- Lovable rework
- `ai-interactive-screen-audit`
- `ui-motion-performance-polish`

Blocked if:
- the UI still lacks basic product correctness

### 7. `ai-interactive-screen-audit`

Starts when:
- the screen already has a stable primary job

Produces:
- AI-native and interactivity upgrade list

Allowed next steps:
- `lovable-step-prompts`
- `ui-motion-performance-polish`
- Codex implementation if the upgrades touch behavior

Blocked if:
- the screen still lacks clear core states or purpose

### 8. `ui-motion-performance-polish`

Starts when:
- the screen is already correct and stable

Produces:
- final polish and performance hardening list

Allowed next steps:
- implementation
- `bank-grade-review`
- `phase-gate-sync`

Blocked if:
- the screen still has product ambiguity or broken states

### 9. `notion-catalog-sync`

Starts when:
- Notion is the approved source for rules, thresholds, paths, or other catalogs

Produces:
- repo sync changes or repo sync plan

Allowed next steps:
- implementation
- `bank-grade-review`
- `phase-gate-sync`

Blocked if:
- source-of-truth ownership is ambiguous

### 10. `bank-grade-review`

Starts when:
- code or contracts materially changed

Produces:
- prioritized findings

Allowed next steps:
- fix pass
- `phase-gate-sync`

Blocked if:
- there is no concrete artifact to review

### 11. `phase-gate-sync`

Starts when:
- implementation and review both exist

Produces:
- honest go / review / blocked / reopen-upstream outcome

Allowed next steps:
- next roadmap task
- upstream reopen

Blocked if:
- verification or review has not actually happened

## Forbidden shortcuts

- `lovable-step-prompts` -> `ui-motion-performance-polish` without correctness and redline
- `product-os-audit` -> implementation without a brief
- `market-reality-product-innovation` -> implementation without a product decision or brief
- `notion-ai-sync-director` -> repo truth change without `notion-catalog-sync`
- `bank-grade-review` -> `Done` without a gate outcome

## Minimum artifact chain

For serious work, prefer this chain:

1. drift map
2. synced source docs
3. executable brief
4. build result
5. redline or quality findings
6. implementation / fixes
7. review findings
8. gate outcome
