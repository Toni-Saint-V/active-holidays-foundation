## Documentation


### AGENTS.md

````
# AGENTS.md

## Core Rules

- Domain logic first, UI second.
- Never claim completeness without verification.
- Never leak secrets or server-only data to browser code.
- UI must depend on stable domain contracts, not raw storage shapes.
- All visible UI copy must be in Russian.
- Prefer the strongest real implementation over broad fake completeness.
- Repo-local custom Codex skills live in `.codex/skills` and should stay versioned with the repository when they affect this project's workflow.

## Project Ownership Rules

- Keep the whole Active Holidays project in view, not just the current file or isolated task.
- Do not behave like a narrow ticket executor when project continuity matters.
- Proactively define or surface the next strongest concrete task when it helps move the project forward.
- Keep delivery aligned with the current project phase, real constraints, and source-of-truth artifacts.
- When useful, prepare handoff-ready next-step blocks for Lovable, Cursor, Codex, or GitHub instead of making the user restate the work.

## Notion Discipline Rules

- When Notion is part of the workflow and access exists, treat it as a living source of truth, not passive reference material.
- Reconcile repo reality with Notion before making major planning, scope, or status claims.
- Keep task framing, progress, and execution state aligned between the implementation and Notion.
- After meaningful progress, scope change, or decision change, update the relevant Notion artifact or prepare the exact update block immediately.
- Do not let Notion drift away from the actual project state.

## Protocol Rules

- Ordinary discussion and clarification may use normal natural language.
- Structured formatting is mandatory only for execution-related outputs:
  - specs
  - implementation plans
  - task handoff blocks
  - status/progress blocks when they affect execution
  - checklists, risks, and acceptance criteria
- Do not force structured JSON for casual conversation unless the user explicitly asks for it.
- For any UI task, first show a PNG preview and wait for explicit user approval before changing UI code.
- Live browser screenshots are implementation proof only; they do not replace pre-implementation PNG approval.
- If a task mixes UI and non-UI work, non-UI execution may proceed, but the UI slice stays blocked until approval.

## Automation Rules

- Repo-local Codex automations live in `.codex/automations/`.
- Keep repo-local skills only when they differ from the shared global version; byte-identical copies should be removed instead of shadowing them.
- Automation definitions must stay runnable from `/Users/user/Projects/active-holidays-foundation`.
- Run `npm run automations:verify` after editing automation prompts, schedules, or supporting docs.
- Use `npm run automations:sync -- --dry-run` before copying repo-local automations into `$CODEX_HOME`.
- Runtime outputs belong in `reports/automations/` and must not turn into committed noise.

## Artifact Ownership Rules

- Keep deterministic source-of-truth state tracked only when a repo contract explicitly lists it.
- Keep browser captures in `output/playwright/`; use them as local proof or external review evidence, not as default committed source.
- Keep generated PDFs and copy packs in `output/pdf/` unless a curated document is intentionally moved into docs or Notion.
- Keep design approval packs in `reports/design/`; commit them only as a deliberate artifact pack after explicit approval.
- Keep scratch generation work in `tmp/` and root `.playwright-cli/` local-only.

## Plugin / MCP Surface Rules

- Prefer existing runtime plugins and shared skills before adding any repo-local plugin scaffold.
- Do not invent plugin manifests, marketplace entries, or MCP config shapes.
- Repo-local plugin work must stay anchored to real files: `plugins/*/.codex-plugin/plugin.json`, optional `.agents/plugins/marketplace.json`, and optional `.cursor/mcp.json`.
- If a repo-local plugin is added, it must solve a repeated repo-local workflow that skills, docs, or automations could not already cover cleanly.

## Skill Routing Rules

- Resolve exactly one primary operating mode before loading bundles or templates.
- Use `.codex/skills/modes.md`, `npm run skills:detect-mode`, or `npm run skills:start` to classify the task.
- Bundle choice and template choice must follow that same primary mode.
- Treat extra mode candidates as context only, not as permission to combine multiple primary modes.
- `skill-system-governance` is the primary mode for repo-local Codex surface work such as `.codex/skills/*`, `.codex/automations/*`, routing docs, `README.md`, `AGENTS.md`, and validator guidance.
- `skill-system-governance` is not a new abstraction layer; it is the maintenance mode for the existing router and operating docs.
- Move to `plugin-surface` only when plugin or MCP files are the dominant changed surface.

## Phase 1 Boundary

- Allowed: scaffold, routing, theme, tooling, client shell, server health route.
- Deferred: decision engine, data model, real API routes, AI interactions.

## Verification Rules

- Run `npm run build` after scaffold changes.
- Run `npm run test` after test or app-shell changes.
- Run `npm run typecheck` before closing a phase.

````

### AUTOMATIONS_AUDIT.md

````
# Active Holidays Automation Audit

## Scope

Audit date: `2026-04-18`

Goal: собрать automation suite, который автономно усиливает:

- product layer
- AI/interactive layer
- premium UI layer
- agent layer
- skill layer
- plugin / MCP / context layer
- truth / freshness layer

## Current Product Reality

### Repo already contains AI-native product primitives

- product autopilot on landing: `useProductAutopilot`
- signal autopilot in intake: `useSignalAutopilot`
- live intake preview: `MiniVerdictPreview`
- what-if simulation on result: `TemporalWhatIf`
- replay and audit timeline
- trust/confidence/source surfaces:
  - `ConfidenceGauge`
  - `NodeGraph`
  - `VolatilityRadar`
  - `FractalConfidence`

Conclusion: the best automation layer here is one that keeps making these surfaces smarter, more interactive, clearer, and more premium.

### Product truth lives outside the repo

- local markdown is thin by design
- real product and execution truth lives in Notion:
  - `Active Holidays`
  - `00 · Vision & Product`
  - `03 · Execution`
  - `P0 · Open Decisions`
- Linear project exists but is not yet carrying a living backlog

Conclusion: automations should generate briefs, prompt-ready artifacts, and distillations first, not blindly write into external systems.

### Agent and skill surface is noisy

- repo-local `.codex/skills/` exists
- during audit, `11` repo-local skills were byte-identical duplicates of shared global skills
- only `bank-grade-review` remained a justified repo-local override

Conclusion: a strong part of the suite should improve the agent/skill layer itself.

