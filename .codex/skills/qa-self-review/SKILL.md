---
name: qa-self-review
description: Use during or after non-trivial Active Holidays implementation to run a second-pass defect hunt for weak states, regressions, and verification gaps before final handoff.
---

# QA Self Review

## Goal

Find the obvious and non-obvious cracks before the final handoff.

## When To Use

- any non-trivial code change
- especially result/trust/compare/state/route changes

## Load Shared Context

- `../_shared/active-holidays/review-checklists.md`
- `../_shared/active-holidays/anti-patterns.md`

## Workflow

1. Re-read the touched files after implementation.
2. Check loading, error, empty, and success states.
3. Check the neighboring flow, not just the changed route.
4. Compare what was intended vs what was actually verified.
5. Fix the weak point immediately when the fix is small and safe.

## Hard Rules

- Do not confuse green tests with complete verification.
- Do not hide uncertainty; name it.
- If the fix is still brittle, escalate to `multi-lens-review`.
