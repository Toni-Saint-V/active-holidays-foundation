# Truth + Freshness Watch · Sample

## SOURCE HEALTH

- Official source freshness baseline mostly green.
- One operator source is nearing the stale threshold.

## RISKS TO TRUST

- If operator freshness drifts, cost/timing recommendations may become less credible.
- `npm --silent run automations:check:truth -- --json` emits `issues[].productImpact`
  and `nextTasks[]` so stale truth can become actionable product work instead of
  staying as terminal-only warning text.

## REQUIRED ACTION

- Re-check the operator source and refresh `lastCheckedAt` only after manual verification.
- If the JSON report emits `nextTasks[]`, copy the highest-severity task into the
  next execution packet or mark it with an explicit owner.

## SAFE PATCH OR MANUAL REVIEW

- Manual review first.

## VERIFY

- `npm run automations:check:truth`
- `npm --silent run automations:check:truth -- --json`