### Premium design ambition exists, but no loop enforces it

- motion primitives exist
- premium layout patterns exist
- AI-native surfaces exist
- but no recurring automation currently:
  - selects the next screen to polish
  - detects dead/static zones
  - maps current UI against product contract
  - proposes one strong premium improvement at a time

Conclusion: premium UI and interaction automations are first-class, not optional.

### Truth and freshness still matter

- `sources.json` already carries `lastCheckedAt`, `tier`, `volatilityScore`
- trust-critical catalogs already depend on source references

Conclusion: freshness belongs in the suite, but as a product trust loop, not as generic infra hygiene.

## Highest-ROI Automation Targets

Ranked by `speed × quality × product confidence × repeatability`.

1. `ah-agent-memory-guard`
2. `ah-skill-dedupe-gap-harvester`
3. `ah-product-os-radar`
4. `ah-ui-premium-polish-pass`
5. `ah-design-drift-vs-contract`
6. `ah-copy-trust-upgrade`
7. `ah-truth-freshness-watch`
8. `ah-next-best-action-distiller`
9. `ah-execution-brief-sync`
10. `ah-plugin-mcp-surface-watch`

## What The Suite Should Improve Continuously

### Product

- better AI-native interactions
- better next actions
- better trust surfaces
- better product clarity

### Process

- cleaner execution briefs
- less drift between repo and Notion
- more deterministic next-step selection

### Agent / skill / plugin surface

- fewer duplicate skills
- better repo-specific instructions
- stronger reusable skill candidates
- cleaner context surface around `.codex` and optional `.cursor`

### UI / design

- stronger hierarchy
- more premium motion
- more interactive value
- less static UI

## What Is Explicitly Not The Focus Of v1

- CI-heavy automations
- flaky-test hunting as a standalone track
- Sentry triage before monitoring exists
- SEO-first automation before the marketing surface is central

## Selection Principle

If an automation does not directly improve product quality, AI/interaction quality, premium UI quality, agent quality, skill quality, or context quality for Active Holidays, it should not be in this v1 suite.

````

### AUTOMATIONS_NOTION_AI_HANDOFF.md

````
# Notion AI Handoff

Use this prompt only after a fresh read-only audit against the live workspace.

Machine-owned sources of truth:

- live lock and audit status: `.codex/automations/notion-surface-lock.json`
- live writeback gate state: `reports/automations/state/notion-writeback-promotion.json`
- manual operator approvals: `reports/automations/state/manual-approvals.json`
- current deterministic eligibility: `reports/automations/state/gate-eligibility-snapshot.json`
- schema contract: `scripts/codex/notion-operational-contract.ts`

Non-negotiable runtime rules:

- title or name may be used only for read-only discovery before lock
- after lock, every operational write or update must resolve through locked id + `syncKey`
- `recordTitle` is display-only
- `syncKey` is the only durable operational identity
- any post-lock write or update attempt that still relies on title or name must fail as `blocked_by_target_binding`
- `writeback_enabled` is invalid if the current lock, contract, diff, and manual approval no longer match

## Paste-Ready Prompt

```text
Ты Notion AI для Active Holidays control tower.

Сначала прочитай machine-owned runtime files:
- `.codex/automations/notion-surface-lock.json`
- `reports/automations/state/notion-writeback-promotion.json`
- `reports/automations/state/manual-approvals.json`
- `reports/automations/state/gate-eligibility-snapshot.json`
- `scripts/codex/notion-operational-contract.ts`

Твоя задача:
- сначала подтвердить live reality в read-only режиме
- затем предложить или выполнить только те Notion changes, которые не нарушают machine-owned contract

Проверь live reality:
- какие canonical anchors реально существуют для `P0`, `P1`, `P2`
- какие operational DB surfaces реально существуют и какие из них уже locked в `.codex/automations/notion-surface-lock.json`
- где есть schema drift, property conflict или missing binding
- где legacy surfaces still exist and should stay read-only

Обязательные правила target resolution:
- title/name only for read-only discovery before lock
- как только у surface есть locked `targetId` или `dataSourceId`, target resolution возможен только через locked id + `syncKey`
- `recordTitle` is display-only
- identity = `syncKey`
- если binding missing, ambiguous, stale, or title-based after lock, итог должен быть `blocked_by_target_binding`

Обязательные gate rules:
- source of current eligibility is only `reports/automations/state/gate-eligibility-snapshot.json`
- не читай live-write eligibility напрямую из volatile observed state или из prose
- если `writeback_enabled` не подтверждён snapshot, не делай live writes
- если approval в `reports/automations/state/manual-approvals.json` не совпадает с текущим lock / contract / diff, live write запрещён

Repo-owned Notion contract, который нельзя нарушать:
- canonical anchors:
  - `P0 · Master Doc — Vision & Boundaries`
  - `P0 · Definition of Final`
  - `P1 · UX Architecture — Flow / State / Screens`
  - `P2 · Screen Contracts for Lovable`
- operational DB surfaces:
  - `Execution`
  - `Open Decisions`
  - `Build Briefs`
  - `Release Gate`
  - `Automation Inbox`
  - `Opportunities`
  - `Review Findings & Learnings`
- allowed write modes:
  - operational DBs: `UPSERT_RECORD_BY_SYNC_KEY`
  - `Automation Inbox`: `UPSERT_UNRESOLVED_BY_SYNC_KEY`
  - canonical anchors: `UPDATE_NOTE_BLOCK_BY_SYNC_KEY`

Что делать:
1. Сначала выдай короткий live audit:
   - confirmed
   - blocked_by_schema_contract
   - blocked_by_property_conflict
   - blocked_by_surface_drift
   - blocked_by_missing_binding
2. Для каждой operational surface скажи:
   - есть ли locked binding
   - какой target resolution lifecycle сейчас допустим
   - можно ли делать additive-only compat
   - blocked ли surface для live write
3. Если safe changes действительно разрешены:
   - добавляй только additive-compatible properties / views
   - не переименовывай surface или required property
   - не делай write/update через title or name after lock
4. Для canonical anchors:
   - не переписывай смысл радикально
   - используй только `Suggested Update`, `Drift Note`, `Decision Required`
5. Если surface missing or drifted:
   - не выдумывай новый target молча
   - оставь clean blocked outcome и нужный next step

Итоговый deliverable:
1) LIVE AUDIT
2) CANONICAL ANCHORS
3) OPERATIONAL SURFACES
4) SAFE CHANGES MADE
5) BLOCKED CHANGES
6) OPEN DECISIONS
7) WHAT REMAINS HUMAN-OWNED
```

