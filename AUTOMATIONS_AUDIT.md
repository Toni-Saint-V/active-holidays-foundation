# Active Holidays Automation Audit

## Scope

Audit date: `2026-04-18`

Goal: собрать automation suite, который автономно усиливает:

- product layer
- AI/interactive layer
- premium UI layer
- agent layer
- skill layer
- plugin / MCP / context layer
- truth / freshness layer

## Current Product Reality

### Repo already contains AI-native product primitives

- product autopilot on landing: `useProductAutopilot`
- signal autopilot in intake: `useSignalAutopilot`
- live intake preview: `MiniVerdictPreview`
- what-if simulation on result: `TemporalWhatIf`
- replay and audit timeline
- trust/confidence/source surfaces:
  - `ConfidenceGauge`
  - `NodeGraph`
  - `VolatilityRadar`
  - `FractalConfidence`

Conclusion: the best automation layer here is one that keeps making these surfaces smarter, more interactive, clearer, and more premium.

### Product truth lives outside the repo

- local markdown is thin by design
- real product and execution truth lives in Notion:
  - `Active Holidays`
  - `00 · Vision & Product`
  - `03 · Execution`
  - `P0 · Open Decisions`
- Linear project exists but is not yet carrying a living backlog

Conclusion: automations should generate briefs, prompt-ready artifacts, and distillations first, not blindly write into external systems.

### Agent and skill surface is noisy

- repo-local `.codex/skills/` exists
- during audit, `11` repo-local skills were byte-identical duplicates of shared global skills
- only `bank-grade-review` remained a justified repo-local override

Conclusion: a strong part of the suite should improve the agent/skill layer itself.

### Premium design ambition exists, but no loop enforces it

- motion primitives exist
- premium layout patterns exist
- AI-native surfaces exist
- but no recurring automation currently:
  - selects the next screen to polish
  - detects dead/static zones
  - maps current UI against product contract
  - proposes one strong premium improvement at a time

Conclusion: premium UI and interaction automations are first-class, not optional.

### Truth and freshness still matter

- `sources.json` already carries `lastCheckedAt`, `tier`, `volatilityScore`
- trust-critical catalogs already depend on source references

Conclusion: freshness belongs in the suite, but as a product trust loop, not as generic infra hygiene.

## Highest-ROI Automation Targets

Ranked by `speed × quality × product confidence × repeatability`.

1. `ah-agent-memory-guard`
2. `ah-skill-dedupe-gap-harvester`
3. `ah-product-os-radar`
4. `ah-ui-premium-polish-pass`
5. `ah-design-drift-vs-contract`
6. `ah-copy-trust-upgrade`
7. `ah-truth-freshness-watch`
8. `ah-next-best-action-distiller`
9. `ah-execution-brief-sync`
10. `ah-plugin-mcp-surface-watch`

## What The Suite Should Improve Continuously

### Product

- better AI-native interactions
- better next actions
- better trust surfaces
- better product clarity

### Process

- cleaner execution briefs
- less drift between repo and Notion
- more deterministic next-step selection

### Agent / skill / plugin surface

- fewer duplicate skills
- better repo-specific instructions
- stronger reusable skill candidates
- cleaner context surface around `.codex` and optional `.cursor`

### UI / design

- stronger hierarchy
- more premium motion
- more interactive value
- less static UI

## What Is Explicitly Not The Focus Of v1

- CI-heavy automations
- flaky-test hunting as a standalone track
- Sentry triage before monitoring exists
- SEO-first automation before the marketing surface is central

## Selection Principle

If an automation does not directly improve product quality, AI/interaction quality, premium UI quality, agent quality, skill quality, or context quality for Active Holidays, it should not be in this v1 suite.
