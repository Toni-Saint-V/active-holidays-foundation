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
