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
- exact behavior: writes a concise next-brief artifact, prompt fragments, and execution notes for Codex/Lovable/human owner.
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
