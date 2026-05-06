# Deep Orchestration Mode

Use this reference only when `orchestrationMode.status` is `enabled` in `skills:autopilot` / `skills:start`.

## Activation

- `npm run skills:orchestrate -- --prompt "..."`
- `PROMPT="..." npm run ah:orchestrate`
- `AH_DEEP_ORCHESTRATION=1 npm run skills:autopilot -- --prompt "..."`
- `npm run skills:autopilot -- --deep-orchestration --prompt "..."`

Turn it off explicitly with:

- `AH_DEEP_ORCHESTRATION=0`
- `--no-deep-orchestration`

## Skill Scan

1. Resolve the single primary mode first.
2. Read `modes.md`, `bundles.md`, `packs.md`, and `situations.md`.
3. Load the primary mode skills.
4. Add every candidate skill that owns a real risk surface: product, contracts, UI, AI, QA, release, automation, plugin/MCP, copy, or Notion handoff.
5. Load internal references only when they are named by an active skill or match a concrete risk.

Do not cap the stack at two skills for broad work. Do not load irrelevant skills just to make the stack look larger.

## Agent Planning

Create subagents only when the task can be split by independent ownership.

Use these roles as a menu, not a fixed ritual:

- `runtime-owner`: router, scripts, automation, contracts.
- `domain-owner`: shared contracts, server, state, deterministic engine.
- `ux-owner`: product flow, Russian copy, trust and CTA clarity.
- `ui-owner`: approved UI implementation only after PNG approval.
- `qa-owner`: tests, browser proof, edge states, regression evidence.
- `review-owner`: bank-grade review, ship/block verdict, residual risk.
- `handoff-owner`: Notion, Lovable, Cursor, Codex, PR text.

Every agent needs:

- objective
- owned files or responsibility
- skills to apply
- deliverable
- verification or review expectation

Keep the main agent on the immediate critical path. Do not delegate the next blocking action.

## Prompt Hardening

Every deep plan should define:

- user goal
- business goal
- primary flow
- source of truth
- constraints and forbidden scope
- risks and edge cases
- acceptance criteria
- proof commands
- stop conditions
- paste-ready handoff if another tool or human continues the work

Ask for exactly one missing artifact when safe execution is blocked.

## Hard Stops

- No UI code before PNG approval.
- No invented APIs, endpoints, metrics, user behavior, or Notion state.
- No subagent if runtime policy, coupling, or write scope makes it unsafe.
- No final "done" without verification evidence.
