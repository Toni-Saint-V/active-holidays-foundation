# Premium UI Gate

Premium UI is evidence-based, not taste-based. A UI change is accepted only when quality is proven by repeatable checks.

## Mandatory PR Evidence

Every important UI PR must include:

- Premium Scorecard
- Screenshot pack
- UX risk block
- Accessibility check
- Truth-safety confirmation

## Release Threshold

- Total score: `>=85/100`
- No category below: `3/5`
- Average category score: `>=4/5`
- Critical truth violation: automatic `BLOCK`
- Beautiful but fake UI: `BLOCK`
- Correct but dead UI: `REWORK`

Scoring formula:

`weighted score = (category score / 5) * category weight`

Total score is the sum of all weighted scores.

## Score Weights

| Category | Weight |
| --- | ---: |
| Visual system | 25% |
| Interaction quality | 20% |
| Trust/copy clarity | 20% |
| Accessibility | 15% |
| Design consistency | 10% |
| Technical UI quality | 10% |

## Category Checks

### Visual System - 25%

- Typography hierarchy is clear.
- Spacing rhythm is consistent on mobile and desktop.
- Grid discipline supports scanning.
- Composition keeps primary decision and CTA visible in first viewport.
- Visual density is deliberate.
- Premium feel comes from precision, not noise.
- First viewport clarity is high.

### Interaction Quality - 20%

- Empty/loading/error/success states exist where relevant.
- Hover/pressed/focus states are visible.
- Motion supports orientation and does not mask state changes.
- Perceived latency has staged feedback.
- User actions get immediate feedback.
- Critical flows are never spinner-only.
- Reduced-motion support exists when motion is present.

### Trust/Copy Clarity - 20%

- One primary CTA per screen.
- No fake confidence.
- No fake verification.
- No fake readiness.
- No guarantee claims.
- Legal/trust wording is honest and specific.
- Next step is explicit.
- AI is explanation/support, not deterministic decision owner.

### Accessibility - 15%

- Contrast is readable.
- Font sizes are readable on mobile and desktop.
- Tap targets are safe.
- Keyboard/focus states work.
- Semantic structure is usable.
- Reduced-motion behavior is respected.
- No essential hover-only interaction.

### Design Consistency - 10%

- Existing tokens/components/patterns are reused.
- No parallel design system is introduced.
- Buttons/cards/chips/modals are consistent.
- Spacing/radius stay consistent.
- Language style stays consistent with Russian-first product copy.

### Technical UI Quality - 10%

- No layout shift in critical states.
- Responsive behavior is correct.
- No broken overflow or clipped critical content.
- No hidden/unreachable CTA.
- No console errors in checked flow.
- No visual regressions.
- No unrelated refactor in UI PR.

## Required Screenshot Pack

- Mobile PNG
- Desktop PNG
- Before/after PNG for changed existing screens
- Empty/loading/error/success states where relevant
- Reduced-motion note when motion is present

## UX Risk Block (Required Answers)

1. What could confuse the user?
2. What could create fake trust?
3. What could reduce conversion?
4. What state could feel dead or unfinished?
5. What must be checked manually?

## Truth-Safety Confirmation

Confirm all of the following:

- UI does not invent backend/product truth.
- No fake confidence/readiness/document verification.
- No guarantee claims.
- AI does not own deterministic fields.
- Monetization CTA is eligibility-gated.
- Loading/error states are honest and recoverable.

## Active Holidays Premium Direction

The product must feel like a premium AI travel visa concierge, not a generic visa form.

- Russian-first copy
- Mobile-first layout
- Guided intake
- Staged calculating
- Result cockpit
- Evidence chips
- AI explanation drawer
- Human review room
- Sent confirmation
- One primary CTA per screen
- Premium but honest motion
- Reduced-motion support

## Scoring Template

| Category | Weight | Score 1-5 | Evidence | Notes/blockers |
| --- | ---: | ---: | --- | --- |
| Visual system | 25% |  |  |  |
| Interaction quality | 20% |  |  |  |
| Trust/copy clarity | 20% |  |  |  |
| Accessibility | 15% |  |  |  |
| Design consistency | 10% |  |  |  |
| Technical UI quality | 10% |  |  |  |

## Block Conditions

Block UI PRs if any condition is true:

- UI invents backend/product truth.
- Fake confidence/readiness/verification appears.
- Guarantee claims appear.
- AI owns deterministic fields.
- Monetization CTA is not eligibility-gated.
- Screenshot pack or state coverage is missing.
- Score threshold is not met.
- Critical accessibility issue exists.
- Primary CTA is hidden, unreachable, or misleading.
