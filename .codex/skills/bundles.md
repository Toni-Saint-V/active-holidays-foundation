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

- Load `ah-control-protocol` before every non-trivial task.
- Start with the `Core` bundle only. Add `Optional` skills only when the touched surface truly needs them.
- If `orchestrationMode.status` is `enabled`, scan all matching packs/candidates and load every relevant skill for the real risk surface instead of stopping at the first two.
- If visible Russian copy changes, add `ah-ui-direction`.
- If the task is non-trivial, finish with `ah-review-release`, `ah-review-release`, and `ah-review-release`.
- If the task is a review, PR gate, or merge-readiness check, add `ah-review-release`.
- If the task touches result, trust, compare, recommendation, or `human-review`, add `ah-review-release`.
- If the task touches `.cursor/mcp.json`, `.agents/plugins/marketplace.json`, or `plugins/*/.codex-plugin/plugin.json`, add `ah-repo-automation`.
- If the task touches UI, the bundle does not authorize code changes until a PNG preview is shown and approved.

## Task Families

### Skill-system governance

This is the bundle for maintaining the existing router and repo-local Codex operating surface.

Core:

- `ah-repo-automation`
- `ah-backend-contracts`
- `ah-review-release`

Optional:

- `ah-repo-automation` when the `.codex` task includes plugin or MCP boundary work
- `ah-product-strategy` when the output is mainly routing guidance or operator docs
- `ah-super-operator` when the user explicitly asks for a maximum skill/agent mix or "super" execution mode
- `ah-review-release` when validator or repo checks changed
- `_internal/deep-orchestration-mode.md` when the user wants on/off skill + subagent orchestration

Finish:

- `ah-review-release`
- `ah-review-release`

### AI recommendation boundary fix

Core:

- `ah-ai-trust-layer`
- `ah-ai-trust-layer`
- `ah-ai-trust-layer`
- `ah-review-release`
- `ah-visual-qa`

Optional:

- `ah-backend-contracts` when degraded-state UX or retry logic changes
- `ah-ai-trust-layer` when prompt text or model payload changes
- `ai-observability` when request-path visibility or source flags change
- `ah-ai-trust-layer` only when model/tool behavior itself changes
- `ah-result-flow` only when the result-loop UI contract changes
- `ah-ui-direction` when disclaimers or recommendation copy changes

Finish:

- `ah-review-release`
- `ah-review-release`
- `ah-review-release`

### Structured contract or schema change

Core:

- `ah-backend-contracts`
- `ah-visual-qa`
- `ah-backend-contracts`

Optional:

- `ah-backend-contracts` when the schema change is driven by an actual defect
- `ah-ai-trust-layer` when the contract belongs to recommendation surfaces
- `ah-result-flow` when the change alters result-loop behavior
- `ah-product-strategy` when callers, rollout assumptions, or follow-up work must be stated explicitly

Finish:

- `ah-review-release`
- `ah-review-release`
- `ah-review-release`

### Result flow integration change

Core:

- `ah-result-flow`
- `ah-ui-direction`
- `ah-ui-direction`
- `ah-review-release`
- `ah-ui-implementation`

Optional:

- `ah-ui-implementation` when hierarchy, CTA, or visual composition changes
- `ah-ui-implementation` when shared visual primitives or spacing change
- `ah-backend-contracts` when state, route params, or contracts change
- `ah-ai-trust-layer` when compare or recommendation semantics change

Finish:

- `ah-review-release`
- `ah-review-release`
- `ah-review-release`

### Premium UI or UX refinement

Core:

- `ah-control-protocol`
- `ah-ui-implementation`
- `ah-ui-implementation`
- `ah-ui-direction`
- `ah-ui-direction`
- `ah-ui-implementation`

Optional:

- global `premium-png-screen-design` before implementation approval
- `ah-review-release` for result, trust, recommendation, or human-review surfaces
- `ah-visual-qa` when motion, dense layouts, or large component trees are touched
- `ah-visual-qa` when browser verification or screenshots are realistic

Finish:

- `ah-review-release`
- `ah-review-release`
- `ah-review-release`

### Reliability or fallback hardening

Core:

- `ah-backend-contracts`
- `ah-ai-trust-layer`
- `ah-backend-contracts`
- `ah-review-release`
- `ah-backend-contracts`

Optional:

- `ah-ai-trust-layer` when recommendation ownership changes
- `ah-result-flow` when the degraded state changes visible result-loop UX
- `ah-visual-qa` when deterministic semantics or compare output may drift
- `ah-product-strategy` when the degraded path has explicit operational caveats

Finish:

- `ah-review-release`
- `ah-review-release`
- `ah-review-release`

### Regression-test expansion

Core:

- `ah-visual-qa`
- `ah-review-release`
- `ah-review-release`

Optional:

- `ah-backend-contracts` when the missing coverage belongs at a contract boundary
- `ah-review-release` when the risk is trust-critical or recommendation-related
- `ah-visual-qa` when browser verification is the real missing proof
- `ah-product-strategy` when the new coverage closes a known release gap

Finish:

- `ah-review-release`
- `ah-review-release`

### Plugin / MCP surface governance

Use this bundle only when plugin or MCP surface is the actual dominant problem, not merely mentioned in repo docs.

Core:

- `ah-repo-automation`
- `ah-repo-automation`
- `ah-backend-contracts`

Optional:

- global `plugin-creator` when a real repo-local plugin scaffold is justified
- `ah-product-strategy` when the main output is operator guidance or environment notes
- `ah-backend-contracts` when plugin or MCP state affects repeated workflows or automation safety

Finish:

- `ah-review-release`
- `ah-review-release`
- `ah-review-release`

### Final multi-lens review of a moderate change

Core:

- `ah-review-release`
- `ah-review-release`
- `ah-review-release`

Optional:

- `ah-review-release` for review or merge gates
- `ah-review-release` for result/trust/AI/user-facing diffs
- `ah-visual-qa` for UI, motion, or render-heavy changes

Output:

- findings ordered by risk
- exact proof that was run
- explicit remaining gaps
- ship / block verdict
