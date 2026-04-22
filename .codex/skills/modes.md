# Active Holidays Operating Modes

Use this file to resolve exactly one primary operating mode before loading a bundle.

## Goal

Turn routing into a repeatable runtime:

1. detect the primary mode
2. load the matching bundle
3. execute with the matching template
4. add only the secondary skills the touched surface really needs

## Router Vocabulary

- `mode`: the single primary routing decision for the task
- `bundle`: the lean skill stack attached to that mode
- `template`: the execution shape attached to that mode
- `defaultSkills`: skills the runtime recommends automatically for that mode
- `candidates`: other matched modes returned for context, not additional primary modes
- `routingConfidence`: how strongly the runtime believes the top mode should be trusted
- `executionLane`: the current execution path such as `manual-routing`, `blocked-png`, `review-lane`, `fast-lane`, or `standard-lane`
- `recommendedAgentPack`: adaptive multi-agent pack built from the current surface, confidence, and lane
- `multiAgentPack`: canonical mode-level ownership map from the registry
- `telemetryReport`: compact runtime summary for evaluator and efficiency tracking

Mode chooses direction. Bundle chooses loadout. Template chooses execution shape.

## Machine-Readable Source

The machine-readable source of truth for mode logic lives in:

- `scripts/codex/skill-mode-registry.ts`

This file explains the same runtime in operator-facing form. If they diverge, the registry wins and the docs should be corrected.

## Router Flow

1. Use `npm run skills:detect-mode`, `npm run skills:start`, or `npm run skills:autopilot` with the user prompt, touched files, or both.
2. Read the returned `mode` field first. That is the single primary mode for the task.
3. Treat `candidates` as fallback context only. They do not authorize loading multiple primary bundles.
4. Open the matching bundle in `.codex/skills/bundles.md`.
5. Open the matching template in `.codex/skills/task-templates.md`.
6. Add secondary skills only when the touched surface requires them.
7. Run the verify commands for the selected mode and the finish stack for the changed surface.

## Routing Confidence

- `high`: the runtime has enough aligned file/prompt signals to trust the primary mode directly.
- `medium`: the runtime still has a valid primary mode, but the nearby candidates should stay visible.
- `low`: keep the packet as guidance and put a human tighter in the loop before widening scope.

The runtime computes confidence from:

- score of the top candidate
- gap to the next candidate
- prompt signals
- file signals
- review-only pinning and file-pinning when relevant

The richer confidence object is returned in `skills:start` and `skills:autopilot`. Evaluator fixtures compress it to `none` / `medium` / `high` for stability.

## Execution Lanes

- `manual-routing`: no strong primary mode; route manually first.
- `blocked-png`: the mode is correct, but UI code must wait for PNG approval.
- `review-lane`: review-only or merge-gate work; keep the full evidence bar.
- `fast-lane`: high-confidence narrow surface with a short execution packet.
- `standard-lane`: the normal execution path when the task is real but not a hot path.

Execution lane is not the same as primary mode. The same mode can land in different lanes depending on confidence, review-only state, PNG gate, and file-surface complexity.

## Automatic Multi-Agent Packs

The runtime exposes two complementary packs:

- `recommendedAgentPack`:
  adaptive pack for the current run. It reacts to file surface, lane, confidence, blocked state, and review-only context.
- `multiAgentPack`:
  canonical mode pack from the registry. It is the durable ownership map for that mode family.

Use `recommendedAgentPack` to start execution now. Use `multiAgentPack` to keep the repo-wide operating model stable.

## Single Primary Mode Rule

- Every task gets one primary mode.
- Automatic detection may return multiple candidates, but only the top `mode` is operative.
- If the task spans multiple surfaces, choose the mode that owns the dominant changed files or the first risky decision.
- Review-only work should resolve to `review-gate` even when implementation-related candidates also match.
- `premium-ui` still stays blocked until PNG approval even when it is the correct primary mode.
- Do not create a second meta-router on top of this file. Strengthen this router instead.

## Where `skill-system-governance` Fits

- `skill-system-governance` is a primary operating mode, not a standalone meta-skill and not a parallel abstraction layer.
- Use it when the task is mainly about repo-local Codex surface maintenance:
  `.codex/skills/*`, `.codex/automations/*`, `scripts/codex/*`, `scripts/automations/*`, `README.md`, `AGENTS.md`, `RUNBOOK.md`, and related routing or operating docs.
- Its job is to tighten the existing router, docs, validators, or automation guidance without inventing new layers.
- If plugin or MCP files are the real dominant surface, use `plugin-surface` instead.
- If the work is on `.codex` docs that mention plugins, `skill-system-governance` still wins unless the task is actually changing plugin or MCP surface behavior.

## Mode Set

### `skill-system-governance`

- Use for `.codex/skills/*`, `.codex/automations/*`, `scripts/codex/*`, repo routing docs, and repo-local agent surface maintenance.
- This is the router-maintenance mode for the existing `.codex` surface.
- Bundle: `Skill-system governance`
- Template: `Skill-system governance`

