---
name: ah-backend-contracts
description: "Active Holidays: backend/domain/contracts. Используй для routes, shared contracts, decision engine, persistence, reliability, bugfix root cause и production hardening."
---

# AH Backend Contracts

## Goal

Keep server, shared contracts, domain logic, and persistence correct and extendable.

## When To Use

- Express routes, shared schemas, DTOs, API client contracts
- decision engine, risk, offers, rules, scenario replay
- persistence, lifecycle, idempotency, degraded states
- production hardening or bugfix root cause

## Workflow

1. Trace ownership across shared -> server -> client.
2. Prefer domain logic before UI changes.
3. Keep validation and callers aligned in one pass.
4. Add the narrowest regression proof for the changed contract.
5. Use internal references only when needed:
   - `_internal/architecture-guardrails.md`
   - `_internal/production-hardening.md`
   - `_internal/bugfix-root-cause.md`
   - `_internal/golden-evals.md`
   - `_internal/fallback-safe-behavior.md`

## Hard Rules

- No server-only data leaks to browser code.
- No raw storage shapes in UI.
- No silent contract drift.