````

### AUTOMATIONS_OPERATING_MODEL.md

````
# Active Holidays Automation Operating Model

## Source Of Truth Order

1. repo runtime truth: `src/`, `server/`, `shared/`, `data/db/`
2. repo process truth: `AGENTS.md`, `RUNBOOK.md`, `.codex/skills/`, `.codex/automations/`
3. product truth: Notion `Active Holidays` backbone
4. planning truth: Linear project `Active Holidays`

## Shared Memory Rules

- primary memory for each automation is `reports/automations/runs/<id>/latest.md`
- do not assume broader history if there is no prior report
- prefer deterministic helpers before open-ended analysis
- external writes stay disabled by default

## Shared Guardrails

- do not invent APIs, plugins, analytics, or backend capabilities
- no broad redesigns in automation loops
- prefer one strong improvement over ten generic ideas
- any patch must name verification steps
- if one artifact is critically missing, ask for exactly one artifact and stop

## Automation Definitions

## AH-01 · Product OS Radar

- priority: `critical`
- business goal: находить следующую лучшую product/AI-native opportunity из repo + Notion reality.
- trigger / schedule: Mon `09:15` Europe/Moscow.
- inputs: routes, screens, trust surfaces, Notion product/exec pages, previous reports.
- tools / integrations: local repo, optional Notion/Linear read.
- exact behavior: produces `current product picture`, `drift`, `AI-native opportunities`, `one highest-leverage next move`.
- memory requirements: previous Product OS radar report.
- guardrails: every proposal must map to an existing repo surface.
- artifacts produced: `reports/automations/runs/ah-product-os-radar/latest.md`.
- success criteria: 1–3 sharp product moves with rationale and verification path.
- owner / review model: product owner reviews and selects entry.

## AH-02 · Execution Brief Sync

- priority: `high`
- business goal: превращать repo/product reality в clean execution briefs and prompt stubs.
- trigger / schedule: Mon/Thu `12:00` Europe/Moscow.
- inputs: Product OS radar, AGENTS, repo structure, Notion execution docs.
- tools / integrations: local docs, optional Notion read.
- exact behavior: writes a concise next-brief artifact, prompt fragments, and execution notes for Codex/human owner; Lovable handoff is included only for approved UI-layer work and never as a dependency for domain, API, or verification tasks.
- memory requirements: last brief sync report.
- guardrails: no speculative tasks; only executable next steps.
- artifacts produced: `reports/automations/runs/ah-execution-brief-sync/latest.md`.
- success criteria: next task can start without re-briefing the repo.
- owner / review model: owner approves before external sync.

## AH-03 · Agent Memory Guard

- priority: `critical`
- business goal: continuously harden `AGENTS.md`, runbook rules, and repo execution defaults from repeated misunderstandings.
- trigger / schedule: Tue `10:30` Europe/Moscow.
- inputs: AGENTS, README, runbook, automation docs, context-surface report.
- tools / integrations: local docs, local context helper.
- exact behavior: flags stale or contradictory workflow rules and patches local docs when evidence is clear.
- memory requirements: previous Agent Memory Guard report.
- guardrails: patch rules only when there is direct repo/process evidence.
- artifacts produced: `reports/automations/runs/ah-agent-memory-guard/latest.md`.
- success criteria: fewer repeated operator/executor misunderstandings and cleaner local rules.
- owner / review model: owner reviews wording changes after patch.

## AH-04 · Skill Dedupe + Gap Harvester

- priority: `critical`
- business goal: keep repo-local skill surface clean, non-duplicated, and increasingly useful.
- trigger / schedule: Tue `11:10` Europe/Moscow.
- inputs: `.codex/skills`, global shared skills, recent report patterns, skill-dedupe helper.
- tools / integrations: local files only.
- exact behavior: removes or flags duplicate skill shadows and identifies recurring prompt patterns that deserve repo-local skill extraction.
- memory requirements: previous skill report and current skill registry state.
- guardrails: no new skill unless the pattern is recurring and repo-specific.
- artifacts produced: `reports/automations/runs/ah-skill-dedupe-gap-harvester/latest.md`.
- success criteria: zero byte-identical duplicates; clear gap list for future skill creation.
- owner / review model: engineering owner approves new skill creation/removal.

## AH-05 · Plugin + MCP Surface Watch

- priority: `medium`
- business goal: keep the context surface (`.codex`, optional `.cursor`, MCP/plugin touchpoints) intentional and useful.
- trigger / schedule: Wed `10:00` Europe/Moscow.
- inputs: context files, optional `.cursor/mcp.json`, automation registry, skill registry, context helper.
- tools / integrations: local files only.
- exact behavior: flags missing or stale context surfaces, redundant layers, and MCP/plugin opportunities that would reduce execution friction.
- memory requirements: previous surface watch report.
- guardrails: do not invent unsupported plugin formats or fake MCP configs.
- artifacts produced: `reports/automations/runs/ah-plugin-mcp-surface-watch/latest.md`.
- success criteria: repo context stays small, explicit, and high-value.
- owner / review model: owner reviews any config addition.

## AH-06 · UI Premium Polish Pass

- priority: `critical`
- business goal: push one real screen per run toward premium, mobile-first, AI-native quality.
- trigger / schedule: Tue/Thu `16:00` Europe/Moscow.
- inputs: routed screens, theme, motion primitives, product contract, screen-surface helper.
- tools / integrations: local code only.
- exact behavior: selects the highest-leverage screen, audits hierarchy/motion/AI-native interaction opportunities, and prepares a small safe polish patch or exact task.
- memory requirements: previous UI polish report.
- guardrails: no broad redesigns; preserve existing architecture and Russian copy requirements.
- artifacts produced: `reports/automations/runs/ah-ui-premium-polish-pass/latest.md`.
- success criteria: one clearly better screen or one sharply defined premium polish task.
- owner / review model: product/design review for visual patches.

## AH-07 · Design Drift vs Contract

