# M1 Source-of-Truth Sync

Status: source-of-truth reconciliation pack. This is not a UI implementation.

## Repo Evidence

- Repo: `/Users/user/Projects/active-holidays-foundation-scenario-human-review-handoff`
- Branch for this sync: `codex/m1-source-truth-ui-approval-gate`
- Verified base: `main` / `origin/main`
- Current main evidence: `4fa2f0c Add visa readiness pass UI contract pack (#26)`
- Relevant merged work:
  - `75a7c97 Merge pull request #25 from Toni-Saint-V/codex/trust-calibration-ops-cockpit-core`
  - `da762c2 Merge pull request #24 from Toni-Saint-V/codex/human-review-trust-calibration-engine`
  - `b326638 Merge pull request #23 from Toni-Saint-V/codex/human-review-trust-calibration-engine`

## Notion Drift Found

The Notion pages still frame Human Review as fully blocking M1 because of four backend lifecycle findings:

- terminal state mutability
- client-supplied `changedBy` trust
- process-local workflow state
- idempotent create/reuse depends on recompute

That status is now stale relative to the merged repo state. The honest product status is narrower:

- Human Review backend/domain fallback and trust-calibration core have moved past the original backend blocker.
- M1 is not fully production-ready yet.
- Remaining gates are UI approval, UI implementation after approval, ops policy, and production rollout.

## Corrected Product Status

Human Review should now be represented as:

- backend/domain fallback: ready for M1 integration path
- trust calibration: backend/domain and ops cockpit core available
- visual product surface: blocked until approved PNG/Figma direction
- production rollout: blocked until ops policy and final phase gate

## Update Block For `00 · Vision & Product`

Replace the red Human Review blocker with this callout:

```md
<callout icon="🟡" color="yellow_bg">
  **Human Review — backend/domain fallback готов к M1 integration path, но M1 ещё не production-ready.** Старые backend findings по lifecycle integrity, actor ownership, persistence/restart safety и idempotent reuse закрыты в repo workstream. Оставшиеся gates: PNG/Figma approval для пользовательской поверхности, UI implementation после approval, ops policy и production rollout. См. <mention-page url="https://app.notion.com/p/3466a971ad4681c88053c944c9315474"/>.
</callout>
```

## Update Block For `M1 · Codex — Human Review lifecycle hardening`

Replace the page status callout with this:

```md
<callout icon="✅" color="green_bg">
  **Статус страницы**
  **Тип:** Spec / implementation evidence
  **Фаза:** M1 integration
  **Готовность:** backend/domain 100%; product rollout не закрыт
  **Owner (A):** <mention-user url="user://b99e17be-341b-4bca-9217-0f217c7dc897"/>
  **Contributors (R):** Codex CLI
  **Что содержит:** evidence по закрытому Human Review lifecycle hardening и следующему UI/ops gate
  **Состояние:** старые 4 backend findings закрыты; HR fallback больше не является backend blocker для M1
  **Ключевые артефакты:** <mention-page url="https://app.notion.com/p/3466a971ad4681afb789f9b790540937"/> · <mention-page url="https://app.notion.com/p/fc987ffb0c424631868beaf164e4379e">Active Holidays</mention-page>
  **Открытые gates:** PNG/Figma approval; UI implementation после approval; ops policy; production rollout
  **Next action:** подготовить и утвердить PNG concept для Human Review / Trust Calibration surface
  **Last verified:** 2026-05-01 Codex CLI
  **Блокирует:** только visual/ops rollout, не backend/domain fallback
</callout>
```

Replace the red blocking callout with this:

```md
<callout icon="🟡" color="yellow_bg">
  **НЕ backend blocker.** Human Review lifecycle hardening закрыт на уровне repo/domain. Нельзя называть весь M1 production-ready до UI approval, UI implementation, ops policy и final phase gate.
</callout>
```

## Next Safe Build Step

Run the PNG-only approval task before any visual implementation:

```text
$active-holidays-premium-ui

Use this Active Holidays UI task only for PNG concept approval, not UI implementation.

Goal:
Create a premium PNG concept direction for the post-result Human Review / Trust Calibration cockpit experience.

Hard rules:
- Do not write React/CSS/UI code.
- Do not implement Lovable output yet.
- Use existing ResultPayload and existing HUMAN_REVIEW behavior.
- Do not introduce new verdict states.
- Do not invent legal certainty, fake AI advice, or unavailable APIs.
- All visible copy must be Russian.
- The screen must explain uncertainty honestly and make the next safe action obvious.

Source context:
- Human Review backend/domain fallback is no longer the main M1 backend blocker.
- Remaining gates are PNG/Figma approval, UI implementation after approval, ops policy, and production rollout.
- The concept should show how a user/operator understands:
  - why the case needs review
  - what evidence or risk caused it
  - what can be improved safely
  - what requires human decision

Deliverable:
One PNG-ready screen concept brief with states:
- normal review-needed state
- stale/missing/conflicting evidence state
- no safe automatic improvement state
- operator escalation / next action state

No implementation until PNG is approved.
```

## Out Of Scope

- React, CSS, route, or component implementation
- new result model
- new verdict states
- automatic source catalog mutation
- legal certainty or visa outcome prediction
- Lovable implementation before PNG approval
