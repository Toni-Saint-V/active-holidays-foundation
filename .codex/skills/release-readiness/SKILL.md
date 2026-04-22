---
name: release-readiness
description: Use as the final Active Holidays repo gate before calling substantial work ready, with explicit checks, proof, remaining gaps, and rollback or regression risk.
---

# Release Readiness

## Goal

Turn “implemented” into “defensibly ready”.

## When To Use

- before finalizing any non-trivial change
- after route/state/domain/skill-system edits
- before saying a branch or patch is merge-ready

## Default Repo Gates

- `npm run typecheck`
- `npm run test`
- `npm run build`

## Additional Gates By Surface

- engine/result semantics: `npm run verify:engine`
- repo-local skill router / bundles / templates / shared context: `npm run skills:verify`
- repo-local Codex context: `npm run automations:check:skills` and `npm run automations:check:context`
- automation/supporting docs: `npm run automations:verify`
- instrumentation-sensitive screen work: `node --experimental-strip-types scripts/automations/check-flow-instrumentation.ts`
- TypeScript helper scripts under `scripts/codex/` or `scripts/automations/`: `npm run typecheck`

## Workflow

1. Pick the smallest relevant gate set.
2. Run targeted tests before full repo gates when helpful.
3. Separate automated proof, manual proof, and missing proof.
4. Record failures, warnings, and what they mean.
5. Decide whether each failure blocks the task or is pre-existing.
6. State rollback or follow-up risk if not fully clean.

## Hard Rules

- Do not say “done” before the chosen gates actually ran.
- Do not hide pre-existing red checks.
- If browser verification is still missing, name it as an explicit gap.
- Failing repo-local skill checks are blocking for skill-system work.

## Output Shape

- Automated:
  exact commands and whether they passed.
- Manual:
  any browser read, screenshot set, or route sanity check actually performed.
- Gaps:
  what could not be verified and why.
- Risk:
  rollback or residual regression risk.
