# Merge Readiness Checklist

Use this checklist before merge. Mark each item as `PASS`, `FAIL`, or `ABSENT` where appropriate.

## Pre-Merge Checks

- [ ] `package.json` scripts inspected.
- [ ] Relevant checks passed, or absent scripts explicitly reported as `ABSENT`.
- [ ] `typecheck` passed if available.
- [ ] `lint` passed if available.
- [ ] `test` passed if available.
- [ ] `build` passed if available.
- [ ] `git diff --check` passed.
- [ ] No unrelated files changed.
- [ ] Docs updated when behavior/setup/contracts changed.
- [ ] Rollback path exists.

## Trust and Safety Checks

- [ ] No unsafe claims.
- [ ] No fake confidence/readiness/verification.
- [ ] No raw prompts/internal tokens/unnecessary PII in browser/events/analytics.
- [ ] AI does not own deterministic fields.
- [ ] UI does not invent backend truth.
- [ ] Result truth remains server/canonical-owned.
- [ ] URL/query params do not mutate visible business truth.
- [ ] Monetization CTA is eligibility-gated when applicable.

## UI Gate (Any User-Visible UI/UX Diff)

- [ ] Premium UI Gate completed (`docs/ui/premium-scorecard.md`).
- [ ] Screenshot pack attached.
- [ ] Manual QA listed when relevant.

Gate applies to:

- Layout/navigation, CTA hierarchy/copy, trust/readiness/verification/eligibility messaging.
- Responsive behavior, visual hierarchy, states, accessibility, motion/animation.
- Monetization UI and AI explanation UI.

Exceptions only:

- Typo-only copy fix without meaning/trust change.
- Docs-only.
- Test-only.
- Non-visible refactor.

If there is doubt, gate is mandatory.

## Merge Decision

Choose exactly one:

- `READY`
- `BLOCKED`
- `NEEDS REWORK`

Rule:

- Any hard safety/truth violation => `BLOCKED`.
- Scorecard or screenshot evidence missing for any user-visible UI/UX diff => `BLOCKED`.
- Non-critical gaps that can be fixed in current branch => `NEEDS REWORK`.
- All required checks green (or properly `ABSENT`) => `READY`.
