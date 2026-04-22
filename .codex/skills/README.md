# Active Holidays Repo-Local Skill System

This repository keeps a repo-local override layer for Active Holidays-specific rules. The shared base skill catalog still lives in `~/.codex/skills`.

## Operating Model

- `index.md` is the human router entrypoint.
- `modes.md` resolves the single primary operating mode.
- `bundles.md` supplies the lean skill loadout for that mode.
- `task-templates.md` supplies the execution shape for that mode.
- `skills:autopilot` is the fastest machine entrypoint when you want a ready execution packet instead of only a mode.
- Repo-local skills stay thin: they sharpen Active Holidays rules, they do not introduce a second framework on top of the router.

## Primary Mode Rule

- Resolve exactly one primary mode first.
- If `npm run skills:detect-mode` or `npm run skills:start` returns multiple candidates, only the top `mode` is active.
- Add secondary skills only inside that chosen mode.
- `skill-system-governance` is the primary mode for repo-local router, docs, modes, bundles, templates, validator guidance, and `.codex` operating surface maintenance.
- `skill-system-governance` is not a standalone meta-layer. It is the router-maintenance mode inside the existing system.

## Efficiency Layer

The repo-local router now has an explicit efficiency layer on top of raw mode selection.

- `npm run skills:detect-mode`:
  use when you only need the primary mode and candidate context.
- `npm run skills:start`:
  use when you want mode, verify commands, first steps, execution plan, and the adaptive agent recommendation.
- `npm run skills:autopilot`:
  use when you want the full packet: routing confidence, execution lane, `recommendedAgentPack`, canonical `multiAgentPack`, and telemetry report.

Routing confidence:

- `high`: mode choice is strong enough to trust the runtime packet directly.
- `medium`: mode is still valid, but candidate context matters and shortcuts should stay limited.
- `low`: keep stronger human oversight and treat the packet as guidance, not blind automation.

Execution lanes:

- `manual-routing`: no strong primary mode, choose manually first.
- `blocked-png`: correct UI mode, but code stays blocked until PNG approval.
- `review-lane`: review-only or merge-gate work; do not shortcut evidence gathering.
- `fast-lane`: narrow high-confidence task with a short verify path.
- `standard-lane`: the normal implementation path for most work.

Agent packs:

- `recommendedAgentPack` is adaptive. It changes with file surface, confidence, blocked state, and lane.
- `multiAgentPack` is canonical. It comes from the selected mode and gives the durable ownership split for that task family.

Telemetry:

- pass `--telemetry` to `skills:detect-mode`, `skills:start`, or `skills:autopilot` to write runtime telemetry
- pass `--telemetry-file <path>` to override the default JSONL log path
- use `npm run skills:telemetry:report` to summarize recent telemetry

## Layout

- `.codex/skills/index.md`
  Canonical repo-local router and override boundary.
- `.codex/skills/protocol-structured-json-and-png-gate/SKILL.md`
  Mandatory operator protocol: execution-critical structure plus PNG approval gate for UI work.
- `.codex/skills/bundles.md`
  Lean default bundles split into `Core`, `Optional`, and `Finish` skills.
- `.codex/skills/task-templates.md`
  Paste-ready execution shapes for recurring repository task types.
- `.codex/skills/modes.md`
  Concrete operating modes and automatic mode detection for this repository.
- `.codex/skills/_shared/active-holidays/`
  Shared context for product boundaries, architecture, terminology, trust rules, premium UI patterns, review checklists, and anti-patterns.
- `.codex/skills/plugin-surface-governance/SKILL.md`
  Repo-local decision layer for plugin and MCP surface work.
- `.codex/skills/<skill-name>/SKILL.md`
  Narrow repo-local skills for recurring Active Holidays execution paths.

## Operating Rules

