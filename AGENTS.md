# AGENTS.md

## Purpose

Repo-level operating contract for Codex and reviewers. Keep this file short. Keep detailed process in:

- `docs/ui/premium-scorecard.md`
- `docs/workflows/codex-delivery-flow.md`
- `docs/workflows/merge-readiness-checklist.md`
- `docs/workflows/parallel-codex-streams.md`
- `docs/templates/codex-task-template.md`
- `docs/templates/pr-report-template.md`

## Repo-First Rules

- Domain logic first, UI second.
- Inspect repo truth before edits: `package.json`, relevant code/contracts, `AGENTS.md`, `docs/`, and `README.md` when relevant.
- Work in task branches only. Never execute tasks directly in `main`.
- One task, one branch, one clean PR.
- Keep scope tight: no unrelated files, no cosmetic refactor outside task.
- All visible UI copy must be in Russian.

## Source-of-Truth Hierarchy

1. Production code and domain contracts (`src/`, `server/`, `shared/`).
2. Operational scripts and configs (`package.json`, tool configs).
3. `AGENTS.md`.
4. `docs/`.
5. `README.md`.
6. Prior plans/chat notes.

When sources conflict, follow the higher source and update lower docs.

## Active Holidays Law

- ResultPayload is canonical.
- PublicReadiness is projection.
- Engine decides.
- AI explains.
- UI shows provenance.
- Human review is premium path, not failure.
- Insurance attach is gated monetization, not forced purchase.

## Safety Blockers (Hard Stop)

Block any change that introduces:

- URL-driven result truth.
- Fake readiness, confidence, or document verification.
- Visa guarantee claims.
- AI owning deterministic fields.
- Insurance CTA for unknown/ineligible cases.
- Fake "human review sent" state.
- Raw prompts, internal tokens, or unnecessary PII in browser/analytics.
- UI that invents backend/product truth.

## Codex Execution Rules

- Always inspect `package.json` scripts before claiming checks passed.
- If a script is missing, mark it `ABSENT`; never report it as passed.
- Never hide failing checks.
- Docs-only tasks must not touch runtime/UI/backend code or dependencies.
- Do not change public API unless task scope requires it.
- For UI code tasks, PNG approval is required before UI implementation.

## Premium UI Gate

Premium UI Gate from `docs/ui/premium-scorecard.md` is mandatory for any user-visible UI/UX diff, including:

- Layout or navigation changes.
- CTA placement, hierarchy, or copy changes.
- User-facing copy affecting trust, readiness, verification, eligibility, insurance, AI, or next action.
- Responsive behavior changes.
- Visual hierarchy changes.
- Loading, error, empty, or success state changes.
- Accessibility-affecting UI changes.
- Motion or animation changes.
- Monetization UI changes.
- AI explanation UI changes.

Exceptions only:

- Typo-only copy fix without meaning/trust change.
- Docs-only change.
- Test-only change.
- Non-visible refactor.

If there is doubt, Premium UI Gate is required.

Required evidence when gate applies:

- Score `>=85/100`
- No category below `3/5`
- Screenshot pack
- UX risk block
- Accessibility check
- Truth-safety confirmation

## Branch, PR, and Merge Rules

- Start from clean status unless intentionally continuing the same task branch.
- New task branch path: `checkout main` and `pull --ff-only`, then create branch.
- Continue existing task branch path: stay on branch, verify scope/status, do not `checkout main` in the middle of the task.
- For multi-stream execution ownership and routing, follow `docs/workflows/parallel-codex-streams.md`.
- Push task branch only when checks are acceptable. Never force-push.
- Open PR when `gh` is available and authenticated.
- Do not auto-merge risky runtime changes.
- Docs-only tasks may auto-merge only with explicit user/policy approval and clean gates.
- After merge: update local `main` (`pull --ff-only`) before next task.

## Required Codex Final Report

Every task report must include:

1. Summary.
2. Files changed.
3. Commands run.
4. Exact results.
5. Scripts absent (`ABSENT` list).
6. Tests/build/lint result.
7. Risks and follow-ups.
8. Docs/scripts/tests updates needed.
9. Rollback path.
10. Confirmation runtime code/dependencies were not changed when task is docs-only.
11. Confirmation unrelated files were not changed.

## Communication Rule

- Keep final user-facing answer short and operational:
  1. what was done
  2. product impact
  3. what user will see/feel
  4. next step

## Task Block Format

For every command/prompt/task block, use exactly this compact header before the transfer block:

1) Что это:
2) Для чего:
3) Модель:
4) Сложность:
5) Готовность:

Then provide one transfer block only.

Keep explanations minimal.
The user is the messenger between ChatGPT and Codex.
Do not make the user manage process details manually.
Do not provide command/task blocks below 8/10 quality; improve them first.
