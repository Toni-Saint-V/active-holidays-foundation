# Active Holiday M1 Readiness Audit

Дата: 2026-05-02

Ветка аудита: `codex/m1-readiness-audit`

Source of truth:

- `docs/product-canon-v1.md`
- repo state at audit time

M1 target:

```text
Landing
→ Quick Visa Intake
→ Deterministic Verdict
→ Trust Layer
→ Insurance Attach / Human Review Lead
```

Out of M1:

- outdoor marketplace
- activity catalog
- supplier dashboard
- tour booking engine
- native mobile app
- loyalty
- broad travel companion
- B2B SaaS

## Executive Summary

The repo is technically stronger than the old M1 blocker list implied. The deterministic engine, `ResultPayload`, evidence fail-closed behavior, scenario baselines, Human Review persistence, internal transition guard, operator packets, and local merge gate are real and verified.

M1 is not production-ready as a public visa travel service yet. The blockers are now mostly scope/readiness gates, not core engine existence:

1. M1 public scope is not hidden: extra non-M1 routes are still registered and visible in app navigation.
2. Product Canon v1 names six public readiness states, while the live engine contract still exposes four canonical verdicts: `GO`, `GO_WITH_CONDITIONS`, `NOT_NOW`, `HUMAN_REVIEW`.
3. Insurance attach exists as an insurance vertical, but not as the M1 travel-result attach CTA with dedicated events and legal disclosure.
4. Funnel analytics are generic; required M1 monetization/lead events are missing.
5. Playwright is listed as a desired check, but the repo has no working Playwright E2E configuration.

## Verification

Commands run:

```text
npm run typecheck
npm run test
npm run build
npm run verify:engine
npm run verify:boundaries
npm run verify
npx playwright test
```

Results:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | PASS | TypeScript completed without errors. |
| `npm run test` | PASS | 48 test files, 260 tests passed before the boundary fix. |
| `npm run build` | PASS | Vite build completed; one chunk-size warning. |
| `npm run verify:engine` | PASS | 5 scenarios match baseline, engine `rdc.v1@2026.04.18`. |
| `npm run verify:boundaries` | FAIL then PASS | Failed because boundary checker treated `src/**/*.test.ts` as browser runtime. Fixed in this branch and added regression coverage. |
| `npm run verify` | PASS | 48 test files, 261 tests passed after the boundary checker fix. |
| `npx playwright test` | FAIL | No Playwright config/tests; command trips over Vitest matcher globals and then reports `No tests found`. |

Verification fix included in this branch:

- `scripts/verify-boundaries.ts` now excludes `*.test.ts(x)` and `*.spec.ts(x)` from browser-runtime import checks.
- `scripts/verify-boundaries.test.ts` now covers that test files under `src` may import Node test utilities.

## Module Readiness

| Module | Exists | Works | Needed for M1 | Risk | Priority | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| Product Canon | Yes | Yes | Yes | Low | Done | `docs/product-canon-v1.md` is linked from README. |
| Routes `/`, `/intake`, `/result`, `/human-review` | Yes | Partly | Yes | Medium | P0 | Keep only M1 routes visible for launch; extra registered routes need feature flags or hidden navigation. |
| Extra routes `/documents`, `/trust`, `/notifications`, `/profile`, `/residency-es`, `/insurance-adult` | Yes | Partly | Not as M1 primary surfaces | High | P0 | Hide or flag non-M1 routes before public launch unless they are entered only through controlled next actions. |
| Landing | Yes | Partly | Yes | High | P0 | Current copy still supports travel/residency/insurance product switching, not only visa readiness for RF travelers in Moscow/SPb. Needs UI approval before implementation. |
| Quick Intake | Yes | Partly | Yes | Medium | P1 | Adaptive intake works, but current product is seeded-case driven and not a clean 1-2 minute visa intake with explicit Moscow/SPb routing. |
| Result | Yes | Yes | Yes | Medium | P0 | Strong `ResultPayload` rendering exists, but public state vocabulary must be reconciled with Product Canon v1. |
| Trust Layer | Yes | Yes | Yes | Low | P1 | Evidence/freshness/confidence exists and fails closed. Keep legal certainty bans visible in launch copy. |
| Human Review Lead / lifecycle | Yes | Yes backend/domain | Yes | Medium | P1 | Old backend blockers are mostly closed. Remaining launch gates are UI approval, ops policy, SLA/copy, and production rollout. |
| Human Review operator packet/workbench | Yes | Yes | M1 ops support | Medium | P1 | Internal-token protected and tested. Needs real ops owner and process before public launch. |
| Verdict engine | Yes | Yes | Yes | Medium | P0 | Existing canonical verdict set is four states; Product Canon v1 names six public readiness states. Decide mapping vs ADR before UI handoff. |
| Golden fixtures / drift gate | Yes | Yes | Yes | Low | P1 | `scripts/verify-engine-drift.ts` checks 5 scenario baselines, not 6 canon public states. |
| Feature flags | No clear central file | No | Yes | High | P0 | No `src/config/features.ts` or visible `VITE_FEATURE_*` gate for non-M1 surfaces. |
| Insurance attach | Partial | Partial | Yes | High | P0 | Insurance vertical exists, but travel result lacks M1 attach CTA/events/disclosure. |
| Document Check | No product flow | No | Not P0 M1 | Medium | P1 | Not needed for first M1, but should be next paid service after insurance attach. |
| Analytics | Partial | Partial | Yes | High | P0 | Generic `screen_view`, `cta_clicked`, `intake_answered`, `preview_seen` exist. Required `insurance_*`, `human_review_lead_*`, `document_check_*` events are missing. |
| Legal/disclaimer | Partial | Partial | Yes | Medium | P0 | Legal certainty bans exist in reports/canon; public M1 footer/result disclosure is not clearly implemented. |
| CI | Manual only | Local gate works | Yes | Medium | P1 | GitHub Actions are manual because billing blocks automatic runner gate. PR template correctly requires local verification. |
| E2E smoke | No | No | Yes | High | P0 | `npx playwright test` is not a valid gate yet. Need minimal Playwright config + smoke or remove from launch checklist. |

