---
name: bank-grade-review
description: Review code, diffs, pull requests, migrations, schemas, API contracts, product flows, and implementation plans with a production-grade, forward-looking lens. Use when Codex needs to identify correctness risks, regression paths, maintainability debt, extensibility traps, state-machine gaps, data integrity issues, ownership leaks, operational blind spots, or missing validation. Prefer this skill for review requests where findings must be prioritized, evidence-based, optimized for long-term cleanliness rather than quick approval, written in Russian, and followed by a ready-to-paste Codex CLI handoff block.
---

# Bank Grade Review

## Goal

Produce strict, future-aware review findings that protect correctness today and changeability tomorrow.

## Quick start

- Read the artifact itself before concluding. Prefer source code, contracts, migrations, tests, and live config over summaries.
- Default to impact-first review. Report bugs, regressions, lifecycle gaps, and architecture traps before style concerns.
- Write all user-facing output in Russian, including finding titles, explanations, open questions, summaries, and any inline review comments when the environment supports them.
- Load references only when needed:
  - `references/review-rubric.md` for lens selection and artifact-specific checklists
  - `references/severity-model.md` for prioritization and finding quality
  - `references/forward-risk-checklist.md` for maintainability and extensibility stress tests

## Workflow

1. Bound the review surface.
   - Identify exactly what is under review: diff, PR, feature branch, plan, route, schema, migration, state machine, or service.
   - Pull only the files that define behavior, contracts, persistence, and tests for that surface.
   - If a critical artifact is missing, ask for one concrete artifact only.

2. Review in layers.
   - Layer 1: correctness and regressions
   - Layer 2: contract integrity and state transitions
   - Layer 3: maintainability and extensibility
   - Layer 4: operability, auditability, and test coverage

3. Stress future change.
   - Ask what happens when this feature grows, is retried, fails partially, or is extended by another engineer in six months.
   - Flag shortcuts that turn into systemic debt: duplicated rules, hidden coupling, magic strings, cross-layer leaks, raw storage shapes in UI, partial lifecycle handling, schema drift, silent fallbacks, or unowned side effects.

4. Keep only defensible findings.
   - A finding must explain:
     - what breaks or degrades
     - why the implementation allows it
     - what impact follows
     - what smallest safe fix would reduce the risk
   - If evidence is incomplete, downgrade certainty or move it to open questions.

5. Self-check independently.
   - If subagents are available and the task is non-trivial, run two independent passes:
     - Pass A: correctness, regressions, contract and lifecycle gaps
     - Pass B: maintainability, extensibility, and forward risk
   - Give subagents the artifact and the task only. Do not pass your conclusions.
   - Merge only findings that survive source review.
   - If subagents are unavailable, do two manual passes with the same split.

6. Prepare the handoff block.
   - Immediately after the review, produce a ready-to-paste Russian block for Codex CLI.
   - If the reviewed artifact belongs to a git branch, PR branch, or the current checkout branch can be resolved, include the exact branch name.
   - Never invent a branch. If the branch cannot be determined from the artifact or environment, write `Ветка: <указать_ветку>` and explicitly note that the branch must be filled in before execution.
   - In that block, always ask Codex CLI to:
     - work in the specified branch
     - connect subagents for help when available
     - split the help into at least two independent review lenses: correctness/lifecycle and maintainability/forward risk
     - run a final self-review of the completed task with `$bank-grade-review`
     - fix all real findings from that post-implementation review before finalizing
   - Keep the block specific to the review above; it must reference the actual findings or the verified absence of findings.

## Review lenses

- Contract lens: payload versions, schema alignment, enum drift, migration safety, backward compatibility.
- Lifecycle lens: missing states, invalid transitions, retry and idempotency gaps, partial-failure handling.
- Boundary lens: client/server separation, ownership clarity, dependency direction, layering, hidden shared assumptions.
- Data lens: persistence integrity, stale snapshots, duplicated derivation, normalization, audit history.
- Test lens: meaningful coverage of critical paths, negative paths, state transitions, replay or rollback.
- UX lens: only when user-visible behavior is affected; check clarity, dead ends, trust, and empty/loading/error/success states.

## Output requirements

- Put findings first and order them by severity.
- For each finding include:
  - short title
  - why it matters
  - exact artifact reference
  - concrete fix direction
- After findings, add:
  - open questions or assumptions
  - short summary of residual risk
- Immediately after the review content, add a section titled `Задание для Codex CLI`.
- Render that section as a ready-to-paste fenced text block in Russian.
- That handoff block must include:
  - the exact branch when known, otherwise `Ветка: <указать_ветку>`
  - a direct instruction to use agents in help when available
  - a direct instruction to run post-task review with `$bank-grade-review` at `.codex/skills/bank-grade-review/SKILL.md`
  - a direct instruction to fix real findings from that post-task review before final completion
- If no findings are discovered, say so explicitly and still include the Codex CLI handoff block with the safest next step or validation task.
- If no findings are discovered, say so explicitly and still mention testing or validation gaps.
- If the environment supports inline review comments, anchor findings to the narrowest file and line span possible.

## Rules

- Do not praise.
- Do not confuse "works now" with "safe to extend".
- Do not nitpick naming or formatting unless it affects correctness, operability, or future change cost.
- Do not invent hidden requirements; tie findings to actual code, contracts, tests, or user-visible behavior.
- Do not invent branch names or execution context in the handoff block.
- Prefer the stricter source of truth when documents and implementation diverge.
