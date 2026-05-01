# Active Holiday — Product Canon v1

Дата: 2026-05-01

Статус: active source of truth for M1 planning and execution.

## Product Sentence

Active Holiday is an AI-first visa travel readiness service for Russian citizens in Moscow and Saint Petersburg: fast intake, deterministic readiness verdict, trust layer, insurance attach, and human review lead for complex cases.

Short pitch:

Active Holiday turns visa uncertainty for Russian travelers into a managed travel-readiness process: AI intake, deterministic verdict, document workflow, human review, and paid submission support.

## User

Primary M1 user:

- Russian citizen planning an international trip from Moscow or Saint Petersburg.
- Needs to understand whether the case is ready for visa submission or trip preparation.
- Wants clear risk diagnosis before spending money on insurance, document checks, bookings, courier services, or managed submission.
- Does not want a generic travel blog, an outdoor marketplace, or vague AI advice.

## Pain

The core pain is visa and travel-readiness uncertainty:

- Which destination or submission path is realistic now.
- Which documents or proof points are missing.
- Whether the case is simple, fixable, blocked, or needs expert review.
- What the next paid or operational step should be.

The product reduces uncertainty. It must not imply visa approval certainty or replace official rules, consulates, visa centers, insurers, lawyers, or human expert review.

## M1 Scope

M1 is the first revenue and trust wedge.

Required flow:

```text
Landing
→ Quick Visa Intake
→ Deterministic Verdict
→ Trust Layer
→ Insurance Attach / Human Review Lead
```

Required surfaces:

- Landing.
- Quick Visa Intake.
- Visa Result.
- Human Review Form or honest lead-only fallback.
- Human Review Sent confirmation.

Required product rules:

- The engine decides; UI renders.
- Verdict output stays deterministic and contract-owned.
- LLMs may explain, summarize, or help draft copy, but must not decide readiness.
- Trust layer must show uncertainty honestly through sources, freshness, confidence, and human fallback.
- Insurance attach is a next step, not a forced purchase.
- Human review must either be production-safe or clearly presented as a lead-only expert follow-up.

M1 verdict states:

- `ready`
- `almost_ready`
- `not_ready_fixable`
- `not_ready_blocked`
- `needs_human_review`
- `insufficient_data`

Do not add new M1 verdict states without an ADR.

## M2 Scope

M2 turns readiness into paid service execution.

Included:

- Document Check.
- Managed Submission.
- Ops workflow for paid cases.
- Expert assignment and response process.
- Payment-ready or manual-payment flow.
- Case status and support templates when the lifecycle is reliable.

M2 must build on the M1 deterministic verdict and human-review trust boundary. It must not create a parallel decision model.

## M3 Scope

M3 expands monetization after the visa/travel-readiness wedge works.

Included:

- Tour attach.
- Broader travel companion support.
- Destination-specific post-visa services.
- Partner offers where they fit the case and do not weaken trust.

Outdoor and active-experience ideas belong here or later as attach layers, not as the M1 product.

## Monetization

Monetization ladder:

1. Insurance attach.
2. Document Check.
3. Managed Submission.
4. Tour Attach.

Commercial principles:

- Start with the least operationally heavy paid step.
- Use insurance as paid proof, not as the whole business.
- Use Document Check as the low-ticket trust bridge.
- Use Managed Submission as the main M2 cashflow.
- Do not present paid actions as mandatory unless a rule or partner requirement actually requires them.

## Non-Goals

Not in M1:

- Outdoor marketplace.
- Activity catalog.
- Supplier dashboard.
- Tour booking engine.
- Full booking engine.
- Native mobile app.
- Loyalty program.
- Community.
- AI chat as the primary product.
- Account or profile system unless required for the readiness flow.
- Corporate active trips.
- B2B SaaS or white-label tooling.

These ideas require separate product validation and an ADR before entering the build queue.

## Build Rules

1. Product scope must map to this canon before implementation.
2. Repo and Notion docs that conflict with this canon must be marked legacy, support reference, or updated.
3. Do not introduce `DecisionResult` or another parallel result model for M1.
4. Preserve the verdict-first flow and existing result contract language unless an ADR changes it.
5. Do not invent APIs, endpoints, legal claims, partner terms, metrics, or user behavior.
6. Do not mutate source catalogs automatically from UI or AI output.
7. Do not make fake AI recommendations or legal certainty claims.
8. Hide unfinished product surfaces behind feature flags or remove them from M1 navigation.
9. Any Human Review production workflow must pass lifecycle, identity, idempotency, and persistence checks.
10. Any paid offer must include honest scope, disclosure, event tracking, and an operational owner.

## ADR Triggers

Create a separate ADR before adding:

- A new verdict state.
- A new result payload model.
- A new paid product beyond the monetization ladder.
- A new user role or supplier-side workflow.
- Durable account, wallet, loyalty, or booking infrastructure.
- AI decision ownership beyond explanation, summarization, or drafting.
- Automatic rule/source catalog mutation.
- Outdoor marketplace or activity booking.

## Definition of Done

Product Canon v1 is done when:

- This document is linked from the active project hub or equivalent Notion source of truth.
- Legacy outdoor, broad travel companion, and marketplace docs are marked `LEGACY / DO NOT BUILD` or moved to M3+ reference.
- M1 implementation tasks reference the five-screen flow and verdict-first contract.
- Readiness audit produces a concrete PR plan against this scope.
- HR is either production-hardened or honestly downgraded to lead-only.
- Insurance attach is treated as the first monetization proof, not the core strategy.

## Next Execution Gate

Next task after this canon:

```text
Run M1 technical readiness audit in the active repo.

Audit against:
- Landing
- Quick Visa Intake
- Deterministic Verdict
- Trust Layer
- Insurance Attach
- Human Review Lead

Output:
- docs/m1-readiness-audit.md
- P0 blockers
- P1 launch risks
- what can ship
- what must be hidden
- exact PR plan
```
