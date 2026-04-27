# Active Holidays Task Templates

Use these templates after choosing the task family in [index.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/index.md) and the lean bundle in [bundles.md](/Users/user/Projects/active-holidays-foundation/.codex/skills/bundles.md).

## Template Contract

- Pick the template that matches the single primary mode.
- Do not choose a second template because a secondary skill was added.
- If `skills:start` gives one mode and several candidates, the template follows the returned primary mode only.
- `skill-system-governance` is the execution template for router/docs/automation-governance work on the repo-local Codex surface.

## Template Shape

1. User goal
2. Business goal
3. Primary flow
4. Constraints
5. Protocol
6. Load
7. Inspect
8. Implement
9. Verify

### Skill-system governance

User goal:

- keep the repo-local Codex surface coherent, lean, and easy to route

Business goal:

- reduce operator friction without creating duplicate skills, docs, or automation drift

Primary flow:

- current `.codex` surface -> strongest narrow improvement -> validation -> updated router contract

Constraints:

- strengthen the existing router and docs instead of creating a parallel abstraction
- keep `skill-system-governance` as the primary mode for repo-local Codex surface maintenance
- move to plugin governance only when plugin or MCP files are the dominant changed surface

Protocol:

- resolve one primary mode first, then keep bundle and template aligned to it
- treat `skills:detect-mode` candidates as context, not as permission to mix templates

Load:

- `ah-repo-automation`
- `ah-backend-contracts`
- `ah-review-release`

Inspect:

- `.codex/skills/*`
- `.codex/automations/*`
- `scripts/codex/*`
- `scripts/automations/*`
- `AGENTS.md`
- `README.md`
- `RUNBOOK.md`

Implement:

- prefer one canonical router or modes surface over repeated lists
- make the mode -> bundle -> template flow explicit when docs are ambiguous
- keep mode selection, bundle selection, and verification aligned
- do not add a new skill or doc when a tighter existing surface would solve the problem
- if plugin or MCP surface is involved, hand off to `ah-repo-automation`

Verify:

- `npm run skills:verify`
- `npm run automations:check:skills`
- `npm run automations:check:context`
- `npm run typecheck` when `scripts/codex/*` or `scripts/automations/*` changed

### AI recommendation boundary fix

User goal:

- keep recommendations useful without letting AI outrun the deterministic result

Business goal:

- preserve trust and compare semantics while still delivering concise guidance

Primary flow:

- `ResultScreen` -> `AiRecommendationPanel` -> deterministic compare when the option is non-primary

Load:

- `ah-ai-trust-layer`
- `ah-ai-trust-layer`
- `ah-ai-trust-layer`
- `ah-review-release`
- `ah-visual-qa`

Inspect:

- `server/lib/recommendations.ts`
- `shared/contracts/recommendations.ts`
- `src/screens/result/AiRecommendationPanel.tsx`
- `server/lib/recommendations.test.ts`
- `server/routes/recommendations.integration.test.ts`

Implement:

- keep server-owned and model-owned fields separated
- keep non-primary options compare-only
- make fallback and disclaimer text explicit
- add or tighten the narrowest regression that proves the boundary

Verify:

- `npm run test -- server/lib/recommendations.test.ts server/routes/recommendations.integration.test.ts src/screens/result/AiRecommendationPanel.test.tsx`
- `npm run typecheck`
- `npm run verify:engine` only if deterministic semantics changed

### Structured contract or schema change

User goal:

- change a contract without drifting callers, routes, or validation

Business goal:

- keep shared contracts stable and easy to extend across client, server, and tests

Primary flow:

- shared schema -> route validation -> client parser / caller -> tests

Load:

- `ah-backend-contracts`
- `ah-visual-qa`
- `ah-backend-contracts`

Inspect:

- touched `shared/contracts/*`
- touched `server/routes/*`
- `src/lib/apiClient.ts`
- nearest integration test or compat test

Implement:

- update the contract and all real callers in one pass
- keep versioning or rollout coordination explicit when payload meaning changes
- add the thinnest real contract test instead of broad snapshots

Verify:

- targeted contract / route tests for the changed surface
- `npm run typecheck`
- `npm run test`

### Result flow integration change

User goal:

- improve the result loop without creating a detached side surface

Business goal:

- make the next action clearer, more trustworthy, and easier to follow

Primary flow:

- `ResultScreen` -> trust / documents / compare / human review branches

Load:

- `ah-result-flow`
- `ah-ui-direction`
- `ah-ui-direction`
- `ah-review-release`
- `ah-ui-implementation`

Inspect:

- `src/screens/result/ResultScreen.tsx`
- `src/screens/result/ResultCompareSurface.tsx`
- `src/screens/trust/TrustScreen.tsx`
- `src/screens/documents/DocumentsScreen.tsx`
- `src/screens/human-review/HumanReviewScreen.tsx`
- `src/state/caseStore.ts`

