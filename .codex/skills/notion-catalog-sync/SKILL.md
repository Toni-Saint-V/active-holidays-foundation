---
name: notion-catalog-sync
description: Synchronize authoritative product rules, thresholds, sources, paths, and other catalogs from Notion into repository data files, shared contracts, and verification checks. Use when Codex needs to keep repo truth aligned with Notion-managed product knowledge, update JSON or TypeScript catalogs safely, or turn Notion decisions into versioned, testable implementation data without hidden drift.
---

# Notion Catalog Sync

## Goal

Move product knowledge from Notion into versioned repo truth safely, explicitly, and verifiably.

## Quick start

- Identify the exact Notion source before editing anything.
- Identify the exact repo destinations before transforming anything.
- Load `references/catalog-integrity.md` for the integrity rules.
- Treat every catalog change as a product change, not just a data edit.

## Workflow

1. Lock the source and destination.
   - Fetch the authoritative Notion page or data source.
   - List the repo files and contracts that consume the data.
   - If authority is ambiguous, stop and ask for one source-of-truth decision.

2. Map fields explicitly.
   - Write down:
     - source field
     - destination file
     - destination key
     - transformation rule
   - Do not perform silent renames or enum expansion.

3. Update data and contracts.
   - Change repo catalogs first.
   - Then change shared contracts or parsing rules if the surface truly changed.
   - Then update tests or drift verifiers.

4. Verify.
   - Run focused tests for the changed catalog consumers.
   - If contracts or shared DTOs changed, run `typecheck`, `test`, and `build`.
   - If decision logic changed, run any drift or replay verification available.

5. Preserve traceability.
   - Record which Notion artifact was used and what changed.
   - If the sync implies a product decision, surface it back to Open Decisions or the sync note instead of burying it in JSON.

## Output

- `Источник в Notion`
- `Что меняется в repo`
- `Потенциально ломающие изменения`
- `Что проверено`
- `Что нужно обновить в Notion обратно`

## Rules

- Do not invent missing fields from prose.
- Do not silently widen enums.
- Do not change thresholds without noting downstream behavior impact.
- Do not leave contracts stale after catalog edits.
