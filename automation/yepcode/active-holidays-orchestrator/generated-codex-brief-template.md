# Codex Implementation Brief: {{title}}

## Objective
{{summary}}

## Product Rationale
{{business_value}}

## User Problem
{{user_problem}}

## Relevant Files To Inspect
- `README.md`
- `AGENTS.md`
- `AUTOMATIONS_OPERATING_MODEL.md`
- `.codex/automations/README.md`
- Add exact product-area files before handing to Codex.

## Implementation Constraints
- Keep changes scoped to the named product area.
- Reuse existing architecture and contracts.
- Do not invent APIs, endpoints, metrics, or user behavior.
- Use env vars for secrets.
- If UI is affected, do not implement before design approval is recorded.

## Scope
{{technical_scope_or_design_scope}}

## Non-goals
{{non_goals}}

## Acceptance Criteria
{{acceptance_criteria}}

## Test Plan
{{test_plan}}

## Risks
{{risks}}

## Rollback Notes
Revert the implementation commit or disable the affected automation/feature flag if one is introduced.

## What Not To Change
- Do not modify unrelated product areas.
- Do not broaden scope after implementation starts.
- Do not turn a research/design task into code unless the task is explicitly ready for Codex.

## Self-review Checklist
- Correctness and lifecycle state are coherent.
- Notion/GitHub links are preserved or prepared in dry-run.
- No secrets or server-only data are exposed.
- The task remains traceable to the original founder input.
