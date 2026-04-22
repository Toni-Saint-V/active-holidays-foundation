---
name: protocol-structured-json-and-png-gate
description: Use first for every non-trivial Active Holidays task to keep execution-critical communication structured and block UI code until a PNG preview is approved.
---

# Protocol: Structured JSON And PNG Gate

## Goal

Remove ambiguity in operator behavior.

## Default Rule

Load this skill first for every non-trivial task in this repository.

## When To Use

- every non-trivial task in this repository
- any task that involves user-facing communication
- any task that might include UI work, even if only part of the task is visual
- any mixed task where non-UI work may proceed but UI work must stay blocked

## Workflow

1. Load this skill before task-specific repo-local skills.
2. Keep ordinary discussion in normal natural language unless the user explicitly requested JSON.
3. Use structured formatting only for execution-critical artifacts: specs, plans, handoff blocks, checklists, risks, and acceptance criteria.
4. If the task includes UI work, stop before code changes and produce a PNG preview for approval.
5. If the task mixes UI and non-UI work, continue only the non-UI slice until the UI approval arrives.

## Communication Contract

- Follow `AGENTS.md` as the durable communication contract.
- Ordinary discussion and clarification may stay in natural language.
- Structure only execution-critical outputs:
  - specs
  - implementation plans
  - handoff / paste-ready task blocks
  - status blocks when they affect execution
  - checklists, risks, and acceptance criteria
- Do not force JSON unless the user explicitly asked for JSON or another machine-readable format.
- Keep structured outputs concise, Russian-first, and execution-oriented.

## UI Gate

- Any UI task is blocked until the user has seen a PNG preview and explicitly approved it.
- UI task means:
  - new screen
  - visual redesign
  - layout / hierarchy / spacing / motion / CTA changes
  - meaningful interaction changes
  - notable user-visible state redesign
- Before touching UI code:
  1. Produce a PNG preview.
  2. Show it to the user.
  3. Wait for explicit approval.
- After approval, implement the UI in code.
- Live browser screenshots are proof of implementation, not a substitute for pre-implementation PNG approval.

## Non-UI Exception

- Backend, contracts, tests, infra, docs, data, and pure bugfixes without user-visible UI changes do not require the PNG gate.
- If a task mixes backend and UI, split the work mentally and do not start the UI slice before approval.

## Hard Rules

- No UI code changes before PNG approval.
- Do not redefine a communication rule that conflicts with `AGENTS.md`.
- No “helpful” live UI improvisation when the user asked for audit, protocol, or strategy work.
- If the user overrides the protocol explicitly, follow the new explicit rule.

## Companion Skills

- `frontend-premium-ui`
- `playwright-e2e-visual-qa`
- global `premium-png-screen-design`
