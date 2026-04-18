---
name: ui-motion-performance-polish
description: Elevate a screen or flow to a premium standard across visual quality, motion design, responsiveness, accessibility, and front-end performance. Use when Codex needs to audit or refine a screen after the core UX is already defined, especially to tighten hierarchy, reduce visual slop, improve animation quality, remove lag, and reach a high-end production feel without harming maintainability.
---

# UI Motion Performance Polish

## Goal

Push a screen from “working” to “premium and fast”.

## Quick start

- Write all user-facing output in Russian.
- Load `references/polish-checklist.md`.
- This skill starts after the screen job and states are already clear.
- Use it for tightening, not for inventing a new product flow.

## Workflow

1. Audit visual quality.
   - Check:
     - hierarchy
     - spacing rhythm
     - typography consistency
     - color discipline
     - CTA clarity
     - mobile readability

2. Audit motion quality.
   - Motion must:
     - clarify transitions
     - show causality
     - preserve orientation
     - respect reduced-motion settings
   - Reject motion that only decorates.

3. Audit performance.
   - Look for:
     - oversized bundles
     - unnecessary rerenders
     - heavy animation surfaces
     - no code-splitting where it matters
     - expensive charts or timelines always mounted

4. Produce a 10/10 pass.
   - Break recommendations into:
     - must-fix quality problems
     - premium polish
     - performance hardening
   - Keep suggestions implementable and measurable.

## Output

- `Качество UI`
- `Качество motion`
- `Производительность`
- `Что исправить в первую очередь`
- `Что добавит ощущение 10/10`

## Rules

- Do not optimize a broken screen into a faster broken screen.
- Do not add motion that increases CPU cost without user benefit.
- Do not trade maintainability for tiny visual gains unless the value is obvious.
