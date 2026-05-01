# Visa Readiness Pass UI Contract Pack

Status: pre-UI contract. Visual implementation is blocked until PNG or Figma concept approval.

## Critique

- The original five-block idea is strong, but it can overload a mobile screen if each block becomes a dashboard.
- A route map can become decorative if route points do not expose concrete status, risk, and requirements.
- A readiness progress element can be misread as a visa outcome prediction if it is not tied to documents or completeness.
- AI copy can sound like advice if every statement is not anchored to rule-based result, evidence, or missing data.

## Why It Is A Problem

- The screen must answer one question first: what is the next safe step. Dense analytics before that slows the user down.
- Decorative maps are expensive to implement and weak for trust. The map must be an interaction model, not a background.
- Visa certainty cannot be implied. The product can explain readiness inputs, not forecast a consulate decision.
- If AI appears to decide for the user, the product crosses the safety boundary and conflicts with the engine contract.

## Improved Architecture

Use one mobile pass with exactly five component groups:

1. `headerTripSummary`
2. `readinessStatus`
3. `routeRiskMap`
4. `documentsImpact`
5. `alternativesCta`

Primary user loop:

1. User opens result.
2. User sees route and readiness status.
3. User taps route point for risk detail.
4. User sees document impact.
5. User takes one primary next action or opens alternatives.

## Final UI Spec

### Source Data

- canonical result: `ResultPayload`
- scenario data: `ScenarioLabPayload | null`
- current screen model: `VisaReadinessPassScreenModel`
- builder: `buildVisaReadinessPassScreenModel`
- file: `src/presentation/activeHolidays/visaReadinessPassScreenModel.ts`

### Component 1: Header + Trip Summary

Payload: `headerTripSummary`

Contains:

- `eyebrow`
- `title`
- `routeLabel`
- `updatedLabel`

Purpose:

- anchor the pass in one route
- show update timestamp
- avoid exposing implementation terms

### Component 2: Visa Readiness Status

Payload: `readinessStatus`

Contains:

- canonical `verdict`
- user-safe `label`
- `tone`
- `documentReadinessLabel`
- `evidenceLabel`
- `why`

Rules:

- no visa outcome forecast
- no legal certainty
- no new verdict states
- `why` must cite rule/evidence/document basis

### Component 3: Interactive Route Risk Map

Payload: `routeRiskMap`

Contains:

- `selectedPointId`
- `points`
- `selectedPoint`

Route point fields:

- `id`
- `label`
- `status`
- `risk`
- `requirements`
- `why`
- `selected`

Interaction:

- 3-5 route points
- tapping a point changes `selectedPoint`
- every selected point shows status, risk, requirements, and a short why

### Component 4: Documents Impact Panel

Payload: `documentsImpact`

Contains:

- `readyCount`
- `requiredCount`
- `completionLabel`
- `impactLabel`
- up to four document items

Rules:

- completion means document readiness, not visa decision likelihood
- blocked documents must explain the blocked next step
- long copy must wrap inside the panel

### Component 5: Alternatives + Primary CTA

Payload: `alternativesCta`

Contains:

- one `primaryCta`
- zero to two `secondaryActions`
- up to two alternatives

Rules:

- maximum three actions total
- alternatives are compare-only
- no automatic path switching
- human-review cases keep the primary action on handoff/review

## States

- `loading`: no result yet, primary action disabled
- `empty`: no active case selected
- `ready`: current result can be presented normally
- `stale_evidence`: sources need freshness attention
- `conflicting_evidence`: sources conflict, do not imply certainty
- `human_review_required`: safe bad path to human review
- `resolved_after_review`: operator result can be shown without changing verdict vocabulary
- `error`: no route advice, return/retry path only
- `long_text`: content is still bounded by the five-component model

## Available Actions

Maximum three:

1. primary next action from `ResultPayload.nextAction`
2. open documents when documents are incomplete
3. compare alternatives when alternatives/scenarios exist

## AI Explanation Rules

AI can:

- summarize input/result
- explain missing data
- explain rule-based logic
- highlight risks
- suggest the next step with why

AI cannot:

- predict visa outcome
- make a decision for the user
- imply legal certainty
- replace the rule engine

## Visual Direction

- mobile-first iPhone 14, 390 x 844
- dark premium travel-tech
- restrained contrast
- typography-led hierarchy
- compact and scannable
- no decorative map clutter
- no generic AI glow
- no colorful consumer style
- no nested cards
- no decorative blobs/orbs

## Acceptance Criteria

- exactly five top-level component groups
- no more than three actions
- route map has 3-5 selectable points
- selected route point changes the detail payload
- stale/conflicting evidence states are explicit
- human review state is honest and user-safe
- no new verdict states
- no parallel result model
- no visual UI implementation before PNG/Figma approval

## What To Pass To Codex

- Keep `VisaReadinessPassScreenModel` as presentation-only.
- Add fixtures for ready, stale, conflicting, human-review, empty, error, and long-text states.
- Generate a PNG/Figma concept from this contract before implementation.
- Implement UI only after explicit approval.
