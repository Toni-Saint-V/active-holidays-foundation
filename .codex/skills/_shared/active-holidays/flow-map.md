# Active Holidays Flow Map

## Primary User Flow

1. `LandingScreen`
   Product selection and entry into a seeded case or intake.
2. `IntakeScreen`
   Structured signals and preview of the deterministic outcome.
3. `ResultScreen`
   Verdict, next action, primary path, alternatives, risks, documents, trust entry, and AI recommendation panel.
4. Branches from result
   - `DocumentsScreen` for readiness gaps
   - `TrustScreen` for explanation of confidence and sources
   - `HumanReviewScreen` when the system must stop or the user escalates

## Scenario And Compare Flow

- `ResultCompareSurface` shows "Как улучшить шанс" inside the result loop.
- `server/lib/decisionScenarioLab.ts` builds scenario candidates grounded in the live case and engine.
- `server/lib/scenarioLab.ts` compares baseline vs candidate and records `changedSignalIds` / `changedPreferenceIds`.
- If a scenario cannot produce a safe normal path, the plan should escalate honestly to `human-review`.

## AI Recommendation Flow

- deterministic base: result payload + offer shortlist from current engine output
- server enriches via `server/lib/recommendations.ts`
- UI renders via `AiRecommendationPanel`
- primary offer is action-ready
- alternative offers are compare-only until deterministic compare confirms them
- if AI fails, deterministic result flow still works

## Decision Integrity Flow

- recompute / override / fork create decision records
- records can be replayed and drift-checked
- `server/routes/decisions.ts` and `GET /api/cases/:id/drift` expose integrity surfaces
- fingerprints and replayable snapshots protect against silent regressions

## Flow Rules

- extend the existing result loop before adding a new screen
- do not bypass the result loop with a detached AI-only surface
- do not let an alternative path feel like the confirmed next action
- do not show trust detail for `HUMAN_REVIEW` as if the confidence is settled
