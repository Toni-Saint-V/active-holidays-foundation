# Execution Brief Sync · Sample

## NEXT STEP

- One concrete task selected from the latest product, design-drift, truth, and copy reports.
- If feeder reports are missing, mark the brief `incomplete_context` instead of inventing confidence.

## REQUIRED CONTEXT

- `AGENTS.md`
- `RUNBOOK.md`
- `AUTOMATIONS_*`
- `reports/automations/state/gate-eligibility-snapshot.json`
- latest feeder reports when present

## EXECUTION BRIEF

- Scope: one repo-startable task.
- Owner: Codex/Cursor/Lovable according to the surface.
- Non-goals: no invented API, no broad redesign, no Notion writeback unless the gate allows it.
- Blockers: `requires_png_approval` for UI hierarchy/layout/CTA work.

## PASTE-READY PROMPT

```json
{
  "task": "Strengthen one evidence-backed product surface without changing domain contracts.",
  "scope": ["one surface", "existing contracts", "Russian copy"],
  "nonGoals": ["new backend", "broad redesign", "invented metrics"],
  "requiresPngApproval": true,
  "verification": ["npm run typecheck", "npm run build"]
}
```

## ACCEPTANCE CRITERIA

- The task can start from current repo state.
- It has one owner, one surface, and explicit non-goals.
- Verification is concrete.

## VERIFY

- `npm run typecheck`
- `npm run build`
