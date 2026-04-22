---
name: ai-cache-and-state
description: Use when changing Active Holidays AI recommendation state, case-bound invalidation, refresh behavior, or stale-safe UI handling. Prevents cross-case bleed, broken invalidation, and trust-breaking state loss.
---

# AI Cache And State

## Goal

Keep AI state scoped, fresh enough, and safe under refresh failures.

## When To Use

- `src/screens/result/AiRecommendationPanel.tsx`
- `src/state/caseStore.ts`
- `src/lib/apiClient.ts`
- recommendation or scenario-lab state tests

## When Not To Use

- prompt-only copy edits

## Load Shared Context

- `../_shared/active-holidays/architecture-map.md`
- `../_shared/active-holidays/trust-and-ai-boundaries.md`

## Workflow

1. Identify the cache key or invalidation boundary.
2. Scope state by `caseId` and any deterministic freshness marker such as `computedAt`.
3. Preserve the last good payload only where stale-safe behavior is part of the contract.
4. Make AI failure non-fatal for deterministic surfaces.
5. Add regression coverage for retry, refresh, and case switching.

## Hard Rules

- No cross-case data reuse.
- No stale AI detail shown for a new result silently.
- Do not clear useful deterministic UI because an AI fetch failed.
- Preserve compare-only safety under reload and retry.

## Companion Skills

- `fallback-safe-behavior`
- `trust-boundary-regression`
