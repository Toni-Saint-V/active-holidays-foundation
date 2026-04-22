---
name: bugfix-root-cause
description: Use when fixing a bug in Active Holidays. Traces the failure through contracts, state, routes, and UI to find the real cause, then applies the smallest deterministic fix with proof.
---

# Bugfix Root Cause

## Goal

Fix the cause, not the symptom.

## When To Use

- regressions
- flaky state behavior
- wrong verdict/action/rendering
- stale compare or trust surfaces

## Workflow

1. Reproduce the bug or locate the failing contract/test.
2. Trace the path through browser state, route handler, shared contract, and domain logic.
3. Identify the smallest layer that can fix the issue safely.
4. Add or update regression coverage.
5. Re-check the neighboring flows.

## Hard Rules

- No speculative patch without a failure path.
- No broad cleanup hidden inside a bugfix.
- If the bug is contract drift, fix the contract first.

## Companion Skills

- `architecture-guardrails`
- `trust-boundary-regression`
