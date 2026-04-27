---
name: frontend-premium-ui
description: Use for Active Holidays screen or shared UI work that changes hierarchy, layout, spacing, CTA weight, or premium visual polish after PNG approval.
---

# Frontend Premium UI

## Goal

Ship screens that feel deliberate, trustworthy, and product-strong, not generic.

## When To Use

- any `src/screens/*`
- shared UI surface changes in `src/ui/*`
- layout, hierarchy, spacing, motion, or CTA work

## When Not To Use

- backend-only tasks
- broad redesigns that ignore current repo contracts

## Load Shared Context

- `../_shared/active-holidays/product-context.md`
- `../_shared/active-holidays/flow-map.md`
- `../_shared/active-holidays/premium-ui-playbook.md`
- `../_shared/active-holidays/review-checklists.md`
- `../_shared/active-holidays/anti-patterns.md`

## Inspect

- `src/styles/index.css`
- `src/theme/tokens.ts`
- `src/ui/primitives.tsx`
- `src/app/AppShell.tsx`
- touched screen files
- the sibling screen in the same user flow

## Workflow

1. Communicate with the user only through structured JSON.
2. Produce a PNG preview and get explicit approval before changing UI code.
3. State the screen promise, dominant CTA, and fallback CTA in one sentence each.
4. Choose one surface recipe from `premium-ui-playbook.md` and strengthen the first viewport before touching lower sections.
5. Keep deterministic verdict, next action, or user job above AI helpers, compare tools, or tertiary metadata.
6. Rewrite visible copy into short Russian action language before adding more visual treatment.
7. Reduce section count, card count, and badge count until the layout feels calmer, not busier.
8. Use existing tokens and primitives before inventing new surface styles.
9. Validate mobile spacing, thumb reach, and compare-only honesty.

## Hard Rules

- No UI code before PNG approval.
- No prose replies outside structured JSON.
- No generic SaaS card soup.
- No random colors, radii, borders, or shadows.
- No more than one dominant CTA cluster in the same viewport.
- No AI or compare surface visually outranking the deterministic answer on result screens.
- No alternative path styled like a confirmed primary action.
- No decorative motion without hierarchy value.
- No generic marketing filler on product screens.
- All visible copy stays Russian and trust-safe.

## Typical Upgrade Moves

- Merge two weak cards into one stronger section with a clearer title and action.
- Pull disclaimers or trust language closer to the UI element they qualify.
- Convert long explanation paragraphs into verdict / proof / action structure.
- Demote tertiary metadata into compact rows instead of separate cards.
- Remove the visual flourish first if the hierarchy already works without it.

## Companion Skills

- `protocol-structured-json-and-png-gate`
- `design-system-enforcer`
- `product-ux-flow-review`
- `russian-trust-safe-copy`
- `a11y-trust-usability`
- `performance-sanity`
- `playwright-e2e-visual-qa`

## Litmus Checks

- Remove the nav: does the screen still feel branded and clear?
- Remove the shadow: does the design still hold?
- Three seconds: is the next action obvious?
- Mobile: does anything feel cramped or noisy?
- Compare-only: could a user mistake the secondary path for the confirmed next step?
