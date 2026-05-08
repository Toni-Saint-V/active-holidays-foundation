# AI_ROUTER.md

## Purpose

This file is the single root entrypoint for AI routing in this repository.
It does not replace canonical docs; it routes to them.

## Read Order

1. Current task context (`user prompt`, active task, or Notion task when provided).
2. `AI_ROUTER.md`.
3. `AGENTS.md`.
4. Only the smallest relevant set of domain docs for the task.

## Source of Truth Order

1. Current repo code, contracts, and tests.
2. `AGENTS.md`.
3. `docs/product-canon-v1.md`.
4. Relevant skill docs under `.codex/skills/`.
5. Notion only when the task explicitly requires it.
6. `reports/*` only as evidence/reference, never as active instruction.

## Routing

- Agent rules: `AGENTS.md`
- Skill selection (human-facing): `.codex/skills/index.md`
- Skill mode machine source: `scripts/codex/skill-mode-registry.ts`
- Architecture reference: `.codex/skills/_shared/active-holidays/architecture-map.md`
- UI reference: `.codex/skills/_shared/active-holidays/premium-ui-playbook.md`
- Product truth: `docs/product-canon-v1.md`
- Automation workflows: `.codex/automations/README.md`, `RUNBOOK.md`
- Autonomous/report-first workflows: `.autonomous/operating-system.md`
- Evidence artifacts: `reports/*`

## Context Rules

- Do not load all docs by default.
- Do not treat `reports/*` as active instructions.
- Do not treat setup docs as runtime instructions.
- Read only the smallest relevant context set.
- Prefer existing canonical docs over duplicate or derivative docs.

## Execution Rules

- Keep diffs minimal and task-scoped.
- Do not perform unrelated refactors.
- Validate changes with the smallest relevant checks.
- Summarize changed files in final output.
- Update Notion/GitHub only when explicitly required by the task.
