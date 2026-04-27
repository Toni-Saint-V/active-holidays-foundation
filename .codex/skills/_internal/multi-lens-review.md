---
name: multi-lens-review
description: Use as the final Active Holidays ship or merge gate after non-trivial work to run architect, UX, QA, performance, trust, and maintainability review lenses.
---

# Multi Lens Review

## Goal

Force one last high-signal critique before finalizing.

## When To Use

- every non-trivial implementation before final answer
- any change that touches result, trust, compare, state, routes, or shared contracts
- any review/merge gate where residual risk matters

## Load Shared Context

- `../_shared/active-holidays/review-checklists.md`
- `../_shared/active-holidays/anti-patterns.md`
- `_internal/bank-grade-review-references/severity-model.md`

## Lenses

- Architect: boundaries, ownership, contract integrity
- UI Director: hierarchy, CTA, spacing, premium restraint, mobile quality
- UX Critic: friction, dead ends, state clarity, trust
- QA Reviewer: regression paths, state coverage, verification gaps
- Perf Reviewer: render cost, motion cost, bundle smell
- Trust Reviewer: deterministic ownership, compare-only semantics, human-review honesty
- Maintainability Reviewer: duplication, shortcuts, unclear future extension

## Structured Loop

1. Threat model.
   Name the changed files, visible flows, and the most likely regressions.
2. Lens pass.
   Walk each relevant lens against code, visible UI, and verification proof.
3. Cheap blocker fix.
   Fix the sharpest safe issue immediately when the improvement is obvious and bounded.
4. Verify.
   Run `release-readiness` after any review-driven fix.
5. Verdict.
   State findings, proof, remaining gaps, and ship / block status.

## Default Review Bundle

- Start with `qa-self-review`.
- Add `trust-boundary-regression` for result, trust, recommendation, compare, or human-review changes.
- Add `bank-grade-review` for PR review, merge readiness, or explicit review asks.
- Finish with `release-readiness`.

## Subagent Rule

- If the user explicitly asked for delegation or multi-agent help, run independent lens passes with explorers/workers when useful.
- If not, run the same lenses manually in sequence.
- Never simulate fake complexity: use only the lenses that materially improve the task.

## Hard Rules

- Findings outrank summary.
- Trust regressions are blocking findings.
- “Looks okay” is not a conclusion; cite the concrete risk or the concrete proof.
- If a check was not run, list it under gaps instead of softening the verdict.

## Output Shape

- Findings:
  ordered by risk, with concrete file / flow references when possible.
- Proof:
  commands, tests, screenshots, or manual reads actually performed.
- Gaps:
  exact missing checks or blocked validation.
- Verdict:
  `ship`, `ship with named risk`, or `block`.

## Companion Skills

- `qa-self-review`
- `release-readiness`
- `bank-grade-review` when the task is a review or merge gate
