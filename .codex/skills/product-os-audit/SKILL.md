---
name: product-os-audit
description: Audit a product across the live repository, Notion source-of-truth pages, roadmap databases, build briefs, and current tool capabilities. Use when Codex needs to understand what the product actually is now, detect drift between product goals and implementation, align Notion with repo reality, evaluate readiness for the next phase, or recommend the next highest-leverage moves without guessing.
---

# Product OS Audit

## Goal

Build a verified picture of the product system, not a narrative based on one document.

## Quick start

- Read evidence from three layers before concluding:
  - repo reality
  - Notion source of truth
  - current external tool/platform behavior when it materially affects recommendations
- Treat contradictions as first-class output.
- Prefer updating a single trusted artifact over spreading corrections across many pages.
- Load `references/drift-matrix.md` when you need the comparison lenses.

## Workflow

1. Build the evidence base.
   - Inspect the repository structure, routes, contracts, seed data, tests, branch state, and uncommitted work.
   - Run verification commands when they materially affect the audit: typically `typecheck`, `test`, and `build`.
   - Read the current Notion backbone first:
     - Vision / product master pages
     - open decisions
     - roadmap master page
     - roadmap database schema or relevant roadmap items
     - build briefs that claim to drive the current work
   - If the recommendation depends on the latest Codex, Lovable, Notion, deployment, or integration behavior, verify with official sources.

2. Compare the system, not isolated pages.
   - Repo vs product scope:
     - What exists in code that the product says is out of scope?
     - What is promised in Notion but not implemented?
   - Notion vs execution:
     - Do roadmap items and briefs describe the actual repo, branches, packages, and contracts?
   - Plan vs operating model:
     - Are statuses, owners, and dependencies real, or just aspirational?
   - Delivery stack vs future scale:
     - Which missing skills or automations will become bottlenecks as work accelerates?

3. Produce a drift-first diagnosis.
   - Separate:
     - aligned areas
     - broken alignment
     - risky ambiguity
     - outdated artifacts
   - Call out source-of-truth problems explicitly:
     - archived docs still steering work
     - stale build briefs
     - roadmap statuses that overstate progress
     - product scope changes not reflected in repo or Notion

4. Decide the next highest-leverage moves.
   - Recommend only moves that reduce system confusion or unlock execution.
   - Prefer a small number of moves that improve:
     - product clarity
     - execution throughput
     - quality gates
     - data/contract integrity

5. Sync when asked.
   - If the user wants synchronization, update or create one compact Notion artifact that captures:
     - current reality
     - drift list
     - decisions required
     - next tasks
   - Update roadmap or brief statuses only when repo evidence supports the change.

## Output

- `Текущая картина`
- `Что уже сильное`
- `Где drift`
- `Что мешает следующему этапу`
- `Какие skills нужны`
- `Следующие 1–3 шага`

## Rules

- Do not trust a build brief more than the repo.
- Do not trust roadmap status more than tests, contracts, and shipped routes.
- Do not flatten all contradictions into “нужно допилить”.
- Do not recommend a new skill if an existing skill already covers the need.
- If one critical artifact is missing, ask for exactly one artifact and stop.
