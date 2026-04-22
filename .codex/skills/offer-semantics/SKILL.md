---
name: offer-semantics
description: Use when changing recommendation ranking, shortlist/detail UX, primary-path presentation, or compare flows in Active Holidays. Preserves the semantic split between confirmed primary paths and compare-only alternatives.
---

# Offer Semantics

## Goal

Keep primary vs alternative offers unmistakable in data and UI.

## When To Use

- `server/lib/recommendations.ts`
- `src/screens/result/AiRecommendationPanel.tsx`
- `shared/contracts/recommendations.ts`
- `shared/contracts/offers.ts`
- `shared/domain/action/resolve.ts`

## When Not To Use

- non-offer engine work unrelated to result path presentation

## Load Shared Context

- `../_shared/active-holidays/trust-and-ai-boundaries.md`
- `../_shared/active-holidays/terminology.md`

## Workflow

1. Identify the true deterministic primary path.
2. Ensure non-primary offers stay in compare-only mode.
3. Keep labels, badges, CTA copy, and next steps aligned with that distinction.
4. Verify that `recommendedOfferId` reflects deterministic ownership, not model preference.
5. Test or manually verify primary and alternative states side by side.

## Hard Rules

- Only the primary path may feel action-confirmed.
- `good_option` and `watch` must route through compare, not direct action.
- Do not let copy hide blockers just because the surface is visually premium.
- If semantics are ambiguous, bias toward compare-only and human review.

## Companion Skills

- `ai-boundary-and-trust`
- `result-flow-integration`
- `trust-boundary-regression`

## Finish Checks

- validate shortlist/detail semantics
- verify compare CTA behavior