## Required Route Check

| Route | Status |
| --- | --- |
| `/` | Exists. |
| `/intake` | Exists. |
| `/result` | Exists. |
| `/human-review` | Exists. |

Non-M1 route exposure:

- `/documents`
- `/trust`
- `/notifications`
- `/profile`
- `/residency-es`
- `/insurance-adult`

These can remain as internal/support surfaces, but public navigation must not make M1 look like a broad travel companion or multi-product app.

## Verdict / State Check

Product Canon v1 names these public M1 readiness states:

- `ready`
- `almost_ready`
- `not_ready_fixable`
- `not_ready_blocked`
- `needs_human_review`
- `insufficient_data`

Current repo canonical verdict contract:

- `GO`
- `GO_WITH_CONDITIONS`
- `NOT_NOW`
- `HUMAN_REVIEW`

Launch-safe direction:

- Do not add `DecisionResult`.
- Do not create a parallel result model.
- Do not replace the engine verdict enum blindly.
- Add a product-facing adapter/mapping only if needed, or update Product Canon with an ADR that preserves `ResultPayload.verdict` as the engine contract.

## Human Review Lifecycle Check

Old blockers:

| Old blocker | Current status |
| --- | --- |
| Terminal state mutability | Closed in current code: terminal states cannot transition further. |
| Client-supplied `changedBy` trust | Closed in public create/transition boundaries: public create schema is strict; internal transition sets actor server-side. |
| Process-local workflow state | Mostly closed for local runtime: persisted human-review file exists with corruption quarantine. Production persistence still needs deployment policy. |
| Idempotent create/reuse depends on recompute | Closed for active request reuse: active request is reused without replacing the original snapshot; repeated terminal resolve is idempotent when payload matches. |

Remaining HR gates:

- User-facing HR UI still needs approved PNG/Figma direction before UI code changes.
- Ops owner, SLA, status machine, and support templates must be real before production traffic.
- Internal transition token must be configured in production.

## What Can Ship Internally

- Deterministic engine with `ResultPayload`.
- Seeded intake/result/human-review flows for internal beta.
- Evidence fail-closed behavior.
- Human Review request creation/reuse.
- Human Review operator packet and internal workbench APIs.
- Local verification gate via `npm run verify`.

## What Must Be Hidden Before Public M1

- Broad product switcher that frames the app as travel/residency/insurance companion.
- Direct navigation to non-M1 surfaces unless they are controlled next-action screens.
- `/profile`, `/notifications`, and other account/companion surfaces.
- Any route/copy suggesting outdoor marketplace, activities, supplier tooling, loyalty, or broad booking.
- Any UI implying visa approval probability, legal certainty, or automatic expert decision.

## P0 Blockers

1. **Scope exposure in app shell**
   - App navigation exposes non-M1 routes and broad surfaces.
   - Fix: add central feature flags or M1 navigation mode; hide non-M1 surfaces from public nav.

2. **Verdict vocabulary mismatch**
   - Product Canon v1 lists six public readiness states; repo engine exposes four verdicts.
   - Fix: decide an ADR/mapping that preserves `ResultPayload.verdict` and avoids `DecisionResult`.

3. **Insurance attach is not implemented as M1 travel-result monetization**
   - Insurance product exists, but not as `Insurance Attach CTA` on travel result with events and disclosure.
   - Fix: add controlled travel result attach CTA for eligible states.

4. **M1 funnel analytics are incomplete**
   - Generic analytics exist, but required business events are missing.
   - Fix: add `insurance_attach_shown`, `insurance_cta_clicked`, `human_review_lead_opened`, `human_review_lead_submitted`; defer document-check events until that flow exists.

