#!/bin/zsh
set -euo pipefail

STREAM_NAME="Stream 1 - Business Logic Core"
WORKTREE="$HOME/Projects/active-holidays-stream1-business-core"
EXPECTED_BRANCH="feat/stream1-business-core"

die() {
  echo ""
  echo "BLOCKED: $1"
  echo ""
  read "reply?Press Enter to close..."
  exit 1
}

echo "Launching $STREAM_NAME"
echo "Worktree: $WORKTREE"
echo "Expected branch: $EXPECTED_BRANCH"

[[ -d "$WORKTREE" ]] || die "Worktree does not exist: $WORKTREE"
cd "$WORKTREE"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Not a git worktree: $WORKTREE"

CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$EXPECTED_BRANCH" ]] || die "Expected branch '$EXPECTED_BRANCH', got '$CURRENT_BRANCH'"

DIRTY_BLOCKERS="$(git status --short --untracked-files=all | awk '
{
  path = substr($0, 4)
  if (path !~ /^\.codex\/notes\// && path !~ /^\.codex\/local\// && path !~ /^\.codex\/.*\.local\./) print
}')"
[[ -z "$DIRTY_BLOCKERS" ]] || die "Dirty worktree outside local .codex notes:\n$DIRTY_BLOCKERS"

[[ -f "AGENTS.md" ]] || die "Missing AGENTS.md"
[[ -f "docs/workflows/parallel-codex-streams.md" ]] || die "Missing docs/workflows/parallel-codex-streams.md"

PROMPT_FILE="$(mktemp -t ah-stream1-business-core.XXXXXX.md)"
trap 'rm -f "$PROMPT_FILE"' EXIT

cat > "$PROMPT_FILE" <<'PROMPT'
You are running Stream 1 from the one-touch Codex launcher.

STREAM
- Name: Business Logic Core
- Worktree: ~/Projects/active-holidays-stream1-business-core
- Branch: feat/stream1-business-core
- Complexity: 8/10

GLOBAL CONTEXT
- PR #40 merged: Premium UI Gate / governance.
- PR #41 merged: permanent 3-stream Codex model.
- PR #42 exists for project handoff ledger. Do not touch PR #42 unless explicitly required.
- User only transfers prompts/results. Codex performs repo actions.
- One stream = one branch/worktree.
- No standalone task below 6/10.
- Engine decides. AI explains. UI shows provenance.
- AI must not own deterministic truth.

SKILL SET
- Primary mode: contract-boundary.
- Core: ah-control-protocol, ah-backend-contracts, ah-result-flow, ah-ai-trust-layer, superpowers:test-driven-development, superpowers:systematic-debugging, codex-security:threat-model, codex-security:attack-path-analysis, bank-grade-review.
- Accelerators: vercel:observability for trace/proof language; vercel:verification for full-story proof; test-repair only if existing tests fail; supabase:supabase-postgres-best-practices only if repo already uses Supabase/Postgres; vercel:workflow and vercel:vercel-queues only as architecture references unless the existing stack already uses them.
- Finish: ah-review-release, superpowers:verification-before-completion, vercel:verification.

HARD STOPS
- Stop if this worktree is dirty except local-only .codex notes.
- Stop if branch is not feat/stream1-business-core.
- Stop if task requires package/lockfile/dependency/CI/schema changes.
- Stop if scope crosses into Stream 2 or Stream 3 without explicit note.
- Stop if UI redesign, animation, or premium visual work is required.
- Stop if deterministic truth would be owned by AI.

GLOBAL CHECKS
Run first:
- Read AGENTS.md.
- Read docs/workflows/parallel-codex-streams.md.
- git branch --show-current
- git status --short --branch
- git diff --check
- git diff --stat
- Inspect package.json, app/, src/, lib/, components/, types/, tests if present.
- Inspect existing API routes/actions/server functions.
- Inspect intake/result/case/status/checklist files.
- Inspect README and docs relevant to app flow.
- Run relevant package scripts only if they already exist.

TASK
Implement case-bound intake + server-owned result foundation.

DELIVERABLES
1. Case-bound intake model:
   - Define/locate Case entity or equivalent.
   - Intake must create or update a case-bound state.
   - User answers must attach to a case/session identity.
   - Avoid anonymous floating result state.

2. Server-owned result foundation:
   - Create deterministic ResultPayload or equivalent if absent.
   - Include public projection shape for UI consumption.
   - Separate deterministic fields, user-provided fields, missing/unknown fields, and AI explanation/support fields.
   - UI must not calculate final readiness itself.

3. Status machine foundation:
   - Define valid states such as draft/intake_in_progress/calculating/ready_for_review/submitted/sent/error if compatible with repo.
   - Prevent impossible transitions.
   - Keep state names aligned with existing code when possible.

4. Eligibility / CTA contract:
   - Define deterministic CTA eligibility contract.
   - Monetization CTA must be eligibility-gated.
   - No fake readiness, fake verification, fake guarantee, or AI-owned decision fields.

5. Tests / proof:
   - Add or update tests if test structure exists.
   - If no tests exist, add minimal proof through existing scripts/typecheck/lint.
   - Do not add new test framework.

ALLOWED SCOPE
- business logic
- server/actions/API routes
- domain/types/contracts
- validation
- status/result/eligibility logic
- tests using existing setup
- minimal UI wiring only if required to compile, not redesign

FORBIDDEN SCOPE
- broad UI redesign
- premium visual work
- animation/motion work
- package/dependency/lockfile changes
- CI/scripts/schema changes
- fake AI confidence/readiness claims

ACCEPTANCE CRITERIA
- Intake/result is case-bound.
- ResultPayload/public projection is server-owned.
- Deterministic fields are not owned by AI.
- CTA eligibility is deterministic.
- Existing app still builds/checks with available scripts.
- No broad UI changes.

FINAL REPORT
Must include:
- READY / BLOCKED / NEEDS REWORK
- summary
- files changed
- commands run + exact results
- tests/checks
- deterministic truth boundary
- remaining risks
- next Stream 1 task
- handoff notes for Stream 2 and Stream 3
- rollback path
PROMPT

codex --cd "$WORKTREE" --sandbox workspace-write --ask-for-approval never "$(cat "$PROMPT_FILE")"
