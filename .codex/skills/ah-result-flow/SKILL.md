---
name: ah-result-flow
description: "Active Holidays: result loop. Используй для result, trust, documents, compare, human-review и сценарной лаборатории без detached side screens."
---

# AH Result Flow

## Goal

Improve the core result loop while preserving deterministic ownership and trust.

## When To Use

- result / trust / documents / compare / human-review changes
- scenario lab changes
- result-screen state, copy, CTA, stale state, empty/loading/error/success
- any product loop after intake

## Workflow

1. Keep the existing result loop as the center of gravity.
2. Strengthen the active flow before adding new routes.
3. Keep deterministic verdicts above AI/helper layers.
4. Cover degraded and human-review paths honestly.
5. Use internal references only when needed:
   - `_internal/result-flow-integration.md`
   - `_internal/trust-boundary-regression.md`
   - `_internal/offer-semantics.md`
   - `_internal/russian-trust-safe-copy.md`

## Hard Rules

- No side screen "for completeness".
- No fake AI certainty.
- Compare-only alternatives must stay compare-only.
