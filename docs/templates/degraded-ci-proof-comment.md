# Degraded CI Proof Comment Template

## PR

- PR: #[fill]
- Branch: `[fill]`
- Base: `main`
- Incident file: `reports/incidents/ci-degraded-mode-YYYY-MM-DD.md`
- `opened_at` (ISO): [fill]
- `expires_at` (ISO, <=24h window): [fill]
- Owner: [fill]

## Why GitHub Actions Required Check Cannot Run

- Required check: `UI polish fail-closed gate`
- Outage reason: billing lock blocks GitHub Actions job start
- Annotation evidence:
  - `The job was not started because your account is locked due to a billing issue.`
- Evidence commands:
  - `gh run list --repo Toni-Saint-V/active-holidays-foundation --workflow "UI Polish Gate" --limit 5 --json databaseId,headBranch,status,conclusion,url`
  - `gh api repos/Toni-Saint-V/active-holidays-foundation/check-runs/<check_run_id>/annotations --jq '.[0].message'`
  - `gh api repos/Toni-Saint-V/active-holidays-foundation/branches/main/protection --jq '{required_status_checks:.required_status_checks,enforce_admins:.enforce_admins.enabled,required_pull_request_reviews:{required_approving_review_count:.required_pull_request_reviews.required_approving_review_count,require_last_push_approval:.required_pull_request_reviews.require_last_push_approval,dismiss_stale_reviews:.required_pull_request_reviews.dismiss_stale_reviews},required_conversation_resolution:.required_conversation_resolution.enabled,allow_force_pushes:.allow_force_pushes.enabled,allow_deletions:.allow_deletions.enabled}'`

## Branch Protection Temporary Exception (Required Evidence)

- Protection before (JSON): [fill]
- Protection after (JSON): [fill]
- Temporary required context now: `Vercel`
- Strong review controls kept:
  - `required_approving_review_count=2`
  - `require_last_push_approval=true`
  - `required_conversation_resolution=true`
  - `enforce_admins=true`

## Local Verification Proof (Exact Results)

- `pnpm run ui:polish-check`:
  - [fill exact output summary]
- `pnpm run typecheck`:
  - [fill exact output summary]
- `pnpm run test`:
  - [fill exact output summary]
- `pnpm run build`:
  - [fill exact output summary]
- `pnpm run verify`:
  - [fill exact output summary]
- `git diff --check`:
  - [fill exact output summary]
- `git status --short --branch`:
  - [fill exact output summary]

## $bank-grade-review Result

- actual Codex skill invoked: YES/NO
- CRITICAL: [count]
- HIGH: [count]
- MEDIUM: [count]
- LOW: [count]
- fixed: [fill]
- remaining: [fill]

## Files Changed

- [fill]

## Runtime/Dependency Confirmation

- Runtime code changed: YES/NO
- Dependencies changed (`package.json`/lockfile): YES/NO
- Unrelated files changed: YES/NO

## Hard Limits Confirmation (Required)

- Schema migrations changed: YES/NO
- Auth/payments/security/PII-sensitive surfaces changed: YES/NO
- Public API contracts changed: YES/NO
- Release tagging performed: YES/NO
- Force-merge used: YES/NO

## Human Approval

Human approval to merge under degraded CI mode: YES/NO
Degraded mode expiry acknowledged: YES/NO
Return-to-normal owner/date confirmed: YES/NO

## Return To Normal Plan

- Billing recovery signal source: [fill]
- Required green reruns to close incident: [fill]
- Incident close criteria (`status: CLOSED`, `closed_at`, run IDs): [fill]
- Deferred CI failure plan (if reruns fail): [fill]
