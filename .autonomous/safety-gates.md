# Autonomous Safety Gates

## Default Permission Model

The system may autonomously:

- inspect repository files
- create task candidates
- score and select safe work
- create local branches
- edit non-production files
- run tests, typecheck, build, and verification scripts
- create PR-ready branches
- prepare Notion/GitHub sync payloads in dry-run
- produce founder reports

The system must stop for founder approval before:

- merge into `main`
- production deploy
- live Notion writeback that changes strategic or product records
- paid API action
- legal or commercial claim
- secrets, billing, credentials, tokens, or key rotation
- destructive database action
- production data mutation

## UI Work Gate

If a selected task changes UI, layout, hierarchy, copy with visual impact, or interaction flow:

1. produce a UX direction first
2. identify affected states
3. confirm whether PNG/design approval is required by project rules
4. only then implement the safe UI slice

## Notion Gate

The system may prepare Notion payloads, but live strategic/product writeback requires:

- locked target id or data source id
- `syncKey`
- dry-run diff
- manual approval tuple
- rollback note

If the target is unbound or schema-divergent, emit `blocked_by_target_binding` or `blocked_by_surface_drift`.

## GitHub Gate

The system may create branches and prepare PRs. Merge is never automatic.

PRs must include:

- product reason
- what changed
- verification
- risk and rollback

## Local Executor Stage

Stage A local executor may proceed only when:

- the selected task is executor-safe
- tracked git state is clean
- the run starts from `main`
- the target branch does not already exist
- external writes remain disabled

Branch policy:

- branch name format: `codex/autonomous-<candidate-id>`
- push is not automatic
- PR publish is not automatic
- merge into `main` remains founder-approved only

## CodeRabbit Gate

Run CodeRabbit review when available. If unavailable because of auth, rate limit, or network failure:

- report the exact blocker
- do not fake CodeRabbit findings
- continue only with local self-review and mark the external review gap

## Fail-closed Rule

When uncertainty is high, the system downgrades the specific decision to report-first and continues only with safe local implementation elsewhere.
