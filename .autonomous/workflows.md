# First 11 Autonomous Workflows

## 1. Repo Runtime Radar

Scans repo state, recent commits, tests, automation reports, and product surfaces to generate current candidate tasks.

## 2. Next Best Task Selector

Scores all candidates and selects the highest-value safe task using the balanced score.

## 3. Autonomous Dry-run Cycle

Persists the selected task, founder report, executor packet, and cycle report, then runs verification in report-first mode with external writes disabled.

The cycle report must include four readiness levels:

- local executor readiness
- director dry-run readiness
- Notion writeback readiness
- external executor readiness

## 4. Branch Executor

Creates a `codex/*` branch for the selected task and keeps the change small and reviewable.

## 5. Verification Runner

Runs the relevant verification stack:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run automations:verify`
- targeted scripts for touched surfaces

## 6. Self-review Gate

Reviews the diff for correctness, lifecycle gaps, maintainability, edge cases, and missing tests before PR.

## 7. CodeRabbit Gate

Runs CodeRabbit when available and blocks or records findings by severity.

## 8. Review-fix Loop

Fixes real review findings, reruns checks, and updates the founder report.

## 9. PR-ready Publisher

Pushes branch and opens a PR when requested or when the system is explicitly allowed to publish.

## 10. Notion/GitHub Sync Planner

Prepares dry-run sync payloads for task status, PR links, execution summary, and remaining risk.

## 11. Founder Report Writer

Produces a concise report with product impact, technical impact, verification, risks, and next task.

## Workflow Boundary

The current implementation supports workflows 1, 2, 3, 5, 10, and 11.

Workflow 4 now exists in Stage A form:

- select only executor-safe candidates
- fail closed on dirty tracked state
- create a local `codex/*` branch only in explicit write mode
- keep external writes disabled

Workflow 10 now reads `reports/automations/state/gate-eligibility-snapshot.json` and projects blocked/passed status into autonomous packets. Missing or malformed gate state is treated as `unknown`, not as permission.

Workflow 6 is currently enforced by the operator/session review gate, including `$bank-grade-review` and `$multi-lens-review` after each task. Workflows 7 and 8 still require additional executor permissions and are activated only after the Stage A branch-preparation layer proves stable.