- priority: `critical`
- business goal: catch UI/flow drift against the current product contract and screen map.
- trigger / schedule: Wed `15:30` Europe/Moscow.
- inputs: router, screen tree, screen-surface helper, Notion product docs.
- tools / integrations: local repo, optional Notion read.
- exact behavior: compares implemented screens, AI moments, state coverage, and CTA clarity against the contract and reports the top drift only.
- memory requirements: latest design drift report.
- guardrails: no redesign backlog dump; focus on the strongest drift.
- artifacts produced: `reports/automations/runs/ah-design-drift-vs-contract/latest.md`.
- success criteria: 3–5 drift findings max, each with a fix path.
- owner / review model: product owner reviews before roadmap sync.

## AH-08 · Copy + Trust Upgrade

- priority: `high`
- business goal: continuously improve Russian product copy, trust cues, and conversion clarity.
- trigger / schedule: Wed `12:30` Europe/Moscow.
- inputs: user-facing strings on landing/intake/result/trust/human-review screens plus product positioning.
- tools / integrations: local code, optional Notion read.
- exact behavior: detects weak/generic copy, unclear disclaimers, low-confidence phrasing, and proposes stronger wording with optional safe patch.
- memory requirements: previous copy/trust report and accepted phrasing decisions.
- guardrails: no hidden UX rewrite under a copy pass.
- artifacts produced: `reports/automations/runs/ah-copy-trust-upgrade/latest.md`.
- success criteria: clearer, more premium, more trustworthy wording with exact file references.
- owner / review model: product owner approves changes before bulk edits.

## AH-09 · Truth + Freshness Watch

- priority: `high`
- business goal: protect trust-critical data surfaces used by the decision engine.
- trigger / schedule: Mon/Wed/Fri `08:45` Europe/Moscow.
- inputs: `data/db/*.json`, `shared/contracts/sources.ts`, freshness helper output, related product decisions.
- tools / integrations: deterministic local helper.
- exact behavior: flags stale source checks, missing mappings, duplicate ids, risky crowdsourced dependencies, and unused truth objects.
- memory requirements: latest truth/freshness report.
- guardrails: report-first; do not mutate truth files automatically.
- artifacts produced: `reports/automations/runs/ah-truth-freshness-watch/latest.md`.
- success criteria: broken or stale truth never stays invisible.
- owner / review model: data/content owner reviews before catalog changes.

## AH-10 · Next Best Action Distiller

- priority: `high`
- business goal: compress all automation findings into one decisive weekly action brief.
- trigger / schedule: Fri `18:00` Europe/Moscow.
- inputs: latest outputs of all automations, open decisions, current product phase.
- tools / integrations: local reports, optional Notion/Linear read.
- exact behavior: outputs top tasks across product, agent/skill, UI, truth/data, and process, each with acceptance criteria and recommended executor.
- memory requirements: previous weekly distillation report.
- guardrails: no more than five top actions; no backlog flood.
- artifacts produced: `reports/automations/runs/ah-next-best-action-distiller/latest.md`.
- success criteria: owner can start the next week from one artifact instead of ten reports.
- owner / review model: owner reviews and decides order.

## Escalation Rules

- escalate if an improvement would require a new backend capability
- escalate if a change would alter product truth, provider/legal claims, or external planning truth
- escalate if a plugin/MCP proposal depends on a missing secret or unsupported format

## What Should Stay Manual For Now

- legal review on visa/residency/insurance claims
- major visual direction changes
- commercial decisions and partnerships
- external system write-back that changes planning truth

## Notion Control Tower Layer

### Canonical vs Operational

Keep Notion split into two layers:

- canonical pages:
  - `P0 · Master Doc — Vision & Boundaries`
  - `P0 · Definition of Final`
  - `P1 · UX Architecture — Flow / State / Screens`
  - `P2 · Screen Contracts for Lovable`
- operational surfaces:
  - `Execution`
  - `Open Decisions`
  - `Build Briefs`
  - `Release Gate`
  - `Automation Inbox`
  - `Opportunities`
  - `Review Findings & Learnings`

Rule:

- canonical pages should receive only `Suggested Update`, `Drift Note`, or `Decision Required` unless a human explicitly approves deeper edits
- operational surfaces are the safe destination for automation-owned truth

### Repo-Owned Schema Contract

Repo-owned Notion targeting is machine-first:

- canonical anchors live in `.codex/automations/notion-surface-lock.json` as page bindings
- operational databases live in the same lock file as `targetId` / `dataSourceId` bindings
- title or name may be used only for read-only discovery before lock
- once an operational surface has a locked `targetId` or `dataSourceId`, all write or update resolution must use the locked id plus `syncKey`
- after lock, `recordTitle` is display-only and never participates in target resolution
- any write or update attempt through title or name after lock must fail as `blocked_by_target_binding`
- this rule now applies to every operational DB surface, not only `Execution`

If the live workspace already contains an equivalent surface under a different name or schema:

- do not rename, merge, or repoint it automatically
- emit `Decision Required`, `blocked_by_surface_drift`, or `blocked_by_target_binding`
- keep the repo contract unchanged until a human approves the migration

Required operational surfaces and properties:

| Surface | Required properties |
| --- | --- |
| `Execution` | `Record`, `Sync Key`, `Area`, `Status`, `Source`, `Confidence`, `Last Verified At`, `Action Needed`, `Evidence` |
| `Open Decisions` | `Record`, `Sync Key`, `Layer`, `Decision Status`, `Recommendation`, `Why Now`, `Urgency`, `Owner`, `Source`, `Confidence`, `Last Verified At`, `Action Needed`, `Evidence` |
| `Build Briefs` | `Record`, `Sync Key`, `Scope`, `Ready`, `Inputs Verified`, `Acceptance Criteria`, `Verify`, `Prompt Block`, `Source` |
| `Release Gate` | `Record`, `Sync Key`, `Surface`, `Gate`, `Status`, `Blocking Reason`, `Source`, `Confidence`, `Last Verified At`, `Evidence` |
| `Automation Inbox` | `Record`, `Sync Key`, `Packet Type`, `Severity`, `Status`, `Action Needed`, `Routed To`, `Source`, `Confidence`, `Last Verified At` |
| `Opportunities` | `Record`, `Sync Key`, `Idea`, `Why Now`, `Impact`, `Complexity`, `Source`, `Confidence`, `Status` |
| `Review Findings & Learnings` | `Record`, `Sync Key`, `Layer`, `Severity`, `Fix Path`, `Source`, `Confidence`, `Status`, `Evidence` |

