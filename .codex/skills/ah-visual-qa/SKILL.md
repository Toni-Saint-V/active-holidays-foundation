---
name: ah-visual-qa
description: 'Active Holidays: проверка UI и сценариев. Используй для Playwright, screenshots, browser sanity, golden scenarios и proof перед сдачей.'
---

# AH Visual QA

## Goal

Prove the changed product surface works in real conditions.

## When To Use

- browser verification
- screenshots and visual QA
- seeded scenario / golden eval coverage
- regression proof for UI/result/trust flows
- final proof before handoff

## Workflow

1. Identify the risky state, not only the happy path.
2. Run the narrowest meaningful test first.
3. Use browser screenshots when layout or interaction changed.
4. Report exact proof and exact gaps.
5. Use internal references only when needed:
   - `_internal/playwright-e2e-visual-qa.md`
   - `_internal/golden-evals.md`
   - `_internal/qa-self-review.md`
   - `_shared/active-holidays/review-checklists.md`

## Hard Rules

- No "done" without verification.
- Screenshots are proof after implementation, not a substitute for pre-implementation PNG approval.
- Do not hide unrun checks.
