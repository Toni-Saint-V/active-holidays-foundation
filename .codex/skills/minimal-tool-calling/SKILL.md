---
name: minimal-tool-calling
description: Use when considering new model or tool-calling behavior in Active Holidays AI surfaces. Keeps the AI layer intentionally narrow, deterministic-friendly, and easy to reason about.
---

# Minimal Tool Calling

## Goal

Avoid turning a bounded explanation layer into an uncontrolled agent surface.

## When To Use

- any proposal to add model tools, function calls, or multi-step AI behavior
- changes to `server/lib/recommendations.ts` that expand model responsibility

## Workflow

1. Start from zero extra tools.
2. Prove the deterministic UX cannot be solved by current structured inputs/outputs.
3. Define the smallest callable surface.
4. Require a deterministic fallback for tool failure.
5. Add observability and regression coverage.

## Hard Rules

- Never let a tool mutate server-owned decision truth directly.
- Never add tool-calling just to feel more AI-native.
- Every new tool must have a bounded schema, timeout, and fallback story.

## Companion Skills

- `ai-boundary-and-trust`
- `ai-observability`