Allowed schema evolution:

- additive property creation that preserves the required properties
- views, filters, and relations that do not change the contract-owned names or required properties

Disallowed without explicit human approval:

- renaming any of the seven operational surfaces
- removing or renaming required properties
- splitting one contract surface into multiple databases
- merging two contract surfaces into one database

### Deterministic Write Contract

Runtime state layers:

- tracked deterministic state:
  - `.codex/automations/notion-surface-lock.json`
  - `.codex/automations/check-waivers.json`
  - `reports/automations/state/runtime-maturity.json`
  - `reports/automations/state/notion-writeback-promotion.json`
  - `reports/automations/state/open-decisions-legacy-bridge.json`
  - `reports/automations/state/manual-approvals.json`
  - `reports/automations/state/gate-eligibility-snapshot.json`
- volatile runtime-observed state:
  - `reports/automations/state/runtime-observed/*.json`
  - `reports/automations/state/execution-runs/*.json`
- synthesis, director, and executor eligibility must read only the deterministic projection in `reports/automations/state/gate-eligibility-snapshot.json`
- volatile runtime-observed state may inform the projection but must never authorize writeback or executor actions directly
- projection inputs must be content-owned: reports use frontmatter or dated filenames for timestamps, observed JSON uses explicit `observedAt` / `lastVerifiedAt`, and filesystem `mtime` is never an eligibility input
- `reports/automations/state/notion-writeback-promotion.json` may not move to `writeback_enabled` unless the current lock, contract, diff, and manual approval still match
- `reports/automations/state/manual-approvals.json` stays addressable and fail-closed by exact tuple:
  - `surface`
  - `targetId`
  - `dataSourceId`
  - `contractHash` or `contractVersion`
  - `diffHash`
  - `approvedAt`
  - `approvedBy`
  - `expiresAt`

Default mode:

- all Notion-facing automation stays `report-first`
- live writeback stays disabled until the deterministic projection shows matching audit, target binding, promotion, approval, freshness, and dry-run diff state

Notion-facing packet envelope:

- any report that is meant for future Notion sync must carry:
  - `identity = syncKey`
  - `recordTitle`
  - `syncKey`
  - `notionSurface`
  - `writeMode`
  - `sourceReportId`
  - `packetKey`
  - `source`
  - `confidence`
  - `lastVerifiedAt`
  - `actionNeeded`
  - `packetLifecycle`
  - `diffHash`
  - `dedupeKey`
  - `supersedesPacketKey`
  - `supersededByPacketKey`
  - `supersessionReason`
- target-specific lifecycle fields:
  - `Open Decisions`: `decisionStatus`, `whyNow`, `urgency`, `owner`
  - `Automation Inbox`: `status`
- `recordTitle` is display-only; operational identity is `syncKey`
- supersession is resolved by `surface + syncKey`; conflicting current packets for the same `syncKey` block writeback/executor as `blocked_by_multiple_current_packets_for_sync_key`
- `dedupeKey` is deterministic: `executor:<surface>:<syncKey>`
- if a producer cannot emit this envelope, the packet is not eligible for live write-back and must stay report-only

Deterministic `syncKey` formats:

- `Execution`: `execution:<area-slug>:<step-slug>`
- `Open Decisions`: `decision:<layer-slug>:<decision-slug>`
- `Build Briefs`: `brief:<scope-slug>:<phase-slug>`
- `Release Gate`: `gate:<surface-slug>:<gate-slug>`
- `Automation Inbox`: `inbox:<packet-type-slug>:<subject-slug>`
- `Opportunities`: `opportunity:<surface-slug>:<idea-slug>`
- `Review Findings & Learnings`: `learning:<layer-slug>:<pattern-slug>`

Lifecycle values:

- `Open Decisions.Decision Status`: `open`, `in_review`, `decided`, `blocked`
- `Automation Inbox.Status`: `open`, `in_review`, `blocked`, `resolved`

Write modes by target:

- `Execution`: `UPSERT_RECORD_BY_SYNC_KEY`
- `Open Decisions`: `UPSERT_RECORD_BY_SYNC_KEY`
- `Build Briefs`: `UPSERT_RECORD_BY_SYNC_KEY`
- `Release Gate`: `UPSERT_RECORD_BY_SYNC_KEY`
- `Automation Inbox`: `UPSERT_UNRESOLVED_BY_SYNC_KEY`
- `Opportunities`: `UPSERT_RECORD_BY_SYNC_KEY`
- `Review Findings & Learnings`: `UPSERT_RECORD_BY_SYNC_KEY`
- canonical pages: `UPDATE_NOTE_BLOCK_BY_SYNC_KEY` only, with note kinds `Suggested Update`, `Drift Note`, or `Decision Required`

Blocked conditions:

- schema mismatch between repo contract and live Notion
- missing required property or ambiguous surface mapping
- missing or mismatched locked `targetId` / `dataSourceId`
- manual approval that does not match current surface, target binding, contract hash/version, and diff hash
- any promotion state that no longer matches the current lock / contract / diff projection
- title-based or name-based write intent after lock
- no safe target block on a canonical page
- no deterministic `syncKey` can be derived from the source packet

### New Notion-Facing Automations

## AH-11 · Open Decisions Curator

- priority: `critical`
- business goal: capture real repo-vs-Notion-vs-report contradictions as clean decision records.
- trigger / schedule: Mon/Wed/Fri `10:00` Europe/Moscow.
- inputs: latest automation reports, execution drift, release blockers, canonical docs, `reports/automations/state/gate-eligibility-snapshot.json`.
- tools / integrations: local reports, read-only `.codex/automations/notion-surface-lock.json`.
- exact behavior: outputs at most three decisions with recommendation, urgency, deterministic `syncKey`, explicit `packetLifecycle`, and blocked target state when the live lock or schema is not eligible.
- artifacts produced: `reports/automations/runs/ah-open-decisions-curator/latest.md`.
- success criteria: blocking ambiguity becomes explicit and actionable instead of living in chat history.

## AH-12 · Release Gate Sync

