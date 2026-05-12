# Codex Delivery Flow

## Purpose

This document explains how work moves from user idea to Codex task to GitHub PR to merge.

## Core Rule

One task, one branch, one clean PR.

## Step 0 - Start From Repo Root

- Run from the folder that contains `.git` and `package.json`.
- Never work directly on `main`.
- `git status` must be clean, unless intentionally continuing an existing task branch.

## Step 1 - Create or Update Task Branch

- `git checkout main`
- `git pull --ff-only`
- Create task branch from `main`.

Branch naming examples:

- `docs/premium-ui-gate`
- `docs/repo-operating-layer`
- `feature/case-bound-result`
- `fix/human-review-duplicate-submit`
- `ui/result-cockpit-premium`

## Step 2 - Codex Repo Inspection

Codex must inspect:

- `package.json` scripts
- Relevant routes/components/server routes
- Relevant types/contracts
- `AGENTS.md`
- `docs/`
- `README.md` when relevant

## Step 3 - Implementation

- Follow existing repo patterns.
- Do not touch unrelated files.
- Do not add dependencies without explicit permission.
- Do not change public API without clear need.
- Do not run cosmetic refactor outside task scope.
- Docs-only tasks must stay docs-only.

## Step 4 - Self-Review

Codex must run:

- `git diff --stat`
- `git diff --check`
- `git status --short`
- Relevant available scripts from `package.json`
- Mark absent scripts as `ABSENT`

## Step 5 - Push and PR

If checks are acceptable:

- Push task branch.
- Open PR if `gh` CLI is installed and authenticated.

If PR cannot be opened automatically, report exact command for the user.

PR body must include:

- Summary
- Files changed
- Commands run
- Exact results
- Scripts absent
- Risks/follow-ups
- Rollback path

## Step 6 - Merge Gate

Do not merge if:

- Checks fail.
- Unrelated files changed.
- Rollback path is missing.
- Unsafe truth/PII/AI claims exist.
- UI PR lacks Premium UI Gate evidence.
- Any script is claimed passed but is actually absent.

## Step 7 - After Merge

- `git checkout main`
- `git pull --ff-only`
- Delete merged local branch.
- Start next task from fresh `main`.

## Codex Permissions and Limits

Codex may:

- Create/update docs/process files.
- Update `AGENTS.md`.
- Push branch when checks pass.
- Open PR when `gh` is authenticated.

Codex must not:

- Force push.
- Silently merge risky runtime changes.
- Hide failing checks.
- Claim unavailable scripts passed.
- Modify unrelated files.

For docs-only tasks:

- Codex may prepare branch and PR.
- Codex should not auto-merge unless user and repo policy explicitly allow it.
- If unsure, stop at PR and report exact merge commands.

## Human Example

User says:

"Add Premium UI Gate."

ChatGPT returns:

- Task type: `docs_update`
- Risk: `low`
- Executor: `Codex CLI`
- Branch: `docs/premium-ui-gate`
- Model: `Codex 5.3 High`
- Prompt: create scorecard and AGENTS reference

Codex does:

- Creates `docs/ui/premium-scorecard.md`
- Updates `AGENTS.md`
- Runs `git diff --check`
- Lists `package.json` scripts
- Pushes branch
- Opens PR or reports command

User/ChatGPT review:

- Confirm docs-only diff
- Confirm no runtime code changed
- Merge if clean
- Update local `main`
