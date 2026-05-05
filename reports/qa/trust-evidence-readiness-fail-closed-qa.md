# Trust Evidence / Visa Readiness Fail-Closed QA

Status: implementation QA pack for current M1 source-of-truth. This is not UI implementation.

## Purpose

Prove that unsafe trust and evidence states do not become fake visa readiness, legal certainty, or AI advice. The canonical output remains `ResultPayload`; unsafe paths route to `HUMAN_REVIEW` or a safe next action.

## Coverage Added

- API recompute now covers missing evidence and conflicting evidence, not only stale referenced sources.
- Fail-closed recompute is regression-tested not to mutate source catalogs.
- Result screen model keeps `HUMAN_REVIEW` projections manual-only and removes confidence-summary copy from review-state basis output.
- Trust screen model hides confidence badge, source list, and volatility detail for `HUMAN_REVIEW`.
- Documents screen model no longer exposes a ready-to-submit package projection while the case is in `HUMAN_REVIEW`.
- Visa Readiness Pass preserves stale/conflicting evidence states even when the verdict is already `HUMAN_REVIEW`.

## Safety Guarantees

- No new verdict states.
- No `DecisionResult`.
- No replacement result model.
- No visa approval probability.
- No legal certainty claims.
- No visual UI implementation.
- No source catalog mutation.

## Expected Bad-Path Shape

For stale, missing, conflicting, or manual-only evidence:

- `ResultPayload.verdict` remains `HUMAN_REVIEW`.
- `ResultPayload.nextAction.type` is `send_for_review`.
- `ResultPayload.trust.confidence` is `0` where the engine blocks automation.
- `trust.evidenceStatus`, `trust.freshnessStatus`, `trust.blockingReason`, and `trust.humanReviewReason` carry the reason forward.
- Presentation models must not convert that state into "ready", "safe to submit", approval probability, or legal certainty.

## Verification Evidence

Branch: `codex/trust-evidence-readiness-fail-closed-qa`
Date: 2026-05-01

- `npm run typecheck` — passed.
- `npm run test` — passed, 48 test files / 255 tests.
- `npm run build` — passed. Vite emitted the existing chunk-size warning.
- `npm run verify:engine` — passed, 5 scenarios matched baseline `rdc.v1@2026.04.18`.
- `git diff --check` — passed.
- Negative search: `DecisionResult`, `readinessScore`, approval-probability claims, and fake readiness phrases were found only in tests, reports, or explicit forbidden-claim notes.
- `$bank-grade-review` corrections applied: trust screen keeps the human-review evidence reason visible without confidence details; Visa Readiness Pass covers `missing` and `manual_only` evidence reasons; this report records actual pass/fail evidence.

## Remaining Risk

PNG/Figma and Lovable/UI implementation remain blocked until explicit approval. This QA pack only hardens and verifies existing backend/domain/presentation contracts.
