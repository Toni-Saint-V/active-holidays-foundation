---
name: russian-trust-safe-copy
description: Use when editing any user-visible Active Holidays copy that must stay concise, Russian, concrete, and trust-safe without fake certainty.
---

# Russian Trust Safe Copy

## Goal

Make visible copy clear, concrete, and honest in Russian.

## When To Use

- any screen text in `src/screens/*`
- disclaimers and AI copy
- CTA labels, empty states, loading states, and human-review messaging

## When Not To Use

- backend-only work with no user-facing text
- legal claims that require external approval

## Load Shared Context

- `../_shared/active-holidays/product-context.md`
- `../_shared/active-holidays/trust-and-ai-boundaries.md`
- `../_shared/active-holidays/anti-patterns.md`

## Workflow

1. Read the surrounding UI and state before rewriting.
2. Prefer one short concrete sentence over layered explanation.
3. Name the next action, blocker, or uncertainty directly.
4. Keep alternative-path copy clearly non-committal.
5. Remove filler, hype, and fake assurance.

## Hard Rules

- Russian only.
- No fake confidence, guarantees, or invented requirements.
- No English product jargon when a plain Russian label exists.
- Human review should sound deliberate, not like an error.

## Expected Output

- short, specific copy
- CTA text that matches the real state
- empty/error/loading states that reduce confusion