Implement:

- strengthen the active screen before adding a new route
- keep deterministic truth above AI or compare helpers
- cover loading, empty, error, and escalation states

Verify:

- targeted component / integration tests for the touched route
- browser verification if layout or interaction changed
- `npm run typecheck`

### Premium UI or UX refinement

User goal:

- make a real product surface feel premium, restrained, and commercially strong

Business goal:

- improve hierarchy and trust without adding visual noise or generic SaaS styling

Primary flow:

- first viewport clarity -> dominant CTA -> supporting trust / proof -> secondary exploration

Load:

- `ah-control-protocol`
- `ah-ui-implementation`
- `ah-ui-implementation`
- `ah-ui-direction`
- `ah-ui-direction`
- `ah-ui-implementation`

Inspect:

- touched `src/screens/*`
- `src/theme/tokens.ts`
- `src/ui/primitives.tsx`
- sibling screen in the same flow
- `./_shared/active-holidays/premium-ui-playbook.md`

Implement:

- do not touch UI code before a PNG preview is shown and explicitly approved
- choose one composition pattern and strengthen the first viewport first
- reduce clutter before adding new chrome
- rewrite weak copy into short Russian action language
- keep alternative or compare actions visibly secondary

Verify:

- preserve structured JSON in user-facing communication
- browser check on desktop and mobile when practical
- screenshot the risky state, not only the happy path
- `npm run typecheck`

### Reliability or fallback hardening

User goal:

- keep the product honest and usable when enhancement layers fail or reload awkwardly

Business goal:

- prevent degraded states from breaking trust or blocking deterministic progress

Primary flow:

- initial load -> failure / retry -> stale-safe recovery -> deterministic fallback remains usable

Load:

- `ah-backend-contracts`
- `ah-ai-trust-layer`
- `ah-backend-contracts`
- `ah-review-release`
- `ah-backend-contracts`

Inspect:

- `src/screens/result/AiRecommendationPanel.tsx`
- `src/state/caseStore.ts`
- `server/lib/recommendations.ts`
- nearest retry / refresh / fallback tests

Implement:

- keep useful deterministic UI alive through enhancement failures
- preserve last-good state only when it stays truthful
- make retry and degraded messaging explicit

Verify:

- targeted failure-path tests
- `npm run typecheck`
- `npm run test`

### Regression-test expansion

User goal:

- add proof exactly where the current system can regress

Business goal:

- catch high-signal failures without creating noisy or fake coverage

Primary flow:

- risk -> closest real failing surface -> targeted regression -> repo gate

Load:

- `ah-visual-qa`
- `ah-review-release`
- `ah-review-release`

Inspect:

- nearest unit, component, integration, or engine-drift test
- exact code path that could regress

Implement:

- assert behavior, not incidental structure
- add at least one negative or conflict path when the risk warrants it
- prefer the narrowest layer that can truly catch the bug

Verify:

- run the new test directly first
- run `npm run test`
- run `npm run verify:engine` when seeded scenario semantics are involved

### Plugin / MCP surface governance

User goal:

- keep plugin and MCP surface useful without creating speculative local layers

Business goal:

- reduce operator friction while keeping repo-local integration minimal and verifiable

Primary flow:

- live plugin surface -> gap classification -> smallest durable fix -> verification

Load:

- `ah-repo-automation`
- `ah-repo-automation`
- `ah-backend-contracts`

Inspect:

- `plugins/*/.codex-plugin/plugin.json`
- `.agents/plugins/marketplace.json`
- `.cursor/mcp.json`
- `.codex/automations/ah-plugin-mcp-surface-watch/automation.toml`
- `scripts/automations/check-context-surface.ts`
- repo-local routing docs that mention skills or environment surface

Implement:

- prefer docs, routing, or validation improvements before introducing a repo-local plugin
- keep runtime-plugin usage explicit when the active session already provides the needed capability
- if a repo-local plugin is justified, keep manifest and marketplace state coherent in the same pass
- call out clearly whether the result is docs-only, validation-only, or a real plugin addition

Verify:

- `npm run skills:verify`
- `npm run automations:check:context`
- `npm run automations:verify` when automation prompts or supporting docs changed

### Final multi-lens review of a moderate change

User goal:

- decide whether the change is actually safe to ship or merge

Business goal:

- stop weak, trust-breaking, or incomplete work from passing as “done”

Primary flow:

- changed files -> review lenses -> verification proof -> ship / block verdict

Load:

- `ah-review-release`
- `ah-review-release`
- `ah-review-release`

Inspect:

- touched files
- touched tests
- commands already run
- visible routes or flows affected

Implement:

- restate what changed and what could break
- list findings before summary
- fix the cheap high-signal issue immediately if safe

Verify:

- rerun the relevant gates after any review-driven fix
- if the task is a merge gate, add `ah-review-release`
