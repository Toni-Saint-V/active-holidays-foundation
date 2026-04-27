# Forward Risk Checklist

Use this reference after the first correctness pass. The goal is to find what becomes expensive later even if the current diff "works".

## Extensibility

- What breaks when a new enum value or status is added?
- What breaks when a second product flow reuses this module?
- Does this design force future contributors to edit many files for one change?
- Is there one canonical place for the rule, or multiple partial versions?

## Lifecycle and concurrency

- What happens on retry?
- What happens on duplicate submission?
- What happens when updates arrive out of order?
- What happens when the action succeeds partially?
- Can a terminal state still be mutated accidentally?
- Does an idempotent reuse path still depend on recomputation or other fragile current-state work?

## Ownership and boundaries

- Is the owner of this logic obvious?
- Is the domain contract leaking transport or UI concerns?
- Is view code deciding business rules?
- Is persistence shape being treated as product API?
- Is actor identity derived on the server, or can the caller claim arbitrary ownership?

## Data and auditability

- Can we reconstruct what happened later?
- Do snapshots capture the moment that matters?
- Is history append-only where it needs to be?
- Are timestamps and actor fields sufficient for operator workflows?
- Will the state survive restart, crash, or multi-process deployment if the workflow implies auditability?

## Operational readiness

- Can support or ops understand the current state from stored data?
- Is there a meaningful error state instead of generic failure?
- Is there a recovery path for stuck or unassigned work?
- Are monitoring, alerts, or logs at least conceptually supported?

## Testing

- Do tests cover the exact transition or failure that is risky?
- Are edge cases represented, or only happy paths?
- Are integration tests exercising the real contract surface?
- Are unit tests carrying the negative-path burden when integration tests stay happy-path only?
