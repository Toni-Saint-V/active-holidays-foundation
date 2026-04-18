# Severity Model

Use this reference to keep findings prioritized and honest.

## Severity levels

- `P0`
  - Ship blocker
  - Data loss, broken critical flow, security/privacy leak, irreversible corruption, or invalid state progression on a core path

- `P1`
  - High-impact defect or architecture gap
  - Likely wrong behavior, major regression risk, unsafe contract drift, or lifecycle hole that will create incidents or expensive rework

- `P2`
  - Meaningful maintainability or edge-case risk
  - Not immediately catastrophic, but likely to slow delivery, cause future defects, or break under extension

- `P3`
  - Low-impact cleanup with real value
  - Keep only if it improves clarity, ownership, or future change cost

## Finding acceptance checklist

Keep a finding only if you can answer "yes" to all of these:

- Is the behavior or risk real, not hypothetical hand-waving?
- Can I point to the exact mechanism in code or contract?
- Can I explain the impact in one paragraph?
- Would a teammate know what to fix next?

## False-positive guard

Before publishing a finding, ask:

- Is this already prevented elsewhere in the same flow?
- Is this path intentionally unreachable?
- Is the stricter contract defined in another source of truth?
- Am I mistaking "not implemented yet" for "broken" when the scope excludes it?
- Is this only a style preference with no correctness or future-cost impact?

If the answer is unclear, downgrade confidence or move it to open questions.

## Minimal finding shape

Each finding should contain:

1. short title
2. one-paragraph explanation
3. file and line reference when available
4. severity
5. concrete fix direction

## "No findings" standard

If you find nothing actionable:

- say explicitly that no findings were identified
- mention what was validated
- mention what was not validated
- mention residual risk or missing tests if any remain
