---
name: product-ux-flow-review
description: Use when evaluating or changing Active Holidays user flows. Reviews friction, CTA logic, dead ends, trust cues, state clarity, and conversion quality across landing, intake, result, trust, documents, and human-review routes.
---

# Product UX Flow Review

## Goal

Make the next action obvious and believable.

## When To Use

- route changes
- state/CTA changes
- result-loop additions
- trust or human-review messaging changes

## Load Shared Context

- `../_shared/active-holidays/flow-map.md`
- `../_shared/active-holidays/review-checklists.md`

## Workflow

1. State the user job and the business goal for the touched flow.
2. Identify the main CTA and the fallback CTA.
3. Check whether the flow adds confusion, dead ends, or overload.
4. Verify empty/loading/error/success states.
5. Ensure trust and escalation copy match the actual system behavior.

## Hard Rules

- No new screen whose job can fit into the result loop.
- No CTA that outruns the current deterministic truth.
- No “helpful” copy that hides uncertainty.