### `ai-recommendation-boundary`

- Use for recommendation ownership, recommendation schema, AI explanations, disclaimers, or recommendation trust boundary work.
- Bundle: `AI recommendation boundary fix`
- Template: `AI recommendation boundary fix`

### `contract-boundary`

- Use for shared contracts, route validation, payload shape, schema compatibility, and cross-layer parser/caller changes.
- Bundle: `Structured contract or schema change`
- Template: `Structured contract or schema change`

### `result-flow`

- Use for result, trust, documents, compare, or human-review loop changes that should stay inside the existing product flow.
- Bundle: `Result flow integration change`
- Template: `Result flow integration change`

### `premium-ui`

- Use for screen hierarchy, layout, spacing, CTA, or visual polish work after PNG approval.
- Bundle: `Premium UI or UX refinement`
- Template: `Premium UI or UX refinement`

### `reliability-hardening`

- Use for degraded-state, stale-state, retry, fallback, or resilience work.
- Bundle: `Reliability or fallback hardening`
- Template: `Reliability or fallback hardening`

### `regression-proof`

- Use for narrow regression coverage, scenario coverage, or seeded proof expansion.
- Bundle: `Regression-test expansion`
- Template: `Regression-test expansion`

### `plugin-surface`

- Use for plugin, MCP, `.cursor/mcp.json`, marketplace, or repo-local plugin threshold work.
- Bundle: `Plugin / MCP surface governance`
- Template: `Plugin / MCP surface governance`

### `review-gate`

- Use for merge-readiness, review-only, diff review, or final ship/block decisions.
- Bundle: `Final multi-lens review of a moderate change`
- Template: `Final multi-lens review of a moderate change`

## Auto-Detection Priority

When multiple modes match with similar strength, use this priority order as the tie-break:

1. `skill-system-governance`
2. `plugin-surface`
3. `review-gate`
4. `premium-ui`
5. `ai-recommendation-boundary`
6. `contract-boundary`
7. `result-flow`
8. `reliability-hardening`
9. `regression-proof`

This tie-break order keeps repo-surface and review-gate work from being swallowed by broader product-flow matches.

## Auto-Detection Inputs

Use any available combination of:

- explicit user wording
- changed files
- touched routes or contracts
- whether the task is review-only
- whether the task is UI and therefore blocked by PNG approval

## Auto-Detection Script

Use:

- `npm run skills:detect-mode -- --prompt "<user request>"`
- `npm run skills:detect-mode -- --files "src/screens/result/ResultScreen.tsx,src/state/caseStore.ts"`
- `npm run skills:start -- --prompt "<user request>"`
- `npm run skills:autopilot -- --prompt "<user request>"`
- combine both when you have them

`skills:detect-mode` returns:

- primary mode
- why it matched
- recommended bundle
- recommended template
- suggested default-on skills
- candidate modes in priority order when more than one mode matches

Interpretation rule:

- the returned `mode` field is the only primary mode
- `candidates` are comparison data, not additional active modes

`skills:start` returns the fuller execution packet:

- primary mode
- why it matched
- recommended bundle
- recommended template
- default-on skills
- file surface summary
- routing confidence
- execution lane
- adaptive `recommendedAgentPack`
- blocked or unblocked state
- verify commands
- first execution steps
- execution plan
- candidate modes for operator context only

## Autopilot Entrypoint

Use `npm run skills:autopilot` when you want the full runtime packet in one command.

Examples:

- `npm run skills:autopilot -- --prompt "<user request>"`
- `npm run skills:autopilot -- --files "src/screens/result/ResultScreen.tsx,src/state/caseStore.ts"`
- `npm run skills:autopilot -- --prompt "<user request>" --files "README.md,scripts/codex/skill-mode-registry.ts"`
- add `--telemetry` to write JSONL telemetry for detect/start/autopilot runs
- add `--telemetry-file reports/skills/custom-skill-mode.jsonl` to override the default telemetry path

Read the packet in this order:

1. `mode`
2. `routingConfidence`
3. `executionLane`
4. `recommendedAgentPack`
5. `executionPlan`
6. `verifyCommands`
7. `multiAgentPack`

## Telemetry Report

Runtime telemetry is optional and off by default.

Enable it by:

- passing `--telemetry` to `skills:detect-mode`, `skills:start`, or `skills:autopilot`
- or setting `SKILL_MODE_TELEMETRY=1`
- optionally setting `SKILL_MODE_TELEMETRY_FILE` to choose a custom log path

Then use:

- `npm run skills:telemetry:report`

The current report summarizes:

- total runs
- runs by source
- runs by mode
- runs by lane
- blocked runs
- average routing confidence

## Hard Rules

- Pick one primary mode first; add secondary skills later only if the surface truly needs them.
- Review-only work should prefer `review-gate` over an implementation mode.
- UI wording alone does not authorize `premium-ui`; the PNG gate still applies.
- If the work is on `.codex` surface itself, prefer `skill-system-governance` even when the content mentions UI or plugins.
- Bundle or template selection never overrides the chosen primary mode.
