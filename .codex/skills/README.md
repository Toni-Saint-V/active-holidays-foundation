# Active Holidays Compact Skill Catalog

The visible repo-local catalog is intentionally small: 11 action skills, grouped by work type.

## Visible Actions

Super mode:

- `ah-super-operator`

Process:

- `ah-control-protocol`
- `ah-product-strategy`
- `ah-repo-automation`

Product flow:

- `ah-result-flow`
- `ah-ai-trust-layer`
- `ah-backend-contracts`

UI:

- `ah-ui-direction`
- `ah-ui-implementation`
- `ah-visual-qa`

Review:

- `ah-review-release`

## Hotkey Commands

- `npm run ah`
- `PROMPT="..." npm run ah:auto`
- `PROMPT="..." npm run ah:orchestrate`
- `npm run ah:verify`
- `npm run ah:review`
- `npm run ah:ui`
- `npm run ah:ship`
- `npm run ah:skills`
- `npm run ah:auto`
- `npm run skills:orchestrate -- --prompt "..."`
- `npm run ah:audit`

## Layout

- `.codex/skills/<ah-action>/SKILL.md` — visible action skills.
- `.codex/skills/_internal/*.md` — old atomic rules preserved as internal references.
- `.codex/skills/_shared/active-holidays/` — shared product and architecture context.
- `modes.md` — machine mode detection.
- `bundles.md` and `task-templates.md` — internal execution references.
- `packs.md` and `situations.md` — optional maps, not picker actions.

## Rules

- Do not expose atomic helper rules as picker skills.
- Do not recreate the 70-item list.
- Keep global curated skills as companions instead of repo-local shadows.
- Use `orchestrationMode` as an on/off depth switch for broad skill/subagent planning; do not create a second router.
- UI still requires PNG approval before code.
- Every real implementation still needs verification before final status.

## Verification

- `npm run ah:skills`
- `npm run skills:verify`
