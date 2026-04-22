# Trust And AI Boundaries

## Core Principle

AI explains. The deterministic engine decides.

## Server-Owned Fields

These must stay deterministic and server-owned:

- verdict
- next action and target screen
- primary path and alternative paths
- documents readiness
- risks and rule results
- trust/confidence values and source list
- scenario compare outcome and deltas
- decision record ids, fingerprints, replay/drift data
- shortlist rank, fit, recommended offer id, and fallback source flag

## Model-Owned Fields

The model may only enrich explanatory text on top of the current JSON context:

- recommendation shortlist copy: `title`, `summary`, `fitReason`, `caution`
- recommendation detail copy: `title`, `summary`, `whyThisFits`, `watchouts`, `trustSignals`

`nextSteps` in detail stays deterministic in the current implementation.

## Compare-Only Semantics

- `best_match` may align with the current primary path and can use the real next step
- `good_option` and `watch` are not confirmed paths
- non-primary recommendations must route through deterministic compare before action-like follow-up
- copy must say "проверить", "сравнить", or "сверить", not "оформить сейчас"

## Fallback Rules

- if OpenAI is unavailable, server fallback still returns a structured shortlist/detail when possible
- if shortlist itself is unavailable, the deterministic result surface remains fully usable
- error states must never imply the deterministic result is invalid
- do not hide missing AI behind fake confidence or silent empty space

## Prompt Rules

- Russian only
- work only from JSON context
- do not invent checks, routes, documents, prices, advantages, or probabilities
- do not imply approval or guarantee where the engine did not

## Human Review Rules

- `HUMAN_REVIEW` is a safe stop
- do not expose detailed confidence as settled truth for human-review cases
- escalation reason should stay explicit
- any "bad path" must look like escalation, not like a degraded happy path
