# Active Holidays Foundation

Phase 3 decision skeleton for a new `Active Holidays` codebase.

## Stack

- React 18
- TypeScript strict
- Vite
- React Router v6
- TailwindCSS
- Framer Motion
- Zustand
- Express
- Vitest
- OpenAI SDK with Responses API
- LangGraph
- Tavily
- SQLite-backed LangGraph checkpoint memory

## Scripts

- `npm run dev` — client
- `npm run server` — API
- `npm run dev:all` — client + API
- `npm run build` — client build
- `npm run test` — unit tests
- `npm run typecheck` — TypeScript check
- `npm run verify:agent-stack` — OpenAI Responses API + LangGraph + Tavily + memory DB smoke check
- `npm run verify:engine` — deterministic scenario drift gate
- `npm run autonomous:next` — select the current safe autonomous task
- `npm run autonomous:execute` — prepare or run the local Stage A executor
- `npm run autonomous:health` — diagnose repo-local autonomous health without writing artifacts
- `npm run autonomous:level-b` — run the repo-local Level B readiness cycle without writing artifacts
- `npm run autonomous:level-b:write` — write Level B health/readiness artifacts into `reports/autonomous/`
- `npm run autonomous:verify` — autonomous runtime readiness gate
- `npm run automations:context:packet` — build the report-first automation memory/context packet without writing artifacts
- `npm run automations:intelligence:contract` — print the repo-local Product/System intelligence contract for Memory MCP, GitHub control, and LangGraph flows
- `npm run skills:verify` — repo-local Codex skill system check
- `npm run skills:evaluate-agents` — fixture-based agent and mode coverage evaluation
- `npm run skills:autopilot` — full execution packet with confidence, lanes, and agent packs
- `npm run skills:telemetry:report` — summarize recorded skill-mode telemetry

## Environment

- Copy `.env.example` when you need to override the API port locally.
- `OPENAI_API_KEY` enables OpenAI-backed server flows. The installed SDK exposes the Responses API.
- `TAVILY_API_KEY` enables Tavily research calls when a server-side research flow is added.
- `ACTIVE_HOLIDAYS_AGENT_MEMORY_DB` defaults to `:memory:` for the agent-stack smoke check and future server-side LangGraph checkpoint memory. Use a file path only when persistence is intentionally wired into a runtime flow.
- Human review state is persisted locally in `output/server-state/human-reviews.json`.
- Override the file path with `ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE` when you need isolated runtime storage.
- Protect internal human-review transitions with `ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN` and send it through the `x-active-holidays-internal-token` header from trusted server-side callers only.

## Current Scope

This repository currently contains:

- bootable client shell
- route registration for all primary screens
- first deterministic intake -> result flow
- structured result with trust/documents sections
- persisted human-review lifecycle with restart-safe local server storage
- bootable Express API with `/api/health`
- shared contract baseline in `shared/contracts`
- typed local repository for a small decision session history
- minimal Zustand app state for the active flow workspace
- theme tokens and base Tailwind setup
- strict TS/Vite/Vitest baseline

## Repo-Local Codex Skill System

Repo-local skills now form a thin operating layer around this repo instead of a single override.

Entry points:

- `.codex/skills/index.md`
- `.codex/skills/bundles.md`
- `.codex/skills/task-templates.md`
- `.codex/skills/modes.md`
- `.codex/skills/_shared/active-holidays/`
- `.codex/skills/README.md`

Key repo-local bundles:

- domain AI/trust/result-flow skills
- engineering guardrails and hygiene skills
- `ah-repo-automation` for plugin and MCP boundary work
- `ah-ui-implementation` as the repo-local premium UI executor
- `ah-review-release` as the mandatory final self-check
- `ah-review-release` as the final repo gate
- primary-mode routing via `.codex/skills/modes.md`
- bundle selection via `Core` / `Optional` / `Finish`
- task templates for AI boundary, schema, result flow, premium UI, fallback, regression, plugin or MCP governance, and final review work

Routing model:

- auto-detect with `npm run skills:detect-mode`, `npm run skills:start`, or `npm run skills:autopilot`
- accept exactly one primary mode per task
- use that mode to choose one bundle and one template
- add secondary skills only inside that chosen mode
- treat `skill-system-governance` as the primary mode for repo-local docs, router, skills, automations, and operating-surface maintenance
- treat `plugin-surface` as separate only when plugin or MCP files are the dominant surface

Global curated skills stay in `~/.codex/skills` and are used as companions rather than duplicated shadows.

Repo-local plugin and MCP surface is governance-first:

