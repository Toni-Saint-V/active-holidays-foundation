---
name: ai-boundary-and-trust
description: Use when touching Active Holidays AI recommendation/explanation surfaces, prompts, schemas, disclaimers, or fallback behavior. Protects the strict contract that AI explains current facts while the deterministic engine owns verdicts, actions, paths, trust, and compare outcomes.
---

# AI Boundary And Trust

## Goal

Keep AI subordinate to deterministic product truth.

## When To Use

- `server/lib/recommendations.ts`
- `shared/contracts/recommendations.ts`
- `src/screens/result/AiRecommendationPanel.tsx`
- any prompt, disclaimer, shortlist/detail field, or fallback change

## When Not To Use

- pure engine/rule changes with no AI explanation surface
- generic copy-only edits without AI ownership questions

## Load Shared Context

- `../_shared/active-holidays/trust-and-ai-boundaries.md`
- `../_shared/active-holidays/architecture-map.md`

## Inspect

- `server/lib/recommendations.ts`
- `shared/contracts/recommendations.ts`
- `src/screens/result/AiRecommendationPanel.tsx`
- related recommendation tests

## Workflow

1. Separate server-owned fields from model-owned explanatory text.
2. Keep rank, fit, recommended offer, next steps, and compare gating deterministic.
3. Make disclaimers explicit and honest for both `openai` and `fallback`.
4. Check that Russian copy does not imply approval, certainty, or hidden requirements.
5. Add or update regression coverage before finish.

## Hard Rules

- Never let the model choose verdict, next action, compare outcome, or trust score.
- Never let alternative recommendations look action-confirmed before compare.
- Never invent documents, routes, prices, or new checks in prompt output.
- Keep human-review cases explicitly escalated.

## Expected Output

- bounded AI ownership
- honest fallback behavior
- tests or clear verification notes for trust boundaries

## Finish Checks

- targeted recommendation tests
- `trust-boundary-regression`
- `release-readiness`
