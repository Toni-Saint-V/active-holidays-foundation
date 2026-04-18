---
name: delivery-control-tower
description: Orchestrate a full product delivery loop across Notion, roadmap, build briefs, Lovable, repository work, reviews, and phase gates by choosing and sequencing the right specialized skills. Use when Codex needs to manage the whole workflow end-to-end, decide the next best action, prevent drift between tools, and ensure every step is verified before the next one starts.
---

# Delivery Control Tower

## Goal

Run the whole AI-assisted delivery system as one controlled pipeline instead of a collection of disconnected prompts.

## Quick start

- Write all user-facing output in Russian.
- Load `references/pipeline-order.md`.
- Load `references/skill-contracts.md` when sequencing multiple skills.
- Load `references/routing-matrix.md` when you need exact allowed transitions and blockers.
- This skill is the orchestrator. It should delegate conceptually to the right skill, not duplicate them.

## Core capability

Choose the right sequence of skills for the current job:

- `product-os-audit`
  for reality check and drift detection
- `market-reality-product-innovation`
  for market validation and strong forward-looking product bets
- `notion-ai-sync-director`
  for the main Notion AI sync-pass
- `build-brief-orchestrator`
  for turning work into executable briefs
- `lovable-step-prompts`
  for step-by-step Lovable prompts
- `lovable-redline`
  for product-safe UI redline
- `ai-interactive-screen-audit`
  for AI-native and interactivity upgrades
- `ui-motion-performance-polish`
  for final premium polish and speed
- `notion-catalog-sync`
  for moving product truth into repo data and contracts
- `bank-grade-review`
  for correctness, lifecycle, and maintainability review
- `phase-gate-sync`
  for honest completion and status sync

## Workflow

1. Diagnose the current stage.
   - Is the problem:
     - product ambiguity
     - Notion drift
     - weak briefing
     - weak UI direction
     - weak AI/interactivity layer
     - weak code quality
     - weak finish / gate?

2. Choose the minimum effective sequence.
   - Do not run every skill every time.
   - Use only the subset that closes the current gap.
   - Never start a downstream skill until the upstream skill has produced the artifact it depends on.
   - If a required upstream artifact is missing, stop and route back instead of improvising.

3. Produce the command path.
   - Tell the user or the next agent:
     - which skill goes first
     - what artifact it consumes
     - what artifact it must produce
     - what evidence is needed before the next skill starts

4. Enforce ownership boundaries.
   - Every skill has one primary job.
   - If two skills seem to overlap, pick the one that owns the earlier stage in the pipeline.
   - Do not use a downstream polish or review skill to compensate for missing upstream product clarity.

5. Enforce gate discipline.
   - No build without a clear brief.
   - No UI polish before UX/state clarity.
   - No phase closure without verification and review.
   - No market-level reprioritization without a documented product decision output.

## Output

- `Где мы сейчас`
- `Какой skill нужен первым`
- `Полный порядок шагов`
- `Что будет артефактом на выходе каждого шага`
- `Где нужен ручной контроль владельца`

## Rules

- Do not run the whole tower when one skill solves the problem.
- Do not let a downstream skill compensate for an upstream ambiguity.
- Do not move to polish while contracts or states are still unstable.
- Do not allow two skills to edit the same conceptual artifact for different purposes in the same step.
- Prefer a linear artifact chain: audit -> sync -> brief -> build -> redline -> upgrade -> polish -> review -> gate.
- If the current step cannot name its required input artifact, it is not ready to start.
