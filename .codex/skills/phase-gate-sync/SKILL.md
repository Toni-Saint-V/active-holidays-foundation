---
name: phase-gate-sync
description: Verify whether a task, brief, or roadmap phase is actually ready to move forward, then sync the outcome back into Notion and the execution loop. Use when Codex needs to run final checks after implementation, gate movement between statuses or phases, update roadmap and build brief state based on evidence, or prevent unfinished work from being treated as complete.
---

# Phase Gate Sync

## Goal

Keep the delivery loop honest: implementation is not done until verification, review, and planning state all agree.

## Quick start

- Read the relevant roadmap item, build brief, open decisions, and repo diff.
- Load `references/gate-checklist.md`.
- Prefer evidence over intention.

## Workflow

1. Gather the gate packet.
   - Roadmap item
   - Build Brief
   - current branch or diff
   - linked repo artifacts
   - open decisions that may block the phase

2. Verify the work.
   - Run the required commands from repo guidance.
   - Check that user-facing states and technical behavior both exist.
   - If the task changed contracts, verify both producer and consumer sides.

3. Review the quality.
   - For backend, contracts, lifecycle, or domain logic: use `$bank-grade-review`.
   - For UI-heavy changes: use UI audit and, when relevant, `lovable-redline`.
   - For copy-heavy changes: review user-facing language, not just layout.

4. Decide the gate outcome.
   - `Done` only when implementation, verification, and review all support it.
   - `Review` when the build exists but still needs explicit human or AI review.
   - `Blocked` when dependencies, open decisions, or failing checks prevent safe progress.
   - `Reopen upstream` when the problem is actually in scope, brief, or product definition.

5. Sync the system when asked.
   - Update Notion statuses and residual risk notes.
   - Add the next task only if it is genuinely unblocked.
   - Do not move the roadmap forward while the real blocker remains open.

6. Check for orchestration integrity.
   - Confirm that the work passed through the right upstream artifacts:
     - clear brief before build
     - real review before closure
     - explicit residual risk before handoff
   - If the sequence was broken, return `Reopen upstream` even if the code mostly works.

## Output

- `Что проверено`
- `Результат gate`
- `Что мешает пропустить дальше`
- `Какой статус должен быть в Notion`
- `Следующий правильный шаг`

## Rules

- Do not pass the gate because the code “почти готово”.
- Do not close a phase while the definition of done still lives in TODOs or hopes.
- Do not update Notion statuses from memory.
- Do not create the next task until the current task has an honest outcome.
- Do not hide orchestration failures behind a green test run.
