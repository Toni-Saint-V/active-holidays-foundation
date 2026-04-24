# Active Holidays Task Orchestrator

YepCode-compatible automation layer for turning messy founder input into traceable Active Holidays product, engineering, design, and operations tasks.

The orchestrator is deliberately dry-run first. It can generate Notion payloads, GitHub issue payloads, and Codex implementation briefs without writing to external systems. Production writes require explicit env vars and `allow_external_writes=true`.

## What It Does

Pipeline:

1. Raw idea, transcript, founder note, bug report, or task fragment.
2. Normalize into structured task JSON.
3. Classify type, priority, product area, design approval, GitHub/Codex need.
4. Deduplicate against existing task snapshots.
5. Run a quality gate before allowing `Ready`.
6. Prepare Notion create/update payload.
7. Prepare GitHub issue payload for engineering work.
8. Generate a Codex-ready implementation brief.
9. Project GitHub events back into Notion status.
10. Run daily health audit checks for drift.

## Repository Discovery

- Framework: Vite + React + TypeScript.
- Server: Express.
- Package manager: npm.
- Tests: Vitest plus TypeScript `tsc --noEmit`.
- Existing automation layer: `.codex/automations`, `scripts/codex/*`, `reports/automations/*`.
- Existing env pattern: root `.env.example`, secrets ignored by `.gitignore`.
- Notion state: repo has `notion-surface-lock.json`, but several operational surfaces are unbound or schema-divergent. Live writes must remain fail-closed until the task database is explicitly configured.
- GitHub state: repository remote is GitHub. Issues/PRs are the correct bridge for Lovable-synced work.
- Lovable state: no direct Lovable API/config was detected in this repository. Treat GitHub as the integration bridge unless a direct API is later verified.
- YepCode capability available in Codex: `mcp__codex_apps__yepcode._run_code`, a JS/Python sandbox with env vars, datastore/storage, and packages. No deploy/list YepCode-process tool is exposed here.

## Required Environment Variables

Dry-run requires none.

Production writes require:

```bash
ACTIVE_HOLIDAYS_ENV=dev
NOTION_API_KEY=
NOTION_DATABASE_ID=
GITHUB_TOKEN=
GITHUB_OWNER=Toni-Saint-V
GITHUB_REPO=active-holidays-foundation
```

Optional:

```bash
YEP_CODE_API_KEY=
```

Never commit filled env files.

## Local Commands

```bash
npm run yepcode:orchestrator:dry-run
npm run yepcode:orchestrator:test
```

Run a specific example:

```bash
node automation/yepcode/active-holidays-orchestrator/workflows/index.cjs \
  --input automation/yepcode/active-holidays-orchestrator/examples/example-inputs.json \
  --case bug-report
```

Run health audit mode from JSON stdin:

```bash
printf '{"workflow":"health_audit","tasks":[],"github_issues":[],"github_prs":[]}' | \
  node automation/yepcode/active-holidays-orchestrator/workflows/index.cjs
```

## YepCode Usage

Create a Node.js YepCode process and use the workflow code from:

- `workflows/index.cjs`
- `workflows/orchestrator.cjs`

The exported entrypoint is:

```js
module.exports = { main };
```

Example YepCode parameters:

```json
{
  "mode": "dry-run",
  "raw_input": "Bug: human review form can be submitted twice after network retry.",
  "source": "founder_note"
}
```

Production write mode:

```json
{
  "mode": "production",
  "allow_external_writes": true,
  "raw_input": "Bug: human review form can be submitted twice after network retry.",
  "source": "founder_note"
}
```

Production mode fails loudly when required env vars are missing.

## Failure Modes

- Missing `raw_input`: throws an error.
- Weak task: status becomes `Needs Clarification`.
- Likely duplicate: updates existing task intent or marks uncertain duplicate as `Needs Clarification`.
- Missing Notion/GitHub env in production: throws an error before writing.
- Notion schema mismatch: Notion API returns an error; use `notion-database-schema.md`.
- GitHub label mismatch: GitHub may reject unknown labels; create labels first.
- Direct Lovable API missing: route through GitHub issues/branches/PRs.

## Manual Recovery

- If a wrong task was created, close the GitHub issue and mark the Notion task `Blocked` or `Needs Clarification`.
- If a duplicate was created, keep the better task, link the duplicate, and close/archive the duplicate.
- If Notion write fails, rerun in dry-run and compare payload to `notion-database-schema.md`.
- If GitHub write fails, verify token scope, repository owner/name, and labels.

## Files

- `schemas/input.schema.json`
- `schemas/task.schema.json`
- `examples/example-inputs.json`
- `workflows/orchestrator.cjs`
- `workflows/index.cjs`
- `tests/orchestrator.check.cjs`
- `generated-codex-brief-template.md`
- `notion-database-schema.md`
- `github-issue-template.md`
- `health-audit-template.md`
- `setup-checklist.md`