- priority: `critical`
- business goal: keep release truth evidence-backed and visible inside the project operating layer.
- trigger / schedule: Mon-Fri `13:30` Europe/Moscow.
- inputs: build/typecheck/test/review/automation signals plus `reports/automations/state/gate-eligibility-snapshot.json`.
- tools / integrations: local repo checks, read-only `.codex/automations/notion-surface-lock.json`.
- exact behavior: produces a gate snapshot split into `green`, `blocking`, and `manual verify needed`, plus deterministic `Release Gate` packets with `syncKey`, `notionSurface`, `writeMode`, `packetLifecycle`, and evidence fields without reading volatile eligibility directly.
- artifacts produced: `reports/automations/runs/ah-release-gate-sync/latest.md`.
- success criteria: the project can answer “what is actually ready?” without guesswork.

## AH-13 · Review Learning Distiller

- priority: `high`
- business goal: convert repeated findings into system improvements instead of isolated fixes.
- trigger / schedule: Tue/Fri `16:00` Europe/Moscow.
- inputs: review findings, automation reports, release-gate friction, `reports/automations/state/gate-eligibility-snapshot.json`.
- tools / integrations: local reports, read-only `.codex/automations/notion-surface-lock.json`.
- exact behavior: identifies recurring patterns and routes them to rules, checklists, skills, or tests, while emitting deterministic learning packets or explicit reroutes to `Open Decisions` when the pattern is really a pending decision.
- artifacts produced: `reports/automations/runs/ah-review-learning-distiller/latest.md`.
- success criteria: repeated bugs and review comments start shrinking over time.

## AH-14 · Notion Sync Director

- priority: `critical`
- business goal: safely update Notion operational truth from evidence packets without damaging canonical docs.
- trigger / schedule: Mon-Fri `19:00` Europe/Moscow.
- inputs: latest reports across decisions, release truth, briefs, drift, opportunities, and learnings plus `.codex/automations/notion-surface-lock.json`, `reports/automations/state/notion-writeback-promotion.json`, `reports/automations/state/manual-approvals.json`, and `reports/automations/state/gate-eligibility-snapshot.json`.
- tools / integrations: Notion write path when available.
- exact behavior: stays report-first by default, runs `dry_run` unless the deterministic gate projection says live write is eligible, and updates operational surfaces only through locked ids + `syncKey`, never by title or name.
- artifacts produced: `reports/automations/runs/ah-notion-sync-director/latest.md`.
- success criteria: Notion stays current while every write remains attributable and reversible.

### External Write Policy

- external writes remain disabled by default for all automations except the explicitly enabled director pattern
- if Notion is unavailable, the automation must emit a blocked packet instead of pretending the sync succeeded
- no other automation should write directly to canonical pages
- even `ah-notion-sync-director` must stay `report-first` and `dry_run` until audit, promotion, diff, and approval all match in `reports/automations/state/gate-eligibility-snapshot.json`

### Activation Order

The Notion control tower assumes feeder and synthesis reports already exist.

Prerequisites before enabling the Notion pack:

1. `ah-product-os-radar`
2. `ah-execution-brief-sync`
3. `ah-design-drift-vs-contract`
4. `ah-truth-freshness-watch`

Then enable:

1. `ah-open-decisions-curator`
2. `ah-release-gate-sync`
3. `ah-review-learning-distiller`
4. `ah-notion-sync-director` in `dry_run`
5. live write-back only after audit confirmation, deterministic diff, matching manual approval, and `writeback_enabled`

````

### AUTOMATIONS_ROADMAP.md

````
# Active Holidays Automation Roadmap

## Suite v1

Repo-local automations are grouped into six loops:

1. `Product OS`
2. `Agent + Skill OS`
3. `Premium UI OS`
4. `Truth + Trust OS`
5. `Execution Distillation OS`
6. `Notion Control Tower OS`

## Priority Ranking

| Priority | Automation | Why now | Cadence |
| --- | --- | --- | --- |
| critical | `ah-agent-memory-guard` | keeps AGENTS/runbook honest and reduces repeated misunderstandings | Tue 10:30 |
| critical | `ah-skill-dedupe-gap-harvester` | keeps repo-local skill surface clean and evolving | Tue 11:10 |
| critical | `ah-product-os-radar` | continuously finds the next best product / AI-native move | Mon 09:15 |
| critical | `ah-open-decisions-curator` | turns repo-vs-Notion drift into explicit decisions instead of hidden ambiguity | Mon/Wed/Fri 10:00 |
| critical | `ah-release-gate-sync` | keeps release truth evidence-backed and ready for operational sync | Mon-Fri 13:30 |
| critical | `ah-ui-premium-polish-pass` | upgrades one real screen toward premium quality each cycle | Tue/Thu 16:00 |
| critical | `ah-design-drift-vs-contract` | catches product/UI drift against the actual contract | Wed 15:30 |
| critical | `ah-notion-sync-director` | sync director for Notion operational truth; stays report-first until schema contract is confirmed | Mon-Fri 19:00 |
| high | `ah-copy-trust-upgrade` | improves clarity, conversion, and trust tone | Wed 12:30 |
| high | `ah-truth-freshness-watch` | protects decision trust by watching source freshness and integrity | Mon/Wed/Fri 08:45 |
| high | `ah-next-best-action-distiller` | compresses all findings into one decisive weekly brief | Fri 18:00 |
| high | `ah-execution-brief-sync` | keeps prompt/brief/process artifacts aligned with repo reality | Mon/Thu 12:00 |
| high | `ah-review-learning-distiller` | converts repeated findings into reusable system improvements | Tue/Fri 16:00 |
| medium | `ah-plugin-mcp-surface-watch` | keeps `.codex`, optional `.cursor`, and plugin/MCP surface intentional | Wed 10:00 |

## Quick Wins Implemented Now

- repo-local automation definitions
- repo-local install/sync flow into `$CODEX_HOME`
- validation script for automation metadata
- deterministic helpers for:
  - truth freshness
  - screen surface
  - skill dedupe
  - context surface
- operational docs and runbook

## Deeper Iterations After v1

### Phase 2

- harden the already-implemented Notion control tower pack:
  - `ah-open-decisions-curator` -> implemented, paused
  - `ah-release-gate-sync` -> implemented, paused
  - `ah-review-learning-distiller` -> implemented, paused
  - `ah-notion-sync-director` -> implemented, paused, report-first
