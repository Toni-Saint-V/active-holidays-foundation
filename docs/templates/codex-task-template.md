# Codex Task Template

## Mandatory Task Block Header

Use this header exactly before the transfer block:

1) Что это:
2) Для чего:
3) Модель:
4) Сложность:
5) Готовность:

Then provide one transfer block only.

Keep explanations minimal.
The user is the messenger between ChatGPT and Codex.
Do not make the user manage process details manually.
Do not provide command/task blocks below 8/10 quality; improve them first.

---

## 1) What This Is

One-line task description.

## 2) What It Is For

Expected product or delivery impact.

## 3) Model

- Recommended model:
- Reason:

## 4) Complexity /10

- Score:
- Why:

## 5) Block Readiness %

- Readiness:
- Blockers (if any):

---

## Goal

Clear task goal with success criteria.

## Context

Relevant product/technical context and source of truth.

## Branch

- Working branch:
- Base branch:

## Files/Areas To Inspect

- `package.json` scripts
- Relevant code/contracts/docs
- `AGENTS.md`
- `docs/`
- `README.md` when relevant

## Required Changes

List exact deliverables.

## Constraints

- Keep scope task-focused.
- No unrelated files.
- No fake checks/results.
- Mark missing scripts as `ABSENT`.

## What Not To Touch

List forbidden files or areas.

## Checks

List required commands and manual checks.

## Expected Output

List the final report fields expected from Codex.

## Rollback Path

Exact git/file rollback method.

---

## Standard Model Guidance

- `GPT-5.5 Thinking`: planning, architecture, PR review, release decisions.
- `Codex 5.3 High`: normal repo changes, docs, bug fixes, UI polish.
- `Codex 5.3 ExtraHigh/XHigh`: high-risk multi-file work, security, PII, auth, payments, deep refactor, complex debugging.

## Quality Floor

Do not provide command/task blocks below `8/10` quality. Improve them before handoff.