- prefer runtime plugins or existing skills before adding local plugin scaffolds
- use `.codex/skills/_shared/active-holidays/plugin-surface.md` for the decision boundary
- treat local plugin manifests and marketplace state as optional but real repo surface once introduced

Product/System intelligence stays explicit and separated:

- Memory MCP is the decision-memory layer for durable choices, accepted/rejected approaches, review lessons, and operator preferences; it is not a fake Landgraf DB and is not considered configured until a real MCP binding with evidence exists
- GitHub control owns tasks, PRs, review comments, and CI inspection through the active runtime plugin/MCP or `gh` fallback, not through a repo-local placeholder
- LangGraph owns complex agent flow orchestration and runtime checkpoints; checkpoint memory is not durable decision memory unless a future persistence contract promotes it
- `reports/automations/state/gate-eligibility-snapshot.json` remains the execution eligibility authority
- inspect the machine-readable contract with `npm run automations:intelligence:contract`

Automation context stays repo-local and report-first. `automationContextPacket` is built from
`reports/automations/runs/*/latest.md`, `reports/automations/state/gate-eligibility-snapshot.json`,
`.autonomous/task-candidates.json`, `.autonomous/task-status.json`, `.autonomous/scoring-model.json`,
and current git status; missing required reports produce `distillation_incomplete` instead of guessed
recommendations. Gate snapshots that still claim an existing report is missing are exposed as
`stale_gate_snapshot` so the next action refreshes the snapshot instead of repeating a false backfill.
Context7 is docs-only, and LangGraph checkpoint memory remains runtime smoke or explicitly configured
persistence rather than a hidden recommendation store.

Mode auto-detection is available via:

- `npm run skills:detect-mode -- --prompt "<request>"`
- `npm run skills:detect-mode -- --files "<csv paths>"`
- `npm run skills:evaluate-agents`

Executable mode runner:

- `npm run skills:start -- --prompt "<request>"`
- `npm run skills:start -- --files "<csv paths>"`

Autopilot runner:

- `npm run skills:autopilot -- --prompt "<request>"`
- `npm run skills:autopilot -- --files "<csv paths>"`
- add `--telemetry` or `--telemetry-file reports/automations/state/runtime-observed/custom-skill-telemetry.jsonl` when you want runtime telemetry written to disk

## Skill Autopilot

`skills:autopilot` is the fastest safe entrypoint when you want the system to do more than pick a mode.

It returns:

- primary mode, bundle, and template
- routing confidence with score and gap to the next candidate
- execution lane such as `manual-routing`, `blocked-png`, `review-lane`, `fast-lane`, or `standard-lane`
- adaptive `recommendedAgentPack` for the current task surface
- canonical `multiAgentPack` for the selected mode
- `executionPlan`, verify commands, and first steps
- optional telemetry summary plus a richer `telemetryReport`

Telemetry usage:

- set `SKILL_MODE_TELEMETRY=1` to record detect/start/autopilot runs
- optionally set `SKILL_MODE_TELEMETRY_FILE` to override the default log path
- run `npm run skills:telemetry:report` to inspect the current telemetry summary
- default telemetry now writes into gitignored control-tower runtime-observed state

## Repo-Local Codex Automations

The automation suite for this repository lives in `.codex/automations/`.

Key entrypoints:

- `AUTOMATIONS_AUDIT.md`
- `AUTOMATIONS_ROADMAP.md`
- `AUTOMATIONS_OPERATING_MODEL.md`
- `RUNBOOK.md`
- `npm run autonomous:next`
- `npm run autonomous:execute`
- `npm run autonomous:health`
- `npm run autonomous:level-b`
- `npm run autonomous:level-b:write`
- `npm run autonomous:verify`
- `npm run automations:verify`
- `npm run automations:sync -- --dry-run`

## Architecture Guardrails

- `src/` is browser-facing application code.
- `server/` is server-only code and must never be imported into client modules.
- `shared/contracts/` is the stable cross-layer surface for small typed DTOs and schemas.
- Component-local state owns the intake draft until submit.
- Zustand owns only the active submitted workspace and hydration status.
- `result`, `documents`, and `trust` consume derived session state rather than raw persistence data.

## Verification Baseline

- run `npm run typecheck`, `npm run test`, and `npm run build` before closing substantial work
- run `npm run verify:engine` for engine/rule/result-contract changes
- run `npm run skills:verify` plus the existing Codex checks after changing `.codex/skills`
- run `npm run autonomous:verify` after changing `.autonomous/*`, `scripts/autonomous/*`, or readiness workflow gates
