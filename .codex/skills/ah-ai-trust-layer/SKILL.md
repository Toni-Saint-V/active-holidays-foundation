---
name: ah-ai-trust-layer
description: "Active Holidays: AI/trust слой. Используй для OpenAI recommendations, prompts, cache/state, fallback, observability и границы \"AI explains, engine decides\"."
---

# AH AI Trust Layer

## Goal

Keep AI useful while preventing it from owning deterministic decisions.

## When To Use

- AI recommendation / explanation / prompt changes
- OpenAI response handling
- AI cache, stale state, invalidation, fallback
- observability around AI/fallback source
- trust-safe disclaimers

## Workflow

1. Confirm which fields are deterministic and which are model-generated.
2. Keep AI explanatory, not authoritative.
3. Make fallback behavior explicit and useful.
4. Prevent cross-case bleed and stale trust failures.
5. Use internal references only when needed:
   - `_internal/ai-boundary-and-trust.md`
   - `_internal/ai-cache-and-state.md`
   - `_internal/ai-observability.md`
   - `_internal/prompt-hardening.md`
   - `_internal/minimal-tool-calling.md`
   - `_internal/fallback-safe-behavior.md`

## Hard Rules

- AI never overrides deterministic verdicts, ranking ownership, or human-review escalation.
- No hidden fallback that looks like a confident AI answer.
- Prompts must be grounded in current JSON facts.
