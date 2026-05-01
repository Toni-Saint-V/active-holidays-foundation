# Human Review Trust Calibration PNG Approval Brief

Status: PNG/Figma approval brief. Visual UI implementation is blocked until explicit approval.

## Product Goal

Turn Human Review from a dead-end fallback into a clear trust surface: the user should understand why automatic confidence stopped, what evidence or risk caused the stop, and what the next safe human-led action is.

## User Goal

When the result requires Human Review, the user needs a calm answer to four questions:

1. What happened?
2. Why can the product not safely auto-decide?
3. What can improve the case?
4. What happens next?

## Business Goal

Reduce abandonment after `HUMAN_REVIEW` by making the fallback feel intentional, evidence-backed, and operationally trustworthy without promising a visa outcome.

## Source Data Boundary

- Canonical result model: `ResultPayload`
- Human review state: existing Human Review contracts
- Trust calibration data: existing backend/domain payloads only
- Scenario data: existing scenario/result payloads only when available

Do not redefine evidence, trust, verdict, or result states in the visual layer.

## Screen Concept

Create one mobile-first premium PNG concept for:

`Human Review / Trust Calibration Surface`

Viewport:

- iPhone 14
- `390 x 844`

Style:

- premium travel-tech
- dark, calm, serious
- typography-led hierarchy
- compact blocks
- no generic AI glow
- no decorative blobs/orbs
- no dashboard overload
- no legal or consulate certainty

## Required Component Groups

Use exactly five top-level component groups:

1. `reviewStatusHeader`
2. `trustReason`
3. `evidenceAndRisk`
4. `safeImprovementOptions`
5. `humanNextAction`

### 1. Review Status Header

Purpose:

- explain that the result needs human review
- keep the status user-safe and non-technical

Required visible Russian copy direction:

- "Нужна ручная проверка"
- "Автоматический вывод остановлен безопасно"
- route or case context
- last updated label

### 2. Trust Reason

Purpose:

- explain the main reason for fallback
- avoid raw technical terms as the primary message

Allowed reason categories:

- missing evidence
- stale evidence
- conflicting evidence
- missing signal
- policy ambiguity
- operator override only

Copy rule:

- user-facing labels must be human-readable Russian
- technical category may appear only as secondary/internal detail if needed

### 3. Evidence And Risk

Purpose:

- show what input affects trust
- distinguish document readiness from visa decision probability

Must show:

- evidence freshness state
- missing/conflicting item count or short label
- risk label
- short "why" line anchored to source/evidence/rule basis

Must not show:

- visa approval probability
- legal certainty
- invented source names
- invented API confidence

### 4. Safe Improvement Options

Purpose:

- show two to four safe improvements only when they are supported by existing payload data

Examples:

- add missing document
- refresh stale source
- clarify trip detail
- wait for operator decision

Rules:

- do not promise that an improvement changes the verdict
- do not imply automatic approval
- if no safe improvement exists, show honest fallback:
  "Безопасного автоматического улучшения нет. Кейс должен посмотреть специалист."

### 5. Human Next Action

Purpose:

- make the next step obvious

Action rules:

- one primary CTA
- up to two secondary actions
- maximum three visible actions total
- primary CTA must route to review/handoff when automatic action is unsafe

## Required States

- `review_needed`: normal Human Review state
- `stale_evidence`: sources require freshness check
- `missing_evidence`: critical evidence absent
- `conflicting_evidence`: sources conflict
- `no_safe_improvement`: human review is the only honest path
- `operator_resolved`: final human outcome can be displayed without new verdict vocabulary
- `error`: no advice, only retry/back path
- `long_text`: copy remains bounded and readable

## Acceptance Criteria

- one PNG concept only
- no UI implementation code
- all visible copy in Russian
- exactly five top-level component groups
- maximum three actions
- no new verdict states
- no parallel result model
- no fake AI advice
- no legal certainty
- no visa outcome forecast
- bad path routes honestly to Human Review
- implementation remains blocked until explicit PNG approval

## Prompt To Use

```text
$active-holidays-premium-ui

Create one premium mobile-first PNG concept for Active Holidays: Human Review / Trust Calibration Surface.

Use this as a design approval artifact only. Do not write React, CSS, routes, or component code.

Viewport: iPhone 14, 390 x 844.

Product context:
The case reached HUMAN_REVIEW because the product cannot safely make or improve an automatic result from the available evidence. The surface must make the fallback feel honest, useful, and trustworthy.

Use exactly five component groups:
1. Review Status Header
2. Trust Reason
3. Evidence And Risk
4. Safe Improvement Options
5. Human Next Action

States to reflect in the concept:
- review needed
- stale evidence
- missing evidence
- conflicting evidence
- no safe improvement
- operator resolved
- error

Hard rules:
- Russian visible copy only.
- No new verdict states.
- Preserve ResultPayload and existing HUMAN_REVIEW behavior.
- Do not redefine evidence/trust contracts.
- Do not imply visa approval probability or legal certainty.
- Do not invent APIs, source names, or AI decisions.
- Maximum three visible actions.
- Primary action must be the safest next step.
- If no safe automatic improvement exists, show honest human-review fallback.

Visual direction:
Premium travel-tech, dark calm serious interface, compact hierarchy, readable typography, no decorative blobs, no generic AI glow, no nested-card overload.

Output:
One PNG-ready screen concept. No implementation code.
```
