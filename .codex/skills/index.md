# Active Holidays Skill Router

This repo exposes a compact action catalog. Do not route work through dozens of atomic skills.

## Visible Actions

### Super Mode

- `ah-super-operator`: максимальный execution режим для broad/high-stakes задач; собирает точный skill mix, verification, review и handoff без mega-prompt шума.

### Process

- `ah-control-protocol`: старт задачи, mode choice, PNG gate, structured handoff rules.
- `ah-product-strategy`: продуктовая задача, next best task, Notion/Lovable/Cursor handoff.
- `ah-repo-automation`: skills, automations, MCP/plugin surface, repo operating docs.

### Product Flow

- `ah-result-flow`: result, trust, documents, compare, human-review, scenario lab.
- `ah-ai-trust-layer`: OpenAI recommendations, prompts, cache, fallback, observability.
- `ah-backend-contracts`: routes, shared contracts, domain logic, persistence, reliability.

### UI

- `ah-ui-direction`: PNG concept, visual direction, redline, hierarchy, CTA, copy.
- `ah-ui-implementation`: approved UI code work, components, responsive states, a11y.
- `ah-visual-qa`: Playwright/browser proof, screenshots, golden scenarios, regression proof.

### Review

- `ah-review-release`: review findings, bank-grade/multi-lens review, release gate, ship/block.

## Command Hotkeys

Use only these for normal work:

- `npm run do -- "задача"` — one task entrypoint; the repo chooses mode, first steps, and checks.
- `npm run check` — full branch verification.
- `npm run help` — short help.

Advanced commands stay available behind `npm run ah -- advanced`.

## Router Contract

- Pick exactly one visible action first.
- Use `modes.md` only for automatic classification.
- Use `bundles.md` and `task-templates.md` as internal execution references.
- Use `orchestrationMode` as the on/off depth switch for broad skill/subagent planning.
- Atomic legacy rules live in `_internal/*.md`; they are reference material, not visible actions.
- Shared product context lives in `_shared/active-holidays/`.

## Mode Mapping

- `npm run do -- "задача"` -> `ah-super-operator`, then normal primary-mode routing
- `skill-system-governance` -> `ah-repo-automation`
- `plugin-surface` -> `ah-repo-automation`
- `review-gate` -> `ah-review-release`
- `premium-ui` -> `ah-ui-direction` then `ah-ui-implementation`
- `ai-recommendation-boundary` -> `ah-ai-trust-layer`
- `contract-boundary` -> `ah-backend-contracts`
- `result-flow` -> `ah-result-flow`
- `reliability-hardening` -> `ah-backend-contracts`
- `regression-proof` -> `ah-visual-qa`

## Base Context

- `./_shared/active-holidays/product-context.md`
- `./_shared/active-holidays/architecture-map.md`
- `./_shared/active-holidays/flow-map.md`
- `./_shared/active-holidays/trust-and-ai-boundaries.md`
- `./_shared/active-holidays/terminology.md`
- `./_shared/active-holidays/review-checklists.md`
- `./_shared/active-holidays/anti-patterns.md`
- `./_shared/active-holidays/premium-ui-playbook.md`
- `./_shared/active-holidays/plugin-surface.md`

## Internal Surfaces

- `modes.md`
- `bundles.md`
- `task-templates.md`
- `packs.md`
- `situations.md`
- `_internal/*.md`

## Finish Rule

For real implementation: verify with the closest command hotkey, then use `ah-review-release` for final ship/block status.
