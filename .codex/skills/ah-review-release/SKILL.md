---
name: ah-review-release
description: 'Active Holidays: ревью и релиз. Используй для bank-grade review, multi-lens review, QA self-review, release readiness, merge/block verdict и фикса findings.'
---

# AH Review Release

## Goal

Make ship/block decisions based on findings and proof, not vibes.

## When To Use

- code review, PR review, merge readiness
- post-implementation self-review
- release gate
- fixing review findings
- final status with proof

## Workflow

1. Findings first, ordered by severity.
2. Separate correctness/lifecycle from maintainability/forward risk.
3. Fix real findings before finalizing when scope allows.
4. Run relevant gates and state exact proof.
5. Use internal references only when needed:
   - `_internal/bank-grade-review.md`
   - `_internal/multi-lens-review.md`
   - `_internal/qa-self-review.md`
   - `_internal/release-readiness.md`
   - `_internal/trust-boundary-regression.md`

## Hard Rules

- Do not praise.
- Do not call work complete with failing checks.
- Do not bury blockers under summary.
