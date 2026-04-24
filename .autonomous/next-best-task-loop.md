# Next Best Task Loop

## Purpose

Select one safe, high-value task from current product and repo reality. The loop should prevent backlog sprawl and avoid unsafe automation.

## Loop

1. Inspect repo runtime evidence.
2. Load candidate task definitions.
3. Validate safety gates.
4. Score candidates.
5. Select the highest safe score.
6. Emit a task packet and founder report.
7. If safe execution is enabled, create a branch and implement.
8. Run checks and self-review.
9. Prepare PR or merge-ready branch.
10. Prepare dry-run Notion/GitHub sync payload.

## Minimal Command

```bash
npm run autonomous:next
```

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
- founder report text

## Activation Boundary

The current loop is deterministic and local. It does not create branches, edit code, push PRs, or write Notion. Those steps are downstream executor permissions and must be enabled separately.
