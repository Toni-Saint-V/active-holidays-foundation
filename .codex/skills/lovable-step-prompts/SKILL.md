---
name: lovable-step-prompts
description: Generate high-quality, step-specific prompts for Lovable from approved product contracts, screen maps, and technical constraints. Use when Codex needs to prepare a Lovable prompt for a single screen, a small flow, or a specific UI milestone with exact states, product rules, route constraints, and premium visual direction instead of vague design instructions.
---

# Lovable Step Prompts

## Goal

Make every Lovable step concrete enough that Lovable can move fast without inventing product logic.

## Quick start

- Write all user-facing output in Russian.
- Load `references/lovable-prompt-stack.md`.
- One prompt should cover one coherent build step, not the entire product.
- Prefer step prompts like:
  - one screen
  - one flow
  - one polish pass
  - one wiring pass

## Workflow

1. Start from approved truth.
   - Read:
     - screen contract or build brief
     - route and payload constraints
     - relevant repo UI context if it already exists
   - If the product behavior is still ambiguous, stop and escalate that ambiguity before writing the prompt.

2. Choose the prompt type.
   - `Build step`: create the first usable screen or flow.
   - `Refinement step`: tighten hierarchy, copy, or states.
   - `Wiring-safe step`: align with real routes and payload names.
   - `Polish step`: elevate visual quality without changing product behavior.

3. Build the prompt stack.
   - Every prompt should include:
     - product goal
     - target screen or flow
     - user outcome
     - required states
     - exact routes and payload keys
     - tone and visual direction
     - non-negotiable constraints
     - forbidden inventions
   - When helpful, include a short redline or acceptance checklist at the end.

4. Add the “real Lovable” guardrails.
   - Be explicit about:
     - what should be project knowledge
     - what must be preserved from the existing app
     - what may be redesigned
     - what must stay aligned with GitHub-synced code and real routes

## Output

- `Шаг`
- `Готовый prompt для Lovable`
- `Что проверить после ответа Lovable`

## Rules

- Do not ask Lovable to “сделать красиво” without structural guidance.
- Do not hide API or route constraints in a side note.
- Do not mix UI generation with unresolved product decisions.
