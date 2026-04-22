---
name: design-system-enforcer
description: Use when Active Holidays UI work touches tokens, spacing, surfaces, typography, radii, buttons, cards, or shared components. Enforces consistency on top of the current dark visual system instead of ad-hoc local styling.
---

# Design System Enforcer

## Goal

Keep the visual system coherent while it evolves.

## When To Use

- `src/styles/index.css`
- `src/theme/tokens.ts`
- `src/ui/primitives.tsx`
- shared UI components

## Workflow

1. Reuse existing tokens and primitives first.
2. If a new token is needed, prove it repeats across more than one surface.
3. Keep spacing and surface treatment consistent across siblings.
4. Prefer semantic tones over hard-coded colors in screen files.
5. Remove one-off visual hacks during the change when safe.

## Hard Rules

- No new accent colors without system reason.
- No inline color/radius/shadow drift.
- No duplicate button/card primitives.
- Do not solve hierarchy problems by stacking more chrome.

## Companion Skills

- `frontend-premium-ui`
- `a11y-trust-usability`
