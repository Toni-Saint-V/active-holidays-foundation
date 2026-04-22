---
name: fallback-safe-behavior
description: Use when AI, scenario-lab, or other non-core assistance layers can fail or be absent in Active Holidays. Keeps deterministic result surfaces useful, explicit, and trust-safe under degraded conditions.
---

# Fallback Safe Behavior

## Goal

Make degraded states honest and still operational.

## When To Use

- AI recommendation errors or no-API-key mode
- scenario-lab refresh failures
- optional enhancement layers around result/trust flows

## Load Shared Context

- `../_shared/active-holidays/trust-and-ai-boundaries.md`
- `../_shared/active-holidays/flow-map.md`

## Inspect

- `server/lib/recommendations.ts`
- `src/screens/result/AiRecommendationPanel.tsx`
- `src/state/caseStore.ts`
- related tests for failed refresh or missing shortlist

## Workflow

1. Decide what remains deterministic and usable.
2. Show explicit degraded-state messaging.
3. Keep retry paths visible and minimal.
4. Preserve previous useful state only when it reduces confusion and stays truthful.
5. Verify the fallback path visually or through tests.

## Hard Rules

- Never imply the base verdict is invalid because AI is unavailable.
- Never hide an unavailable enhancement behind a blank area.
- Never route a degraded alternative as a confirmed next action.
