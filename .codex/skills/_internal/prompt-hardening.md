---
name: prompt-hardening
description: Use when editing AI prompts in Active Holidays. Produces short, grounded, Russian prompts that constrain model behavior to current JSON facts and preserve product trust boundaries.
---

# Prompt Hardening

## Goal

Write prompts that are narrow enough to be safe and useful.

## When To Use

- `server/lib/recommendations.ts`
- future repo-local AI prompts tied to existing contracts

## When Not To Use

- generic prompt-writing for unrelated repos

## Load Shared Context

- `../_shared/active-holidays/trust-and-ai-boundaries.md`
- `../_shared/active-holidays/terminology.md`

## Workflow

1. Start from the exact contract fields the model may influence.
2. State the working context and language.
3. Explicitly ban invention of rules, routes, documents, prices, or actions.
4. Keep the instruction short enough that the real payload stays primary.
5. Verify fallback behavior still produces a coherent surface.

## Hard Rules

- Do not ask the model to decide anything the server already decides.
- Do not use vague style language when concrete guardrails are needed.
- Prefer one precise sentence over a long policy paragraph.

## Finish Checks

- review final prompt against the current output schema
- run `ai-boundary-and-trust`
