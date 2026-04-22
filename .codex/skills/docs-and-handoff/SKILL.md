---
name: docs-and-handoff
description: Use when Active Holidays changes need concise documentation, review notes, QA evidence, or next-step handoff. Keeps repo docs and delivery notes short, factual, and aligned with the real implementation.
---

# Docs And Handoff

## Goal

Leave the next operator with clear, minimal evidence.

## When To Use

- after non-trivial implementation
- when router/index, runbooks, or repo-local Codex docs changed
- when summarizing verification or residual risks

## Workflow

1. Update the smallest canonical doc set.
2. Record what changed, why, and how it was verified.
3. Remove or rewrite stale references instead of appending more caveats.
4. Keep handoff text actionable and repo-specific.

## Hard Rules

- No changelog-style noise when one compact note will do.
- No claims of verification without commands or artifacts.
- No doc duplication across multiple files without a routing reason.