- Keep shared product context in `_shared/active-holidays`; do not duplicate it inside every skill.
- Route from `index.md`, narrow with `bundles.md`, and execute with the closest task template in `task-templates.md`.
- Resolve exactly one primary mode first with `modes.md`, `npm run skills:detect-mode`, or `npm run skills:autopilot` before widening the bundle.
- Prefer `npm run skills:start` when you want a ready execution packet; prefer `npm run skills:autopilot` when you also want confidence, lanes, telemetry, and multi-agent orchestration.
- Prefer repo-local skills only for repo-specific behavior, protocol, constraints, or review discipline.
- Prefer runtime plugins and shared skills before adding repo-local plugin scaffolds.
- Default to the smallest bundle that can honestly cover the task; do not load every adjacent skill “just in case”.
- Keep global curated skills as companions instead of shadow copies when the repo does not need a different contract.
- Every non-trivial change should end with `multi-lens-review` plus `release-readiness`.
- UI work must load `protocol-structured-json-and-png-gate` first and stays blocked until the user approves a PNG preview.
- Approved UI implementation must then load `frontend-premium-ui` and `design-system-enforcer`.
- AI/recommendation work must load `ai-boundary-and-trust`, `offer-semantics`, and `fallback-safe-behavior`.

## Global Companion Skills

Use these from `~/.codex/skills` instead of duplicating them locally:

- `product-os-audit`
- `build-brief-orchestrator`
- `frontend-skill`
- `ui-redline-orchestrator`
- `playwright`
- `plugin-creator`
- `phase-gate-sync`
- `market-reality-product-innovation`

`bank-grade-review` remains repo-local because this checkout needs a stricter Russian review/handoff contract than the shared default.
`protocol-structured-json-and-png-gate` is also an intentional repo-local overlap because this checkout adds an Active Holidays-specific PNG/UI gate and keeps its communication boundary aligned with `AGENTS.md`.

## Audit Notes

- Direct name overlap with the shared catalog is intentionally allowlisted for `bank-grade-review` and `protocol-structured-json-and-png-gate`.
- The main cleanup target was semantic routing clutter, not duplicate skill folders.
- Repo-local plugin manifests are not part of the current baseline; plugin work should start from governance and validation before scaffolding.

## Picker Metadata Coverage

UI metadata is intentionally curated, not universal.

Tier 1 entry skills with `agents/openai.yaml`:

- `bank-grade-review`
- `protocol-structured-json-and-png-gate`
- `frontend-premium-ui`
- `multi-lens-review`
- `plugin-surface-governance`

Tier 2 frequent companion skills with `agents/openai.yaml`:

- `qa-self-review`
- `release-readiness`
- `architecture-guardrails`
- `result-flow-integration`
- `russian-trust-safe-copy`

Keep the rest lean until there is a real picker/discoverability need.

## Operating Modes

Use `.codex/skills/modes.md` as the concrete mode layer above bundles.

Router flow:

1. detect the primary mode
2. load the matching bundle
3. load the matching template
4. add only necessary secondary skills
5. finish through review and verification

The current automatic mode surface covers:

- `skill-system-governance`
- `ai-recommendation-boundary`
- `contract-boundary`
- `result-flow`
- `premium-ui`
- `reliability-hardening`
- `regression-proof`
- `plugin-surface`
- `review-gate`

Automatic mode detection lives in:

- `npm run skills:detect-mode -- --prompt "<request>"`
- `npm run skills:detect-mode -- --files "<csv paths>"`
- `npm run skills:detect-mode -- --review-only`
- `npm run skills:evaluate-agents`

Executable mode runtime:

- `npm run skills:start -- --prompt "<request>"`
- `npm run skills:start -- --files "<csv paths>"`
- `npm run skills:start -- --review-only`
- `npm run skills:autopilot -- --prompt "<request>"`
- `npm run skills:autopilot -- --files "<csv paths>"`
- `npm run skills:autopilot -- --review-only`

## Verification

- `npm run skills:verify`
- `npm run skills:evaluate-agents`
- `npm run skills:autopilot -- --prompt "<request>"` when you need to inspect the real runtime packet
- `npm run skills:telemetry:report` when telemetry is enabled and you want the aggregate report
- `npm run automations:check:skills`
- `npm run automations:check:context`
- `npm run typecheck` after TypeScript helper-script changes inside `scripts/codex/` or `scripts/automations/`
