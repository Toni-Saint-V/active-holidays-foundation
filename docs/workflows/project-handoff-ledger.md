# Project Handoff Ledger

## 1. Current Status

- Governance docs are merged.
- Permanent 3-stream operating model is merged.
- Three stream branches and worktrees are prepared.
- No runtime/UI/backend implementation has started yet in the stream setup step.
- Next step: clean untracked `START_HERE.md` in each stream worktree into local-only `.codex/START_HERE.md` notes if not already done, then launch stream tasks.

## 2. Completed PRs

- PR #40
  - Branch: `docs/premium-ui-gate`
  - Merge commit: `b6b7b0cf8549d5711cb03545195d6c57fab9de51`
  - Purpose: Premium UI Gate, governance, Codex delivery flow, PR template hardening
  - URL: `https://github.com/Toni-Saint-V/active-holidays-foundation/pull/40`
- PR #41
  - Branch: `docs/parallel-codex-streams`
  - Merge commit: `c1cbe00366b3a8aad9adc27f383b340240654ccf`
  - Purpose: permanent 3-stream Codex operating model
  - URL: `https://github.com/Toni-Saint-V/active-holidays-foundation/pull/41`

## 3. Active Branches / Worktrees

- Stream 1
  - Branch: `feat/stream1-business-core`
  - Worktree: `/Users/user/Projects/active-holidays-stream1-business-core`
- Stream 2
  - Branch: `feat/stream2-premium-ui`
  - Worktree: `/Users/user/Projects/active-holidays-stream2-premium-ui`
- Stream 3
  - Branch: `feat/stream3-ai-infra-audit`
  - Worktree: `/Users/user/Projects/active-holidays-stream3-ai-infra-audit`

Operational note:

- Each stream worktree may currently include untracked `START_HERE.md` unless already converted to local-only `.codex/START_HERE.md`.

## 4. Canonical Docs

- `AGENTS.md`
- `docs/workflows/parallel-codex-streams.md`
- `docs/ui/premium-scorecard.md`
- `docs/workflows/codex-delivery-flow.md`
- `docs/workflows/merge-readiness-checklist.md`
- `docs/workflows/project-handoff-ledger.md`

## 5. Current Operating Rules

- User only transfers prompts/results.
- Codex performs repo actions.
- No standalone task below `6/10`.
- Every Codex handoff must use:
  1) Что это:
  2) Для чего:
  3) Модель:
  4) Сложность:
  5) Готовность:
  then one code block only.
- One stream equals one branch/worktree.
- Stream 1 owns Business Logic Core.
- Stream 2 owns Premium UI Experience.
- Stream 3 owns AI Integrations / Infra / Audit.
- UI work must follow Premium UI Gate.
- AI never owns deterministic truth.
- Engine decides. AI explains. UI shows provenance.

## 6. Next Immediate Actions

1. Clean untracked `START_HERE.md` in each stream worktree into local-only `.codex/START_HERE.md`.
2. Confirm all stream worktrees are clean.
3. Start Stream 1 with case-bound intake + server-owned result foundation.
4. Start Stream 2 with premium UI screen/state plan + PNG gate.
5. Start Stream 3 with AI/truth-safety/integration boundary audit.

## 7. Stream 1 Next Task

Implement case-bound intake + server-owned result foundation.

Target outcomes:

- Case-bound intake contract path
- Server-owned deterministic result truth
- Deterministic `ResultPayload` with public projection mapping
- Eligibility/CTA logic backed by API contract tests

## 8. Stream 2 Next Task

Create premium UI screen/state plan and screenshot-gate checklist before broad UI code.

Target outcomes:

- Mobile-first screen map for intake/result/human-review
- Empty/loading/error/success state matrix
- PNG approval pack checklist aligned with Premium UI Gate
- Truth-safety field mapping for deterministic vs AI explanation UI

## 9. Stream 3 Next Task

Audit AI/truth-safety/integration boundaries and produce blockers for Stream 1/2.

Target outcomes:

- Deterministic vs AI ownership boundary map
- Stale-guard/forbidden-claims gap list
- Upload/document parsing readiness findings
- Prioritized blockers with explicit handoff actions for Stream 1/2

## 10. Known Risks / Open Loops

- Stream drift risk if tasks are executed outside stream-owned branch/worktree boundaries.
- Reintroduction risk of fake confidence/readiness/verification claims in UI copy.
- Truth-boundary risk if AI explanation surfaces start mutating deterministic output.
- Operational noise risk if local-only setup notes are committed accidentally.

## 11. Rollback / Recovery

- If stream setup branches were created incorrectly:
  - remove worktree: `git worktree remove --force <path>`
  - delete branch: `git branch -D <branch>`
- If `main` diverges from expected merged state:
  - `git checkout main`
  - `git pull --ff-only`
  - verify merge commits for PR #40 and PR #41 exist in history
- If handoff docs drift:
  - compare with canonical docs listed above
  - restore authoritative docs from `main`

## 12. How To Continue From Here

1. Start from clean `main`.
2. Confirm canonical docs and this ledger are current.
3. Verify stream worktrees exist and are clean (or local-only `.codex` notes only).
4. Launch one 6+/10 task per stream using the required handoff header format.
5. Keep Stream 1 and Stream 2 parallel only from clean `main` baseline.
6. Let Stream 3 audit/unblock explicitly scoped work only.
7. Before each merge, run merge-readiness checklist and include exact final report fields.
