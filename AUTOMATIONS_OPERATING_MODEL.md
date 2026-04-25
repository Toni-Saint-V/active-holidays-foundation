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
