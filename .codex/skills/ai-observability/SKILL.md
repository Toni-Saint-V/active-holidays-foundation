---
name: ai-observability
description: Use when changing AI generation paths, fallback selection, or explanation UX in Active Holidays. Adds enough logging, eventing, and state visibility to debug AI behavior without noisy instrumentation theatre.
---

# AI Observability

## Goal

Make AI-path behavior inspectable and debuggable.

## When To Use

- recommendation request path changes
- fallback logic changes
- new AI-visible states in UI
- instrumentation changes around result or trust surfaces

## Inspect

- `server/lib/recommendations.ts`
- `src/instrumentation/events.ts`
- `src/instrumentation/screenView.ts`
- `server/middleware/logger.ts`

## Workflow

1. Identify the minimum events or logs needed to explain behavior.
2. Track source selection (`openai` vs `fallback`) and notable failure branches.
3. Keep UI-visible state aligned with backend behavior.
4. Avoid duplicative or high-volume noise.
5. Verify that instrumentation still reflects real user actions.

## Hard Rules

- Observability must answer a debugging question, not just increase event count.
- Do not log secrets or raw prompts unnecessarily.
- Do not emit success-looking events from degraded states.

## Companion Skills

- `minimal-tool-calling`
- `release-readiness`
