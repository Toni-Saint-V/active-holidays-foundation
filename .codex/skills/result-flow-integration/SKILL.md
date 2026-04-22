---
name: result-flow-integration
description: Use when adding or changing features inside the Active Holidays result loop across result, trust, documents, compare, or human-review surfaces.
---

# Result Flow Integration

## Goal

Improve the result loop without breaking its center of gravity.

## When To Use

- `src/screens/result/ResultScreen.tsx`
- `src/screens/result/ResultCompareSurface.tsx`
- `src/screens/documents/DocumentsScreen.tsx`
- `src/screens/trust/TrustScreen.tsx`
- `src/screens/human-review/HumanReviewScreen.tsx`
- `src/state/caseStore.ts`
- `server/routes/cases.ts`

## When Not To Use

- isolated backend work that never reaches result-loop UX

## Load Shared Context

- `../_shared/active-holidays/flow-map.md`
- `../_shared/active-holidays/product-context.md`

## Workflow

1. Start from the existing result loop and its current routes.
2. Decide whether the change belongs in result, trust, documents, or human review.
3. Prefer augmenting the active screen over adding a new screen.
4. Keep next action, compare flow, and escalation consistent across sibling surfaces.
5. Verify the non-happy path, not just the default loaded state.

## Hard Rules

- No detached AI-only screen when the result loop can hold the feature.
- No side surface that duplicates trust/documents/human-review responsibilities.
- Keep route and query-param behavior intact.
- Preserve honest `human-review` escalation.

## Companion Skills

- `product-ux-flow-review`
- `offer-semantics`
- `frontend-premium-ui`
