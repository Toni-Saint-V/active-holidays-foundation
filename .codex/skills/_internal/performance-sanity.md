---
name: performance-sanity
description: Use when Active Holidays UI changes could increase bundle size, render cost, motion overhead, or interaction latency. Runs a pragmatic performance lens without premature micro-optimization.
---

# Performance Sanity

## Goal

Keep the product responsive while preserving clarity.

## When To Use

- dense result/trust screens
- motion-heavy changes
- new derived collections or expensive render logic
- bundle-sensitive route additions

## Workflow

1. Look for work happening on every render.
2. Check whether motion and charts are doing useful work.
3. Avoid creating new heavyweight surfaces on already dense routes.
4. Note build-time bundle warnings and the probable cause.
5. Prefer structural wins over tiny memoization theatre.

## Hard Rules

- No expensive derivation in render when it can be computed once per state change.
- No motion layers that make mobile interaction feel heavy.
- No large new dependency without a real product need.
- Respect reduced-motion needs when animation is introduced.
