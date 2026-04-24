# First 10 Autonomous Workflows

## 1. Repo Runtime Radar

Scans repo state, recent commits, tests, automation reports, and product surfaces to generate current candidate tasks.

## 2. Next Best Task Selector

Scores all candidates and selects the highest-value safe task using the balanced score.

## 3. Branch Executor

Creates a `codex/*` branch for the selected task and keeps the change small and reviewable.

## 4. Verification Runner

Runs the relevant verification stack:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run automations:verify`
- targeted scripts for touched surfaces

## 5. Self-review Gate

Reviews the diff for correctness, lifecycle gaps, maintainability, edge cases, and missing tests before PR.

## 6. CodeRabbit Gate

Runs CodeRabbit when available and blocks or records findings by severity.

## 7. Review-fix Loop

Fixes real review findings, reruns checks, and updates the founder report.

## 8. PR-ready Publisher

Pushes branch and opens a PR when requested or when the system is explicitly allowed to publish.

## 9. Notion/GitHub Sync Planner

Prepares dry-run sync payloads for task status, PR links, execution summary, and remaining risk.

## 10. Founder Report Writer

Produces a concise report with product impact, technical impact, verification, risks, and next task.

## Workflow Boundary

The first implementation focuses on workflows 1, 2, 4, 5, 9, and 10. Workflows 3, 6, 7, and 8 require additional executor permissions and are activated only after the selection layer proves stable.
