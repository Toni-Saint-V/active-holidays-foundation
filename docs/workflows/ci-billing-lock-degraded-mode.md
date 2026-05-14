# CI Billing Lock Degraded Mode

## Purpose

Temporary operational policy for a GitHub Actions outage where required checks cannot start because account billing is locked.

This mode exists to prevent merge deadlock while preserving quality control. It is not a normal release path.

## Exact Problem

- `main` is protected by required check `UI polish fail-closed gate`.
- GitHub Actions job does not start because billing is locked.
- Annotation message:
  - `The job was not started because your account is locked due to a billing issue.`

## Evidence Commands

1. Inspect current required protection:

```bash
gh api repos/Toni-Saint-V/active-holidays-foundation/branches/main/protection --jq '{required_status_checks:.required_status_checks,enforce_admins:.enforce_admins.enabled,required_pull_request_reviews:{required_approving_review_count:.required_pull_request_reviews.required_approving_review_count,require_last_push_approval:.required_pull_request_reviews.require_last_push_approval,dismiss_stale_reviews:.required_pull_request_reviews.dismiss_stale_reviews},required_conversation_resolution:.required_conversation_resolution.enabled,allow_force_pushes:.allow_force_pushes.enabled,allow_deletions:.allow_deletions.enabled}'
```

2. Get recent failed UI gate runs:

```bash
gh run list --repo Toni-Saint-V/active-holidays-foundation --workflow "UI Polish Gate" --limit 5 --json databaseId,headBranch,status,conclusion,url
```

3. Get billing-lock annotation for a failed check run:

```bash
# Example: replace <check_run_id> with value from `gh api .../commits/<sha>/check-runs`
gh api repos/Toni-Saint-V/active-holidays-foundation/check-runs/<check_run_id>/annotations --jq '.[0].message'
```

## Normal Policy (Default)

- Required GitHub Actions checks must be green.
- Merge without required check success is blocked.

## Degraded-Mode Policy (Billing Lock Only)

Degraded mode is allowed only when billing-lock evidence is attached and required checks cannot start.

Under degraded mode:

- `main` remains protected.
- Failures/skips/not-started checks are never ignored silently.
- Merge is allowed only with:
  - full local verification proof
  - exact command outputs
  - `$bank-grade-review` proof
  - degraded-mode PR comment evidence
  - explicit human approval

### Allowed Bypass Path (Only One)

To avoid deadlock while preserving protection, use only this temporary path:

1. Keep branch protection enabled (`enforce_admins`, review requirements, conversation resolution, no force-push/delete).
2. Temporarily replace required check context:
   - from `UI polish fail-closed gate`
   - to `Vercel`
3. Keep `require_last_push_approval=true` and `required_approving_review_count=2`.
4. Record exact branch-protection JSON before/after in PR evidence.
5. Restore normal required check contexts after billing recovery.

No other bypass route is allowed.

Strict temporary guardrails:

- Incident file is mandatory: `reports/incidents/ci-degraded-mode-YYYY-MM-DD.md`.
- Incident must contain `opened_at`, `expires_at`, `owner`, `affected_prs`, and return-to-normal steps.
- Max active window per incident is `24h`; expired incidents are automatically invalid.
- Renewal is allowed only with fresh outage evidence and a new `expires_at`.
- If incident is expired or missing required fields, merge decision is `BLOCKED`.

## Required Local Proof (Mandatory)

Run and attach exact outputs:

```bash
pnpm run ui:polish-check
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run verify
git diff --check
git status --short --branch
```

Also attach:

- `$bank-grade-review` result
- list of changed files
- explicit confirmation that runtime/dependencies were not changed for docs-only tasks
- explicit confirmation that hard limits were respected:
  - no schema migrations
  - no auth/payments/security/PII-sensitive changes
  - no public API contract changes
  - no release tagging
  - no force-merge

## Required PR Comment Template

Use:

- `docs/templates/degraded-ci-proof-comment.md`

The comment must include:

- PR number and branch
- billing-lock reason and annotation evidence
- local checks with exact results
- `$bank-grade-review` result
- files changed
- runtime/dependency confirmation
- explicit human approval line

## Required Human Approval Wording

Use this exact line in PR comment:

- `Human approval to merge under degraded CI mode: YES/NO`
- `Degraded mode expiry acknowledged: YES/NO`
- `Return-to-normal owner/date confirmed: YES/NO`

## Rollback to Normal Mode

After billing is restored:

1. Re-enable normal required GitHub Actions gate policy.
2. Re-run `UI Polish Gate` on active PR branches.
3. Confirm required check status is `completed/success`.
4. Close incident note (`status: CLOSED`, `closed_at`, linked green run IDs).
5. Remove degraded-mode usage from active PRs.

If deferred CI reruns fail after temporary degraded merges:

1. Keep incident open and set merge decision to `BLOCKED`.
2. Stop additional degraded-mode merges.
3. Open revert or hotfix PR with owner/date.
4. Attach rerun failures and recovery plan in incident update.
5. Resume merges only after reruns are green or revert is merged.

## Explicit Warning

Degraded mode is temporary outage handling only.

It must not become the default release process.
