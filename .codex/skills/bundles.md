# Active Holidays Default Bundles

Use this file after [index.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/index.md) when the task family is known and you need a lean, repeatable skill stack.

## Bundle Contract

- Resolve one primary mode first in `.codex/skills/modes.md`.
- Load the single bundle attached to that mode.
- `Optional` skills widen the same mode; they do not create a second mode.
- `Finish` is the closing stack for the selected mode.
- If the task is mainly repo-local docs, router, modes, bundles, templates, or automation guidance, the correct primary bundle is `Skill-system governance`.
- Escalate from `Skill-system governance` to `Plugin / MCP surface governance` only when plugin or MCP files are the dominant changed surface.

## Bundle Rules

- Load `protocol-structured-json-and-png-gate` before every non-trivial task.
- Start with the `Core` bundle only. Add `Optional` skills only when the touched surface truly needs them.
- If visible Russian copy changes, add `russian-trust-safe-copy`.
- If the task is non-trivial, finish with `qa-self-review`, `multi-lens-review`, and `release-readiness`.
- If the task is a review, PR gate, or merge-readiness check, add `bank-grade-review`.
- If the task touches result, trust, compare, recommendation, or `human-review`, add `trust-boundary-regression`.
- If the task touches `.cursor/mcp.json`, `.agents/plugins/marketplace.json`, or `plugins/*/.codex-plugin/plugin.json`, add `plugin-surface-governance`.
- If the task touches UI, the bundle does not authorize code changes until a PNG preview is shown and approved.

## Task Families

### Skill-system governance

This is the bundle for maintaining the existing router and repo-local Codex operating surface.

Core:

- `repo-hygiene-and-structure`
- `architecture-guardrails`
- `qa-self-review`

Optional:

- `plugin-surface-governance` when the `.codex` task includes plugin or MCP boundary work
- `docs-and-handoff` when the output is mainly routing guidance or operator docs
- `release-readiness` when validator or repo checks changed

Finish:

- `multi-lens-review`
- `release-readiness`

### AI recommendation boundary fix

Core:

- `ai-boundary-and-trust`
- `offer-semantics`
- `ai-cache-and-state`
- `trust-boundary-regression`
- `golden-evals`

Optional:

- `fallback-safe-behavior` when degraded-state UX or retry logic changes
- `prompt-hardening` when prompt text or model payload changes
- `ai-observability` when request-path visibility or source flags change
- `minimal-tool-calling` only when model/tool behavior itself changes
- `result-flow-integration` only when the result-loop UI contract changes
- `russian-trust-safe-copy` when disclaimers or recommendation copy changes

Finish:

- `qa-self-review`
- `multi-lens-review`
- `release-readiness`

### Structured contract or schema change

Core:

- `architecture-guardrails`
- `golden-evals`
- `production-hardening`

Optional:

- `bugfix-root-cause` when the schema change is driven by an actual defect
- `ai-boundary-and-trust` when the contract belongs to recommendation surfaces
- `result-flow-integration` when the change alters result-loop behavior
- `docs-and-handoff` when callers, rollout assumptions, or follow-up work must be stated explicitly

Finish:

- `qa-self-review`
- `multi-lens-review`
- `release-readiness`

### Result flow integration change

Core:

- `result-flow-integration`
- `product-ux-flow-review`
- `russian-trust-safe-copy`
- `trust-boundary-regression`
- `a11y-trust-usability`

Optional:

- `frontend-premium-ui` when hierarchy, CTA, or visual composition changes
- `design-system-enforcer` when shared visual primitives or spacing change
- `architecture-guardrails` when state, route params, or contracts change
- `offer-semantics` when compare or recommendation semantics change

Finish:

- `qa-self-review`
- `multi-lens-review`
- `release-readiness`

### Premium UI or UX refinement

Core:

- `protocol-structured-json-and-png-gate`
- `frontend-premium-ui`
- `design-system-enforcer`
- `product-ux-flow-review`
- `russian-trust-safe-copy`
- `a11y-trust-usability`

Optional:

- global `premium-png-screen-design` before implementation approval
- `trust-boundary-regression` for result, trust, recommendation, or human-review surfaces
- `performance-sanity` when motion, dense layouts, or large component trees are touched
- `playwright-e2e-visual-qa` when browser verification or screenshots are realistic

Finish:

- `qa-self-review`
- `multi-lens-review`
- `release-readiness`

### Reliability or fallback hardening

Core:

- `fallback-safe-behavior`
- `ai-cache-and-state`
- `production-hardening`
- `trust-boundary-regression`
- `bugfix-root-cause`

Optional:

- `ai-boundary-and-trust` when recommendation ownership changes
- `result-flow-integration` when the degraded state changes visible result-loop UX
- `golden-evals` when deterministic semantics or compare output may drift
- `docs-and-handoff` when the degraded path has explicit operational caveats

Finish:

- `qa-self-review`
- `multi-lens-review`
- `release-readiness`

### Regression-test expansion

Core:

- `golden-evals`
- `qa-self-review`
- `release-readiness`

Optional:

- `architecture-guardrails` when the missing coverage belongs at a contract boundary
- `trust-boundary-regression` when the risk is trust-critical or recommendation-related
- `playwright-e2e-visual-qa` when browser verification is the real missing proof
- `docs-and-handoff` when the new coverage closes a known release gap

Finish:

- `multi-lens-review`
- `release-readiness`

### Plugin / MCP surface governance

Use this bundle only when plugin or MCP surface is the actual dominant problem, not merely mentioned in repo docs.

Core:

- `plugin-surface-governance`
- `repo-hygiene-and-structure`
- `architecture-guardrails`

Optional:

- global `plugin-creator` when a real repo-local plugin scaffold is justified
- `docs-and-handoff` when the main output is operator guidance or environment notes
- `production-hardening` when plugin or MCP state affects repeated workflows or automation safety

Finish:

- `qa-self-review`
- `multi-lens-review`
- `release-readiness`

### Final multi-lens review of a moderate change

Core:

- `qa-self-review`
- `multi-lens-review`
- `release-readiness`

Optional:

- `bank-grade-review` for review or merge gates
- `trust-boundary-regression` for result/trust/AI/user-facing diffs
- `performance-sanity` for UI, motion, or render-heavy changes

Output:

- findings ordered by risk
- exact proof that was run
- explicit remaining gaps
- ship / block verdict
