# Active Holidays Product Context

## Product Job

Active Holidays is a deterministic decision assistant for three verticals:

- travel routes and visa readiness
- Spain residency programs
- adult travel/medical insurance

The product job is not "generate advice." The job is:

- collect structured case facts
- run deterministic rules and ranking
- show an honest verdict, next action, documents, risks, and trust surface
- let users compare safe scenario deltas
- escalate to human review when the system should stop

## Source Of Truth

Use the stricter source of truth in this order:

1. live repo contracts and tests
2. current repo implementation
3. current Notion product/exec pages when the task explicitly needs them

Never let an old brief override the repo's current contracts.

## Core Invariants

- visible UI copy is Russian
- deterministic engine owns verdict, next action, documents, risks, trust, and compare outcomes
- UI depends on `shared/contracts/*`, not raw storage shapes
- server-only logic stays in `server/`
- AI explains or compresses existing facts; it does not invent rules, documents, routes, prices, or probabilities
- result flow is the primary product loop; extend it before creating new side surfaces
- honest escalation to `human-review` is a feature, not a fallback to hide

## Primary Product Surfaces

- landing: `src/screens/landing/LandingScreen.tsx`
- intake: `src/screens/intake/IntakeScreen.tsx`
- result: `src/screens/result/ResultScreen.tsx`
- compare/scenario lab: `src/screens/result/ResultCompareSurface.tsx`
- AI recommendation panel: `src/screens/result/AiRecommendationPanel.tsx`
- documents: `src/screens/documents/DocumentsScreen.tsx`
- trust: `src/screens/trust/TrustScreen.tsx`
- human review: `src/screens/human-review/HumanReviewScreen.tsx`

## Current Real Strengths

- seeded deterministic engine with contracts and tests
- decision ledger, replay, and drift surfaces
- AI recommendation layer with fallback mode
- scenario lab / compare primitives
- instrumentation and screen view hooks
- automation layer for repo/process/UI/context checks

## Current Real Weaknesses

- no repo-local skill router or shared context before this change
- no repo-local premium UI executor or final multi-lens review bundle
- no Playwright test suite or visual baseline harness yet
- dark UI baseline is coherent but still exposed to generic spacing/card defaults without stronger skill discipline
