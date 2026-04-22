---
name: playwright-e2e-visual-qa
description: Use when Active Holidays UI changes need real browser verification, mobile/desktop screenshots, or state-flow sanity checks. Wraps the global `playwright` skill with repo-specific routes, artifact locations, and verification expectations.
---

# Playwright E2E Visual QA

## Goal

Verify the real UI, not just component intuition.

## When To Use

- screen/layout changes
- interaction or navigation changes
- loading/error/empty-state work
- trust/result/compare/human-review flows

## Load Shared Context

- `../_shared/active-holidays/flow-map.md`
- `../_shared/active-holidays/review-checklists.md`

## Repo Notes

- The repo has no committed Playwright test suite or config right now.
- Use the global `playwright` skill in CLI mode.
- Keep captured artifacts under `output/playwright/`.

## Workflow

1. Start the correct local surface.
2. Verify the real port before browsing.
3. Check desktop and mobile for the touched routes.
4. Capture screenshots for the primary state and the risky state.
5. If browser verification is blocked, say exactly what blocked it.

## Priority Routes

- `/`
- `/intake`
- `/result`
- `/documents`
- `/trust`
- `/human-review`

## Hard Rules

- Do not use live browser screenshots as pre-implementation design approval for UI work.
- PNG preview approval still happens before UI code changes.
- Do not claim visual QA from code inspection alone.
- Re-snapshot after significant DOM changes.
- Verify the exact route/query state you changed.
- Prefer one strong screenshot set over vague “looks fine”.
