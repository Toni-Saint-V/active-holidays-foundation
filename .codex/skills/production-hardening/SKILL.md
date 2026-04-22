---
name: production-hardening
description: Use when finishing substantial Active Holidays work that touches routes, persistence, state, AI, or critical UX flows. Adds the final pass for edge states, idempotency, rollback safety, and long-term maintainability.
---

# Production Hardening

## Goal

Raise a working change to production-minded quality.

## When To Use

- route and state changes
- decision ledger or scenario-lab changes
- AI recommendation or trust-surface changes
- any feature that is almost done but still needs edge-state hardening

## Load Shared Context

- `../_shared/active-holidays/architecture-map.md`
- `../_shared/active-holidays/review-checklists.md`

## Workflow

1. Stress retries, partial failures, and repeated actions.
2. Check contract stability and idempotent behavior.
3. Look for stale-state, missing-state, and rollback gaps.
4. Remove shortcuts that would confuse the next change.
5. Finish with full relevant verification.

## Hard Rules

- Do not leave TODO-level behavior in critical flows without naming the limit.
- Do not ship implicit assumptions about process-local state.
- Prefer small, testable hardening changes over broad rewrites.

## Companion Skills

- `architecture-guardrails`
- `release-readiness`
- `multi-lens-review`
