# Parallel Codex Streams

## Purpose

Canonical 3-stream operating model for parallel Codex execution. This document defines ownership, branch discipline, and handoff boundaries so implementation does not mix responsibilities.

## Core Model

Run work in three explicit streams:

1. Stream 1 - Business Logic Core
2. Stream 2 - Premium UI Experience
3. Stream 3 - AI Integrations / Infra / Audit

## One-Touch Launchers

Use the launchers in `docs/workflows/stream-launchers/` when each stream should start without manually pasting the prompt:

- `launch-stream-1-business-core.command`
- `launch-stream-2-premium-ui.command`
- `launch-stream-3-ai-infra-audit.command`

Each launcher performs the stream hard stops before starting Codex:

- expected worktree exists
- expected branch is active
- working tree is clean except local `.codex/notes` or `.codex/local` notes
- required workflow docs exist

If a hard stop fails, the launcher exits before starting Codex.

## Stream 1 - Business Logic Core

Owns:

- Application and business logic
- Refactoring
- Case-bound intake logic
- Status machine
- Checklist engine
- Server-owned result truth
- Deterministic `ResultPayload` and public projection mapping
- Eligibility and CTA logic
- Resume flow
- Sales and order logic
- Analytics events
- API contracts and tests

## Stream 2 - Premium UI Experience

Owns:

- Premium AI travel visa concierge UX
- Mobile-first screens
- Design system usage
- Case-first dashboard
- Intake UX
- Upload cockpit
- AI concierge surface
- Result screen
- Checkout and return UX
- Empty/loading/error/success states
- Motion and reduced-motion
- Screenshot pack
- Premium UI Gate

## Stream 3 - AI Integrations / Infra / Audit

Owns:

- Secure upload
- Document parsing and classification
- Field extraction
- AI explanation layer
- Source and provenance graph
- Stale guards and forbidden claims
- Alerts
- Security and observability
- QA and audit
- Support for Stream 1 or Stream 2 only when explicitly assigned

## Operating Rules

- One stream equals one branch and one worktree.
- No dirty shared branch.
- No standalone task below `6/10` complexity.
- Smaller actions must be bundled into a `6+/10` task.
- Each task must declare: stream, branch, scope, hard stops, checks, and final report format.
- Stream 1 and Stream 2 may run in parallel only from clean `main`.
- Stream 3 may audit or unblock either stream, but must not silently mix unrelated implementation.

## Branching and Execution Discipline

1. Start from clean `main`.
2. Create a dedicated task branch for exactly one stream.
3. Keep changes inside the stream ownership boundary.
4. If cross-stream dependency appears, stop and split into explicit handoff tasks.
5. Merge stream branches independently after passing stream-specific checks.

## Required Task Header for Multi-Stream Work

Every stream task must state at minimum:

- Stream:
- Branch:
- Scope:
- Hard stops:
- Checks:
- Final report:

## Hard Stops

Stop execution and report immediately if:

- Branch/worktree ownership is ambiguous.
- A task mixes unrelated Stream 1/2 implementation in one branch.
- Stream 3 introduces product logic/UI changes without explicit assignment.
- Working tree is dirty before starting a new stream task from `main`.

## Stream Interaction Contract

- Stream 1 publishes deterministic contracts and eligibility decisions.
- Stream 2 consumes Stream 1 contracts; it does not invent business truth.
- Stream 3 may enrich explanation/provenance and enforce trust safety; it does not replace deterministic ownership from Stream 1.

## Completion Criteria

A stream task is complete only when:

- Ownership boundary stayed intact.
- Required checks and hard stops were respected.
- Final report includes exact commands, exact results, and rollback path.
- No unrelated files or cross-stream drift were introduced.
