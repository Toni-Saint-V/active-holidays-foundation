# Active Holidays Review Checklists

## Architect Lens

- Are client/server/shared boundaries still clean?
- Did any new code bypass `shared/contracts/*`?
- Is state ownership obvious between `src/state/caseStore.ts`, route handlers, and domain functions?
- Did the change add hidden coupling or duplicate derivation?
- Would the next engineer know where to extend this safely?

## UI Director Lens

- Is the first screenful clear without reading every paragraph?
- Is the main CTA visually dominant?
- Does the surface still feel strong if shadows are removed?
- Is spacing consistent across sections and cards?
- Are alternative paths visibly less committal than the primary action?
- On mobile, does anything collapse into cramped or noisy layout?

## UX / Product Lens

- Can the user understand what to do next in 3 seconds?
- Did the change remove or add confusion?
- Are empty/loading/error/success states explicit?
- Did any new copy create fake certainty or hide escalation?
- Does the result loop remain the center of gravity?

## QA / Regression Lens

- Are happy path and critical non-happy paths covered?
- Were existing seeded scenarios or compare flows regressed?
- If automation is missing, what exact manual sanity checks were run?
- Are state refresh and retry paths safe?

## Performance / Stability Lens

- Did the change add heavy re-renders, large derived work in render, or noisy motion?
- Does the screen still feel responsive on mobile?
- Are new effects scoped and deterministic?

## Trust / Risk Lens

- Did AI stay within explanatory ownership?
- Does compare-only remain compare-only?
- Are human-review paths still explicit and honest?
- Is all visible Russian copy concrete and non-generic?

## Finish Conditions

- run the smallest relevant automated checks first, then full repo gates when justified
- for product surface changes, default repo gates are:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- for deterministic engine or baseline-sensitive work:
  - `npm run verify:engine`
- for repo-local Codex skill work:
  - `npm run skills:verify`
  - `npm run automations:check:skills`
  - `npm run automations:check:context`
- if automation files or their supporting docs changed:
  - `npm run automations:verify`
- if UI could not be browser-verified, state the missing artifact or missing harness explicitly
