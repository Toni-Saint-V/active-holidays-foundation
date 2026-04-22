---
name: golden-evals
description: Use when changes could affect seeded Active Holidays scenarios, result semantics, compare behavior, or AI recommendation contracts. Anchors verification to golden cases, baselines, and existing tests before accepting drift.
---

# Golden Evals

## Goal

Verify behavior against stable seeded cases instead of memory.

## When To Use

- engine, result, action, or recommendation changes
- scenario-lab or compare changes
- trust-boundary-sensitive UI changes

## Inspect

- `data/scenarios/scenarios.json`
- `data/scenarios/baseline/*.json`
- `scripts/verify-engine-drift.ts`
- integration tests under `server/routes/`

## Workflow

1. Map the touched surface to the relevant seeded cases.
2. Run existing targeted tests first.
3. Run `npm run verify:engine` when result semantics may drift.
4. Only update baselines when the product change is intentional and explained.
5. Record what changed and why.

## Hard Rules

- Do not bless unexplained drift by rewriting baselines first.
- Prefer narrow regression evidence over broad claims of stability.
- If no golden check exists for a new trust boundary, add one.
