---
name: ah-control-protocol
description: Active Holidays: главный протокол работы. Используй для старта сложной задачи, выбора режима, PNG-gate для UI, JSON/handoff дисциплины и защиты от лишних действий.
---

# AH Control Protocol

## Goal

Keep Active Holidays execution disciplined without exposing dozens of atomic skills.

## When To Use

- старт любой нетривиальной задачи в этом репозитории
- выбор режима работы
- UI-задачи, где нужен PNG approval перед кодом
- handoff / prompt / checklist / risk output
- ситуация, где нужно остановить scope creep

## Workflow

1. Resolve one primary mode before loading extra context.
2. For UI work, block code changes until a PNG preview is explicitly approved.
3. Use structured JSON only for execution-critical artifacts.
4. Keep ordinary discussion human-readable and short.
5. Use internal references only when needed:
   - `_internal/protocol-structured-json-and-png-gate.md`
   - `_internal/repo-hygiene-and-structure.md`
   - `_internal/docs-and-handoff.md`

## Hard Rules

- No UI code before PNG approval.
- No broad skill loading when one action skill is enough.
- No fake completeness without verification.

