---
name: ah-ui-implementation
description: 'Active Holidays: UI реализация после approval. Используй для кодовой доработки экранов, компонентов, responsive states, accessibility и design-system consistency.'
---

# AH UI Implementation

## Goal

Implement approved UI changes without breaking product trust or system consistency.

## When To Use

- approved UI code work
- screen/component layout changes
- interaction, focus, mobile, state handling
- design-token or shared UI changes

## Workflow

1. Confirm PNG approval exists for the UI slice.
2. Reuse existing components, tokens, state, and copy patterns.
3. Cover empty/loading/error/success when the flow needs them.
4. Verify with browser or targeted tests when the change is visible.
5. Use internal references only when needed:
   - `_internal/frontend-premium-ui.md`
   - `_internal/design-system-enforcer.md`
   - `_internal/a11y-trust-usability.md`
   - `_internal/performance-sanity.md`
   - `_internal/playwright-e2e-visual-qa.md`

## Hard Rules

- Do not invent UI APIs or route contracts.
- Do not change unrelated visual systems.
- Do not ship visible UI without proof.
