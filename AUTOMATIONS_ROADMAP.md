# Active Holidays Automation Roadmap

## Suite v1

Repo-local automations are grouped into five loops:

1. `Product OS`
2. `Agent + Skill OS`
3. `Premium UI OS`
4. `Truth + Trust OS`
5. `Execution Distillation OS`

## Priority Ranking

| Priority | Automation | Why now | Cadence |
| --- | --- | --- | --- |
| critical | `ah-agent-memory-guard` | keeps AGENTS/runbook honest and reduces repeated misunderstandings | Tue 10:30 |
| critical | `ah-skill-dedupe-gap-harvester` | keeps repo-local skill surface clean and evolving | Tue 11:10 |
| critical | `ah-product-os-radar` | continuously finds the next best product / AI-native move | Mon 09:15 |
| critical | `ah-ui-premium-polish-pass` | upgrades one real screen toward premium quality each cycle | Tue/Thu 16:00 |
| critical | `ah-design-drift-vs-contract` | catches product/UI drift against the actual contract | Wed 15:30 |
| high | `ah-copy-trust-upgrade` | improves clarity, conversion, and trust tone | Wed 12:30 |
| high | `ah-truth-freshness-watch` | protects decision trust by watching source freshness and integrity | Mon/Wed/Fri 08:45 |
| high | `ah-next-best-action-distiller` | compresses all findings into one decisive weekly brief | Fri 18:00 |
| high | `ah-execution-brief-sync` | keeps prompt/brief/process artifacts aligned with repo reality | Mon/Thu 12:00 |
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

- auto-extract new repo-local skills from repeated winning prompt shapes
- allow one-screen premium polish patches under tighter review rules
- enable richer AI opportunity mining from product docs and screen artifacts

### Phase 3

- optional Notion write-back after owner defines safe mutation rules
- optional Linear issue write-back after stable severity thresholds exist
- richer benchmark-driven visual automation once screenshot/reference workflow is formalized

## Top 5 Highest-Impact Automations

1. `ah-agent-memory-guard`
2. `ah-skill-dedupe-gap-harvester`
3. `ah-product-os-radar`
4. `ah-ui-premium-polish-pass`
5. `ah-design-drift-vs-contract`

## Stop Conditions

- stop if an improvement would require inventing a new backend contract
- stop if the automation cannot prove the source of truth it depends on
- stop if the output is aesthetic churn rather than real product gain

## Review Checkpoints

- UI polish patches: human review
- AGENTS / skill rule changes: owner review
- trust / data changes: human approval before truth mutation
- external write-back: manual until explicitly enabled

## What Should Stay Manual For Now

- legal review on visa/residency/insurance claims
- major visual direction changes
- commercial and partnership decisions
- external planning truth changes
