# Review Rubric

Use this reference when the review surface is broad or when the artifact type changes what "good" means.

## 1. Diff or PR review

Check in this order:

1. Behavior change
   - Does the diff change the user-visible or system-visible contract?
   - Are old call sites still valid?
   - Are fallback paths still correct?

2. Contract integrity
   - Are schema changes versioned or coordinated?
   - Are enums, route names, or status values duplicated across layers?
   - Does the diff tighten validation without updating callers?

3. State and lifecycle
   - Are all valid states represented?
   - Are invalid transitions blocked?
   - Are retry, re-entry, cancellation, and partial completion covered?

4. Data integrity
   - Does persistence remain canonical?
   - Is any value derived in multiple places?
   - Are snapshots, caches, or history records updated consistently?

5. Tests
   - Is the critical path covered?
   - Is at least one negative or conflict path covered?
   - Do tests assert behavior, not only structure?

## 2. API or schema review

Look for:

- unversioned payload drift
- nullable vs required mismatch
- backward-incompatible field renames
- leaky transport details in domain contracts
- ambiguous timestamps, ids, or state ownership
- missing error envelope or inconsistent failure codes
- missing auditability for operator-facing flows

## 3. Migration or persistence review

Look for:

- irreversible or unsafe mutations
- partial-write hazards
- non-idempotent backfills
- derived columns that can drift from the source of truth
- missing rollback or replay path
- hidden dependencies on seed order or record ordering
- workflow state stored only in process memory while the feature implies durability or audit history

## 4. State machine or workflow review

Look for:

- states that exist in prose but not in code
- transitions allowed without required context
- terminal states that can still mutate
- closed states that still allow same-status updates, note appends, or ownership changes
- manager or owner assignment missing from owned states
- "success" paths that skip conflict resolution
- no distinction between "submitted", "received", "assigned", and "resolved"
- actor identity or ownership fields accepted from untrusted clients instead of server-derived context

## 5. UI or product-flow review

Only use this lens when the artifact affects user behavior.

Look for:

- unclear primary next step
- trust claims unsupported by the system
- hidden failure or waiting states
- CTA mismatch with backend readiness
- routes that depend on raw storage shape rather than stable contracts

## 6. Architecture review

Look for:

- dependencies flowing in the wrong direction
- cross-layer imports that will block future modularization
- duplicated orchestration rules
- domain logic inside view or transport layers
- feature code that cannot be extended without editing many unrelated files
- shared utility layers becoming unowned dumping grounds
- process-local stores acting as accidental system-of-record for multi-step operator workflows

## 7. Anti-patterns worth flagging

Escalate when you see:

- magic strings duplicated across files
- boolean flags standing in for real states
- "optional" fields that are actually required for behavior
- background assumptions encoded only in UI copy
- silent fallback behavior that hides invalid input
- tests that mock away the exact risk surface under review
