---
name: trust-boundary-regression
description: Use when changing result, trust, compare, recommendation, or human-review behavior in Active Holidays. Runs a regression lens over deterministic ownership, compare-only semantics, disclaimers, and honest escalation.
---

# Trust Boundary Regression

## Goal

Catch product-trust regressions before they ship.

## When To Use

- result or compare UX changes
- recommendation shortlist/detail changes
- human-review or trust-surface changes
- action or disclaimer changes

## Load Shared Context

- `../_shared/active-holidays/trust-and-ai-boundaries.md`
- `../_shared/active-holidays/review-checklists.md`

## Workflow

1. Identify the trust promise affected by the change.
2. Check primary vs alternative semantics.
3. Check `HUMAN_REVIEW` and degraded states.
4. Check Russian copy for fake certainty.
5. Run targeted tests and at least one manual sanity read of the visible UI.

## Hard Rules

- Treat trust regressions as blockers, not polish.
- Do not update baselines or tests just to bless drift without explanation.
- If automated coverage is missing, state the exact gap.

## Typical Checks

- shortlist source/disclaimer
- compare-only CTA copy
- human-review escalation
- fallback messaging
- trust screen gating for human-review cases