- keep `ah-notion-sync-director` in report-first mode until the repo-owned Notion schema contract is verified manually
- formalize the split between canonical pages and operational databases in Notion
- add one post-audit Notion AI cleanup pass using `AUTOMATIONS_NOTION_AI_HANDOFF.md`
- auto-extract new repo-local skills from repeated winning prompt shapes
- allow one-screen premium polish patches under tighter review rules
- enable richer AI opportunity mining from product docs and screen artifacts

### Phase 3

- enable live Notion write-back only after schema contract confirmation and deterministic sync-key validation
- richer Notion write-back after the director pattern proves safe
- add `ah-draft-pr-executor` only after the gate snapshot marks executor eligibility
- optional Linear issue write-back after stable severity thresholds exist
- richer benchmark-driven visual automation once screenshot/reference workflow is formalized

## Top 5 Highest-Impact Automations For The Current Control Tower Phase

1. `ah-open-decisions-curator`
2. `ah-release-gate-sync`
3. `ah-execution-brief-sync`
4. `ah-notion-sync-director` in `report-first` mode
5. `ah-product-os-radar`

## Stop Conditions

- stop if an improvement would require inventing a new backend contract
- stop if the automation cannot prove the source of truth it depends on
- stop if the output is aesthetic churn rather than real product gain

## Review Checkpoints

- UI polish patches: human review
- AGENTS / skill rule changes: owner review
- trust / data changes: human approval before truth mutation
- direct Notion writes: `ah-notion-sync-director` only, and only after manual schema-contract confirmation
- external write-back beyond Notion: manual until explicitly enabled

## What Should Stay Manual For Now

- legal review on visa/residency/insurance claims
- major visual direction changes
- commercial and partnership decisions
- external planning truth changes

````

### README.md

````
# Active Holidays Foundation

Phase 3 decision skeleton for a new `Active Holidays` codebase.

## Stack

- React 18
- TypeScript strict
- Vite
- React Router v6
- TailwindCSS
- Framer Motion
- Zustand
- Express
- Vitest

## Scripts

- `npm run dev` — client
- `npm run server` — API
- `npm run dev:all` — client + API
- `npm run build` — client build
- `npm run test` — unit tests
- `npm run typecheck` — TypeScript check
- `npm run verify:engine` — deterministic scenario drift gate
- `npm run autonomous:next` — select the current safe autonomous task
- `npm run autonomous:execute` — prepare or run the local Stage A executor
- `npm run autonomous:verify` — autonomous runtime readiness gate
- `npm run skills:verify` — repo-local Codex skill system check
- `npm run skills:evaluate-agents` — fixture-based agent and mode coverage evaluation
- `npm run skills:autopilot` — full execution packet with confidence, lanes, and agent packs
- `npm run skills:telemetry:report` — summarize recorded skill-mode telemetry

## Environment

- Copy `.env.example` when you need to override the API port locally.
- Human review state is persisted locally in `output/server-state/human-reviews.json`.
- Override the file path with `ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE` when you need isolated runtime storage.
- Protect internal human-review transitions with `ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN` and send it through the `x-active-holidays-internal-token` header from trusted server-side callers only.

## Current Scope

This repository currently contains:

- bootable client shell
- route registration for all primary screens
- first deterministic intake -> result flow
- structured result with trust/documents sections
- persisted human-review lifecycle with restart-safe local server storage
- bootable Express API with `/api/health`
- shared contract baseline in `shared/contracts`
- typed local repository for a small decision session history
- minimal Zustand app state for the active flow workspace
- theme tokens and base Tailwind setup
- strict TS/Vite/Vitest baseline

## Repo-Local Codex Skill System

Repo-local skills now form a thin operating layer around this repo instead of a single override.

Entry points:

- `.codex/skills/index.md`
- `.codex/skills/bundles.md`
- `.codex/skills/task-templates.md`
- `.codex/skills/modes.md`
- `.codex/skills/_shared/active-holidays/`
- `.codex/skills/README.md`

Key repo-local bundles:

- domain AI/trust/result-flow skills
- engineering guardrails and hygiene skills
- `plugin-surface-governance` for plugin and MCP boundary work
- `frontend-premium-ui` as the repo-local premium UI executor
- `multi-lens-review` as the mandatory final self-check
- `release-readiness` as the final repo gate
- primary-mode routing via `.codex/skills/modes.md`
- bundle selection via `Core` / `Optional` / `Finish`
- task templates for AI boundary, schema, result flow, premium UI, fallback, regression, plugin or MCP governance, and final review work

Routing model:

- auto-detect with `npm run skills:detect-mode`, `npm run skills:start`, or `npm run skills:autopilot`
- accept exactly one primary mode per task
- use that mode to choose one bundle and one template
- add secondary skills only inside that chosen mode
- treat `skill-system-governance` as the primary mode for repo-local docs, router, skills, automations, and operating-surface maintenance
- treat `plugin-surface` as separate only when plugin or MCP files are the dominant surface

Global curated skills stay in `~/.codex/skills` and are used as companions rather than duplicated shadows.

Repo-local plugin and MCP surface is governance-first:

- prefer runtime plugins or existing skills before adding local plugin scaffolds
- use `.codex/skills/_shared/active-holidays/plugin-surface.md` for the decision boundary
- treat local plugin manifests and marketplace state as optional but real repo surface once introduced

Mode auto-detection is available via:

- `npm run skills:detect-mode -- --prompt "<request>"`
- `npm run skills:detect-mode -- --files "<csv paths>"`
- `npm run skills:evaluate-agents`

Executable mode runner:

- `npm run skills:start -- --prompt "<request>"`
- `npm run skills:start -- --files "<csv paths>"`

Autopilot runner:

- `npm run skills:autopilot -- --prompt "<request>"`
- `npm run skills:autopilot -- --files "<csv paths>"`
- add `--telemetry` or `--telemetry-file reports/automations/state/runtime-observed/custom-skill-telemetry.jsonl` when you want runtime telemetry written to disk

## Skill Autopilot

`skills:autopilot` is the fastest safe entrypoint when you want the system to do more than pick a mode.

It returns:

- primary mode, bundle, and template
- routing confidence with score and gap to the next candidate
- execution lane such as `manual-routing`, `blocked-png`, `review-lane`, `fast-lane`, or `standard-lane`
- adaptive `recommendedAgentPack` for the current task surface
- canonical `multiAgentPack` for the selected mode
- `executionPlan`, verify commands, and first steps
- optional telemetry summary plus a richer `telemetryReport`