5. **No working E2E smoke gate**
   - `npx playwright test` fails because there is no Playwright setup for this repo.
   - Fix: add minimal smoke for `/`, `/intake`, `/result`, `/human-review`, or remove this command from M1 readiness criteria until it exists.

6. **Public legal/disclosure surface is incomplete**
   - Trust/legal rules exist in docs and reports, but public landing/result/footer disclaimer is not clearly present.
   - Fix: add product-approved legal copy in visible M1 surfaces after PNG/UI approval.

## P1 Launch Risks

1. **Landing still feels broader than Product Canon v1**
   - Current landing model supports `travel`, `residency_es`, and `insurance_adult`.
   - Fix after PNG approval: make first screen visa-readiness-first for RF travelers in Moscow/SPb.

2. **Quick Intake is still seeded-case/demo oriented**
   - It loads seeded scenarios and adaptive signals, not a clean new-user intake draft.
   - Fix: add clear new case creation/draft semantics for M1.

3. **CI is not automatic**
   - GitHub Actions are manual due billing lock.
   - Fix: keep local gate mandatory until Actions are restored.

4. **Human Review production ops is not documented as runtime policy**
   - Backend is ready for M1 integration path, but public traffic needs owner/SLA/templates.
   - Fix: create ops board/status machine before public beta.

5. **Bundle size warning**
   - Build emits a >500 kB chunk warning.
   - Fix: not a launch blocker, but code-split later if performance becomes visible on mobile.

## Exact PR Plan

### PR1 — M1 Scope Gate + Feature Flags

Goal:

- Prevent public M1 from looking like a broad travel/residency/insurance companion.

Scope:

- Add central feature config.
- Add public M1 navigation contract and tests.
- Hide non-M1 nav items by default only after PNG/Figma approval because this changes visible UI behavior.
- Keep next-action deep links working where needed.

Acceptance:

- Feature/config contract exists and is covered.
- Approved UI implementation shows only M1 surfaces in public nav.
- No outdoor/activity/supplier/broad companion entry points.
- `npm run verify` green.

### PR2 — Verdict Public-State Reconciliation

Goal:

- Reconcile Product Canon v1 public state language with existing engine verdict contract.

Scope:

- Keep `ResultPayload.verdict` canonical.
- Add or document a presentation adapter for public readiness labels if needed.
- Add golden tests that cover the public M1 state matrix without adding `DecisionResult`.

Acceptance:

- No new engine result model.
- No unreviewed verdict enum replacement.
- Product/user copy can express ready/almost/fixable/blocked/review/insufficient-data meaning safely.

### PR3 — Insurance Attach CTA

Goal:

- Add first monetization proof to travel result.

Scope:

- Result CTA for insurance attach on eligible travel cases.
- Disclosure: not mandatory unless rule/partner requires it; check policy conditions before purchase.
- Events: `insurance_attach_shown`, `insurance_cta_clicked`.
- Outbound URL includes UTM/session id.

Acceptance:

- CTA appears only in eligible states.
- Click event is recorded.
- No forced purchase language.
- `npm run verify` green.

### PR4 — M1 Analytics + HR Lead Events

Goal:

- Make the M1 funnel measurable.

Scope:

- Add explicit events for intake start/completion, verdict shown, HR opened/submitted, insurance shown/clicked.
- Keep existing generic event ring.
- Add tests for event schema.

Acceptance:

- Required M1 events validate through `eventSchema`.
- No invented purchase callback.
- `npm run verify` green.

### PR5 — Playwright Smoke Gate

Goal:

- Replace the broken E2E command with a real launch smoke.

Scope:

- Add Playwright config.
- Add smoke for `/`, `/intake`, `/result`, `/human-review`.
- Ensure command can run headless locally.

Acceptance:

- `npx playwright test` passes locally.
- Smoke verifies no blank first viewport and no route crash.

### PR6 — Visible Legal / Trust Disclosure

Goal:

- Put trust-safe copy into public M1 surfaces.

Scope:

- Landing/result/human-review visible disclaimer.
- Russian-first copy.
- No legal certainty, no visa guarantee, no approval probability.

Acceptance:

- User sees what the service does and does not promise.
- Copy is tied to deterministic verdict and human fallback.
- UI implementation only after PNG/Figma approval.

## Recommended Next Task

Do PR1 first:

```text
Implement M1 Scope Gate + Feature Flags.

Goal:
Public M1 must look like a focused visa-readiness flow, not a broad travel companion.

Rules:
- No visible navigation/copy/UI implementation before PNG/Figma approval.
- Before approval, limit work to config contracts, tests, and non-visual routing analysis.
- Preserve existing deep links and tests.
- Do not remove underlying non-M1 routes yet.
- Do not add DecisionResult or new verdict states.

Verify:
npm run verify
```
