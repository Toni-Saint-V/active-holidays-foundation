---
name: notion-ai-sync-director
description: Prepare a high-quality sync-pass for Notion AI and then define what Codex must clean up manually after that pass. Use when Codex needs to offload the first bulk synchronization of product docs, roadmap items, build briefs, and execution artifacts to Notion AI while keeping source-of-truth discipline and avoiding invented technical details.
---

# Notion AI Sync Director

## Goal

Use Notion AI for the heavy first-pass sync, then leave Codex only the high-judgment cleanup.

## Quick start

- Write all user-facing output in Russian.
- Assume Notion AI can reorganize and rewrite Notion artifacts well, but cannot inspect the local repo directly.
- Therefore always feed Notion AI a verified repo-summary artifact first, not raw assumptions.
- Load `references/sync-pass-template.md` before drafting the assignment.

## Workflow

1. Prepare the sync packet.
   - Gather:
     - current product master pages
     - roadmap master page and relevant DBs
     - build briefs
     - the latest verified repo audit summary
     - open decisions that still matter
   - Separate facts from suggestions.

2. Decide what Notion AI should do.
   - Good tasks for Notion AI:
     - rewrite or align pages
     - update stale wording
     - normalize statuses, structures, and cross-links
     - consolidate duplicative docs
     - generate first-pass task lists from approved source pages
   - Bad tasks for Notion AI:
     - invent repo paths, packages, APIs, or branch state
     - resolve contradictory technical truth on its own
     - close product decisions that still require owner judgment

3. Draft the assignment.
   - Always include:
     - source pages
     - one repo-reality summary page or block
     - exact deliverables inside Notion
     - explicit do-not-invent rules
     - explicit unresolved decisions list
   - The prompt should ask Notion AI to do the broad sync only.

4. Define the Codex cleanup pass.
   - After the Notion AI prompt, add a separate block:
     - what Codex must review manually
     - what conflicts must be verified against repo reality
     - what statuses or briefs should not be trusted without source review

## Output

- `Что отдаём Notion AI`
- `Готовый prompt для Notion AI`
- `Что Notion AI не должен трогать`
- `Что я дочищу после sync-pass`

## Rules

- Do not ask Notion AI to infer technical truth from prose.
- Do not let Notion AI close open product decisions silently.
- Do not let Notion AI mutate roadmap statuses without evidence.