Telemetry usage:

- set `SKILL_MODE_TELEMETRY=1` to record detect/start/autopilot runs
- optionally set `SKILL_MODE_TELEMETRY_FILE` to override the default log path
- run `npm run skills:telemetry:report` to inspect the current telemetry summary
- default telemetry now writes into gitignored control-tower runtime-observed state

## Repo-Local Codex Automations

The automation suite for this repository lives in `.codex/automations/`.

Key entrypoints:

- `AUTOMATIONS_AUDIT.md`
- `AUTOMATIONS_ROADMAP.md`
- `AUTOMATIONS_OPERATING_MODEL.md`
- `RUNBOOK.md`
- `npm run autonomous:next`
- `npm run autonomous:execute`
- `npm run autonomous:verify`
- `npm run automations:verify`
- `npm run automations:sync -- --dry-run`

## Architecture Guardrails

- `src/` is browser-facing application code.
- `server/` is server-only code and must never be imported into client modules.
- `shared/contracts/` is the stable cross-layer surface for small typed DTOs and schemas.
- Component-local state owns the intake draft until submit.
- Zustand owns only the active submitted workspace and hydration status.
- `result`, `documents`, and `trust` consume derived session state rather than raw persistence data.

## Verification Baseline

- run `npm run typecheck`, `npm run test`, and `npm run build` before closing substantial work
- run `npm run verify:engine` for engine/rule/result-contract changes
- run `npm run skills:verify` plus the existing Codex checks after changing `.codex/skills`
- run `npm run autonomous:verify` after changing `.autonomous/*`, `scripts/autonomous/*`, or readiness workflow gates

````

### RUNBOOK.md

````
# Active Holidays Automation Runbook

## What This Repo Now Contains

- repo-local automation definitions: `.codex/automations/`
- deterministic helper scripts for:
  - truth / freshness
  - screen surface
  - flow instrumentation
  - skill dedupe
  - context surface
- install/sync and verification scripts: `scripts/codex/`
- runtime report contract: `reports/automations/`

## Prerequisites

- run from `/Users/user/Projects/active-holidays-foundation`
- Node / npm available
- existing Codex home available at `${CODEX_HOME:-$HOME/.codex}`

## Verify Before Installing

```bash
npm run automations:verify
npm run automations:check:all
npm run skills:verify
npm run autonomous:verify
npm run yepcode:orchestrator:test
npm run yepcode:orchestrator:dry-run
```

## Autonomous Stage A

Inspect the current safe task selection:

```bash
npm run autonomous:next
```

Prepare an executor packet without mutating git. This is still a preflight gate and expects clean tracked state:

```bash
npm run autonomous:execute -- --json
```

Create the local executor branch and run the baseline verification stack:

```bash
npm run autonomous:execute -- --write
```

## Dry-Run Sync Into Codex Home

```bash
npm run automations:sync -- --dry-run
```

## Install / Update The Suite

```bash
npm run automations:sync
```

Optional narrow sync:

```bash
npm run automations:sync -- --only=ah-product-os-radar,ah-ui-premium-polish-pass
```

If you need a destructive reinstall that also resets installed `status`, use:

```bash
npm run automations:sync -- --force-reset-installed-state
```

## Activation Model

- repo defaults are intentionally `PAUSED`
- this keeps the suite safe until the owner chooses which loops go live first

Recommended first activation order:

1. `ah-agent-memory-guard`
2. `ah-skill-dedupe-gap-harvester`
3. `ah-product-os-radar`
4. `ah-ui-premium-polish-pass`
5. `ah-design-drift-vs-contract`

Because the local CLI does not expose a stable automation-status command during this audit, activation should be done in the Codex automation UI or by editing the copied `automation.toml` files in `${CODEX_HOME:-$HOME/.codex}/automations/` using the live status value supported by that Codex build. `automations:sync` now preserves the installed `status` field by default; only `--force-reset-installed-state` resets it.

## How To Disable

- safest path: set the installed automation back to `PAUSED`
- or remove the specific automation directory from `${CODEX_HOME:-$HOME/.codex}/automations/`

## Runtime Outputs

- dated runs belong in `reports/automations/runs/<automation-id>/`
- current pointer belongs in `reports/automations/runs/<automation-id>/latest.md`
- tracked deterministic state belongs in:
  - `.codex/automations/notion-surface-lock.json`
  - `.codex/automations/check-waivers.json`
  - `reports/automations/state/runtime-maturity.json`
  - `reports/automations/state/notion-writeback-promotion.json`
  - `reports/automations/state/open-decisions-legacy-bridge.json`
  - `reports/automations/state/manual-approvals.json`
  - `reports/automations/state/gate-eligibility-snapshot.json`
- volatile runtime-observed state belongs in:
  - `reports/automations/state/runtime-observed/*.json`
  - `reports/automations/state/execution-runs/*.json`

Tracked singleton state is part of the repo-owned control-tower contract.
Only volatile runtime-observed state stays gitignored.
Example outputs stay committed next to each automation definition as `sample-output.md`.

## Deterministic Helpers

### Truth freshness and integrity

```bash
npm run automations:check:truth
```

### Screen surface / premium UI baseline

```bash
npm run automations:check:screens
```

### Flow instrumentation

```bash
npm run automations:check:flow
```

### Repo-local skill duplication

```bash
npm run automations:check:skills
```

### Context surface

```bash
npm run automations:check:context
```

## How To Extend The Suite

1. Add a new folder in `.codex/automations/`.
2. Add `automation.toml`.
3. Add `sample-output.md`.
4. Update:
   - `AUTOMATIONS_AUDIT.md`
   - `AUTOMATIONS_ROADMAP.md`
   - `AUTOMATIONS_OPERATING_MODEL.md`
5. Run:

```bash
npm run automations:verify
npm run automations:check:all
npm run skills:verify
```

## Safe Defaults

- default status is paused
- external write-back is disabled
- truth/process automations report first, then human approves changes
- premium UI automations stay focused on one strong improvement at a time
- live Notion writeback stays fail-closed unless lock, contract hash, diff hash, manual approval, and promotion state all match

````
