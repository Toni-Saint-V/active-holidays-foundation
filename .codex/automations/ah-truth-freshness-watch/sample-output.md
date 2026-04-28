# Truth + Freshness Watch · Sample

## SOURCE HEALTH

- Run `npm run automations:check:truth` first.
- Use `npm --silent run automations:check:truth -- --json` when a machine-readable risk/action packet is needed.

## RISKS TO TRUST

- Classify each issue by product impact:
  - `blocking`: can distort eligibility, timing, price, required document, or disclaimer
  - `warning`: can reduce confidence but does not change the current decision path
  - `watch`: low-risk freshness drift with no immediate decision impact
- `npm --silent run automations:check:truth -- --json` emits `issues[].productImpact`
  and `nextTasks[]` so stale truth can become actionable product work instead of
  staying as terminal-only warning text.
- `npm run automations:check:truth -- --write` persists `task-packet-latest.json`
  with a Codex brief, acceptance criteria, and a downstream sync draft.
- The sync draft is report-only until a separate adapter adds the repo-owned
  Notion packet envelope fields.

## REQUIRED ACTION

- Re-check the operator source and refresh `lastCheckedAt` only after manual verification.
- If the JSON report emits `nextTasks[]`, copy the highest-severity task into the
  next execution packet or mark it with an explicit owner.
- Prefer `task-packet-latest.json` for downstream sync drafting instead of manually
  rewriting the terminal warning.

## DOWNSTREAM PACKET

- Use `task-packet-latest.json` as the handoff source.
- Do not write to Notion from this automation; route sync through the director.

## SAFE PATCH OR MANUAL REVIEW

- Manual review first.
- Code patch is safe only for routing, packet generation, or report formatting.

## VERIFY

- `npm run automations:check:truth`
- `npm --silent run automations:check:truth -- --json`
