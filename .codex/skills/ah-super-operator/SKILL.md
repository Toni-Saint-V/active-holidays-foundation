---
name: ah-super-operator
description: Active Holidays: максимальный execution режим. Используй для broad/high-stakes задач, когда нужно собрать лучший микс skills, agents, проверки, review и handoff без mega-prompt шума.
---

# AH Super Operator

## Goal

Turn a high-stakes Active Holidays request into one focused execution system: right skill stack, clear ownership, hard gates, implementation, verification, review, and next handoff.

## When To Use

- пользователь просит "максимальную силу", "супер режим", "10/10", "12/10", "сделай основательно"
- задача широкая, ambiguous, multi-surface, high-risk, or product-critical
- нужно связать product, contracts, AI/trust, UI, QA, release, Notion/Lovable/Codex handoff
- есть риск, что обычный shallow routing возьмет слишком мало контекста или даст generic план

Do not use for narrow one-file fixes, simple terminal commands, or pure status reports.

## Workflow

1. Start with `ah-control-protocol` and resolve the primary mode.
2. For broad work, run or mirror `npm run do -- "<request>"`.
3. Pick one power mix below. Do not load every skill blindly.
4. Define:
   - user goal
   - business goal
   - dominant surface
   - forbidden scope
   - verification commands
   - review gate
5. Execute the smallest complete slice that moves the product.
6. Run proof, then use `ah-review-release` before saying done.
7. End with the next concrete action or paste-ready handoff when useful.

## Power Mixes

Use exactly one dominant mix, then add companions only for real risk.

### Product Control Tower

For next task, roadmap, Notion/Lovable/Codex handoff, phase gate, or strategy-to-execution work.

- Core: `ah-control-protocol`, `ah-product-strategy`, `ah-repo-automation`
- Finish: `ah-review-release`
- Proof: source-of-truth check, duplicate/parallel-context check, explicit next task

### Decision Runtime

For result flow, contracts, evidence, human-review, scenario lab, recommendation boundary, or reliability.

- Core: `ah-result-flow`, `ah-backend-contracts`
- Companion: `ah-ai-trust-layer` when model output, prompts, cache, or fallback is touched
- Finish: `ah-review-release`
- Proof: typecheck, targeted tests, relevant engine/boundary verifier

### Premium UI

For screen, layout, copy, visual hierarchy, CTA, interaction, and browser proof.

- Direction: `ah-ui-direction`
- Implementation: `ah-ui-implementation` only after explicit PNG approval
- Proof: `ah-visual-qa`, then `ah-review-release`
- Hard gate: no UI code before approved PNG

### Debug And Hardening

For bugs, failing tests, broken builds, state drift, persistence, fallback, or degraded behavior.

- Core: `ah-backend-contracts`
- Companion: `superpowers:systematic-debugging`
- Finish: `ah-review-release`
- Proof: reproduce first, root cause, failing regression, green narrow gate

### Ship Or Merge

For final readiness, PR, merge, release, or "можно ли мержить".

- Core: `ah-review-release`
- Companion: `superpowers:verification-before-completion`
- Proof: clean git status, relevant verify stack, blocker-first verdict

## Agent Policy

- Solo by default for narrow high-confidence tasks.
- Add agents only when ownership can be split cleanly.
- Every agent must have disjoint ownership, deliverable, and verification boundary.
- Do not create agents for the immediate blocking step.

## Hard Rules

- No mega-prompt that mixes unrelated tasks.
- No invented APIs, endpoints, metrics, Notion state, or user behavior.
- No UI implementation before PNG approval.
- No "done" without verification evidence.
- No second router: this skill coordinates the existing router, action skills, and `orchestrationMode`.
