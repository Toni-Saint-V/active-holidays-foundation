# Next Best Task Loop

## Purpose

Select one high-value task from current product and repo reality. The loop should prevent backlog sprawl and avoid unsafe automation.

## Loop

1. Inspect repo runtime evidence.
2. Load candidate task definitions.
3. Load candidate lifecycle status.
4. Validate safety gates.
5. Score candidates.
6. Exclude completed or paused candidates from selection.
7. Emit a task packet and founder report.
8. If safe execution is enabled, create a branch and implement.
9. Run checks and self-review.
10. Prepare PR or merge-ready branch.
11. Prepare dry-run Notion/GitHub sync payload.

## Minimal Command

```bash
npm run autonomous:next
```

This is planning mode: it can surface a high-value task that still needs an approval gate before execution.

## Executor-Safe Command

```bash
npm run autonomous:next -- --mode=executor
```

Executor mode blocks UI approval, external write, destructive, paid, legal, production, and live Notion gates.

## Verification Command

```bash
npm run autonomous:verify
```

## Output Contract

The loop returns:

- selected task id
- score
- score breakdown
- product reason
- implementation scope
- verification plan
- blocked gates
- lifecycle status
- founder report text

## Activation Boundary

The current loop is deterministic and local.

- `npm run autonomous:next` selects and reports the next planning task.
- `npm run autonomous:next -- --mode=executor` selects and reports the next executor-safe task.
- `.autonomous/task-status.json` marks completed or paused candidates so the static selector does not keep re-selecting shipped work.
- `npm run autonomous:execute` prepares an executor packet and may create a local `codex/*` branch only when explicitly run with `--write`.
- The system still does not autonomously edit product code, push PRs, merge into `main`, or perform live Notion writeback.
