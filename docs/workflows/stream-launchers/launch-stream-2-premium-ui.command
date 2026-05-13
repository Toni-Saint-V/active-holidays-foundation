#!/bin/zsh
set -euo pipefail

STREAM_NAME="Stream 2 - Premium UI Experience"
WORKTREE="$HOME/Projects/active-holidays-stream2-premium-ui"
EXPECTED_BRANCH="feat/stream2-premium-ui"

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
[[ -f "docs/ui/premium-scorecard.md" ]] || die "Missing docs/ui/premium-scorecard.md"

PROMPT_FILE="$(mktemp -t ah-stream2-premium-ui.XXXXXX.md)"
trap 'rm -f "$PROMPT_FILE"' EXIT

cat > "$PROMPT_FILE" <<'PROMPT'
You are running Stream 2 from the one-touch Codex launcher.

STREAM
- Name: Premium UI Experience
- Worktree: ~/Projects/active-holidays-stream2-premium-ui
- Branch: feat/stream2-premium-ui
- Complexity: 7/10

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
- Primary mode: premium-ui in blocked-png/planning lane.
- Core: ah-control-protocol, ah-ui-direction, active-holidays-premium-ui, premium-png-screen-design, frontend-skill, ai-native-interaction-design, product-copy, premium-lead-trust-mechanics, product-ui-ux-ai-master-reviewer, ah-visual-qa.
- Accelerators: vercel:ai-elements and vercel:json-render for AI explanation/result surfaces; vercel:agent-browser-verify for screenshot proof after approved implementation; figma:figma-implement-design only if a real Figma node is supplied; vercel:shadcn only if existing UI already uses shadcn.
- Finish: ah-review-release, ah-visual-qa, superpowers:verification-before-completion.

HARD STOPS
- Stop if this worktree is dirty except local-only .codex notes.
- Stop if branch is not feat/stream2-premium-ui.
- Stop if task requires package/lockfile/dependency/CI/schema changes.
- Stop if scope crosses into Stream 1 or Stream 3 without explicit note.
- Stop if runtime implementation starts before UI plan/screenshot gate is produced.
- Stop before broad UI code. This stream is planning and screenshot-gate first.

GLOBAL CHECKS
Run first:
- Read AGENTS.md.
- Read docs/workflows/parallel-codex-streams.md.
- Read docs/ui/premium-scorecard.md.
- git branch --show-current
- git status --short --branch
- git diff --check
- git diff --stat
- Inspect package.json, app/, src/, components/, styles/tailwind files.
- Inspect existing design tokens/components.
- Inspect current intake/result/human-review screens if present.
- Run relevant package scripts only if they already exist.

TASK
Create premium UI screen/state plan + screenshot approval gate before broad UI code.

GOAL
Prepare implementation-ready Premium AI Travel Visa Concierge UI plan without inventing backend/product truth and without broad UI implementation before approval.

DELIVERABLES
1. UI screen map:
   - mobile-first intake flow
   - calculating/staged progress flow
   - result cockpit
   - AI explanation drawer
   - human review room
   - sent confirmation
   - checkout/return placeholders only if deterministic eligibility exists

2. State matrix for every relevant screen:
   - empty
   - loading
   - error
   - success
   - disabled
   - retry/recoverable states

3. Truth-safety UI map:
   - deterministic fields
   - AI explanation/support fields
   - unknown/missing fields
   - forbidden claims
   - copy that must not appear

4. Premium UI Gate package:
   - scorecard template
   - required screenshot pack list
   - before/after requirement when modifying existing screens
   - mobile PNG requirement
   - desktop PNG requirement
   - reduced-motion note
   - UX risk block

5. Optional minimal docs/code location:
   - Prefer docs or design planning file if broad UI implementation is not approved yet.
   - If creating UI placeholders, keep them minimal and clearly non-final.
   - Do not fake backend values.

ALLOWED SCOPE
- UI/UX planning docs
- screen/state map
- screenshot gate checklist
- copy/truth-safety matrix
- minimal component audit
- no broad redesign unless explicitly requested

FORBIDDEN SCOPE
- invented backend truth
- fake readiness/verification/confidence
- guarantee claims
- AI-owned deterministic decision
- ungated monetization CTA
- broad UI implementation before approval pack
- package/dependency/lockfile changes
- CI/scripts/schema changes

ACCEPTANCE CRITERIA
- UI plan is actionable for implementation.
- Premium UI Gate is explicitly satisfied or blockers are listed.
- One primary CTA per screen is specified.
- Every state has honest recoverability.
- No fake product claims.
- No runtime business logic changes.

FINAL REPORT
Must include:
- READY / BLOCKED / NEEDS REWORK
- summary
- files changed
- commands run + exact results
- screenshot/PNG gate status
- Premium Scorecard draft
- UX risk block
- truth-safety confirmation
- remaining blockers
- next Stream 2 task
- handoff notes for Stream 1 and Stream 3
- rollback path
PROMPT

codex --cd "$WORKTREE" --sandbox workspace-write --ask-for-approval never "$(cat "$PROMPT_FILE")"
