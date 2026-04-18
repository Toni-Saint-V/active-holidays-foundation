---
name: build-brief-orchestrator
description: Turn approved product work into concrete execution briefs, Notion brief updates, roadmap-ready tasks, and handoff prompts for Codex CLI, Lovable, and human reviewers. Use when Codex needs to split work by owner, remove ambiguity before implementation, prepare Build Briefs in Notion, or create paste-ready execution prompts that keep product, design, and engineering aligned.
---

# Build Brief Orchestrator

## Goal

Convert a product decision into executable work without letting scope, ownership, or contracts blur.

## Quick start

- Start only from approved inputs:
  - product page
  - roadmap item
  - audited repo context
  - closed or explicitly accepted open decisions
- Load `references/brief-template.md` before drafting briefs.
- One brief = one primary executor.

## Workflow

1. Stabilize the source.
   - Read the goal page, the current roadmap item, and the repo surface that will change.
   - Refuse to build a brief on top of unresolved product ambiguity that changes implementation shape.

2. Split by executor.
   - `Codex CLI` owns:
     - contracts
     - server and client implementation
     - tests
     - hardening
     - release verification
   - `Lovable` owns:
     - UI composition
     - responsive behavior
     - state rendering
     - hierarchy and polish
   - `Human` owns:
     - legal or business approval
     - operational policy confirmation
     - irreversible product decisions
   - Do not mix these into one vague mega-brief.

3. Fill the brief fully.
   - Every brief must clearly state:
     - goal
     - what to build
     - user flows
     - screens and states
     - tech context
     - acceptance criteria
     - out of scope
     - risks or AI notes
   - Acceptance criteria must be observable and testable.
   - Avoid placeholders such as “доделать UI”, “собрать API”, or “улучшить UX”.

4. Produce handoff prompts.
   - For `Codex CLI`, always include:
     - branch or branch rule when known
     - exact files or modules
     - required verification commands
     - instruction to use agents when available
     - final self-review with `$bank-grade-review`
   - For `Lovable`, always include:
     - screen purpose
     - exact states
     - payload names and route constraints
     - tone and premium visual direction
     - forbidden product inventions

5. Sync Notion when asked.
   - Update the relevant Build Brief page or create a new one.
   - Link it back to the roadmap item.
   - Move status only when the brief is actually executable.

6. Emit artifact contracts.
   - For every brief, explicitly state:
     - input artifact
     - output artifact
     - who consumes that output next
   - This prevents downstream skills from guessing what “ready” means.

## Output

- `Исходная задача`
- `Разделение по исполнителям`
- `Что войдет в Brief`
- `Готовый prompt для Codex CLI`
- `Готовый prompt для Lovable`
- `Что остается вне scope`

## Rules

- Do not create a brief that needs another brief to explain it.
- Do not leave hidden product choices inside tech context.
- Do not let Lovable invent domain logic or API contracts.
- Do not let Codex CLI redefine UX without updating the source artifact.
- Do not leave the next consumer of the brief implicit.
