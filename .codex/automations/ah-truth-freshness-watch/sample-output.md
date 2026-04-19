# Truth + Freshness Watch · Sample

## SOURCE HEALTH

- Official source freshness baseline mostly green.
- One operator source is nearing the stale threshold.

## RISKS TO TRUST

- If operator freshness drifts, cost/timing recommendations may become less credible.

## REQUIRED ACTION

- Re-check the operator source and refresh `lastCheckedAt` only after manual verification.

## SAFE PATCH OR MANUAL REVIEW

- Manual review first.

## VERIFY

- `npm run automations:check:truth`
