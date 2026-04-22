---
name: a11y-trust-usability
description: Use when Active Holidays UI work touches interaction controls, dialogs, sheets, copy, or navigation. Improves accessibility, focus behavior, contrast, and trust-oriented usability for real decision flows.
---

# A11y Trust Usability

## Goal

Make the product easier to use and easier to trust.

## When To Use

- any interactive UI change
- dialogs, sheets, accordions, toggles, toasts
- CTA and copy changes on critical flows

## Inspect

- touched screen/component files
- `src/hooks/useReducedMotion.ts`
- `src/ui/BottomSheet.tsx`
- `src/ui/Accordion.tsx`
- `src/ui/Toast.tsx`

## Workflow

1. Check focus path and keyboard affordance.
2. Check contrast, tap targets, and readable hierarchy.
3. Confirm screen-reader-friendly labels or states where relevant.
4. Ensure motion remains optional where it could overwhelm.
5. Make trust-critical states explicit, not color-only.

## Hard Rules

- No hidden meaning carried only by color.
- No modal/sheet without usable dismissal and focus logic.
- No CTA wording that hides risk or escalation.
- If accessibility was not verified, say so plainly.
