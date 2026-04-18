---
name: lovable-redline
description: Create Lovable prompts from approved screen contracts and then perform a strict product, UX, and visual redline against the resulting UI. Use when Codex needs to bridge Notion screen contracts into Lovable, push Lovable toward premium quality without drifting from product logic, or review a Lovable result for hierarchy, states, trust, copy, responsiveness, and handoff safety.
---

# Lovable Redline

## Goal

Make Lovable fast and premium without letting it invent the product.

## Quick start

- Read the approved screen contract or build brief first.
- Read the relevant repo contracts and route surfaces before prompting Lovable.
- Load `references/redline-checklist.md` for the review pass.
- When needed, pair this skill with existing design or copy skills; do not rewrite their jobs here.

## Workflow

1. Build the contract pack.
   - Gather:
     - screen purpose
     - target route
     - states
     - payload names
     - exact CTA behavior
     - non-negotiable copy or compliance constraints
   - Convert that into a concise Lovable prompt.

2. Make the instructions explicit.
   - Lovable behaves best with concrete project knowledge, not vague taste.
   - State exact route names, API names, data fields, state coverage, copy tone, and visual constraints.
   - If the project uses GitHub sync, remember Lovable syncs with GitHub and the default branch flow; do not assume an unnamed feature branch flow inside Lovable.

3. Redline in passes.
   - Pass 1: product correctness
   - Pass 2: UX clarity and state coverage
   - Pass 3: premium visual quality and motion restraint
   - Pass 4: copy, trust, and compliance
   - Pass 5: mobile and desktop responsiveness

4. Produce concrete fixes.
   - Do not say “сделать премиальнее”.
   - Write change requests that a builder can execute directly.
   - Keep redlines anchored to:
     - sections
     - components
     - routes
     - states

5. Close the loop.
   - After fixes, re-check the same surfaces.
   - If the UI still fights the product contract, escalate by tightening the screen contract or build brief instead of endlessly restyling.

## Output

- `Готовый prompt для Lovable`
- `Что в решении уже держится`
- `Redline`
- `Что нужно исправить в contracts, а не только в UI`

## Rules

- Do not let Lovable invent new business logic.
- Do not let decorative motion hide state confusion.
- Do not accept premium visuals with weak empty/error/loading states.
- Do not redline abstractly; every point must map to a real UI change.
