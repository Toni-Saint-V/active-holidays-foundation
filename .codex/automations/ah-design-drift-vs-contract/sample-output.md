# Design Drift vs Contract · Sample

## CONTRACT ASSUMPTION

- Verdict-first MVP should give the user a clear decision, a trust reason, and a next action without forcing them to inspect internal state.

## IMPLEMENTED REALITY

- Start with router, screen contracts, and `npm run automations:check:screens`.
- Treat Notion anchors as contract context when available; treat Lovable as UI handoff context only.

## DRIFT SEVERITY

- `product-significant`

## TOP DRIFT

- A surface is product-significant only when the implemented user moment weakens decision clarity, trust, or next-action confidence.
- Cosmetic mismatch alone is not enough to block delivery.

## FIX PATH

- Smallest safe path:
  - keep domain/contracts stable
  - prepare a concise brief
  - mark `requires_png_approval` if hierarchy, layout, or CTA changes are needed

## VERIFY

- `npm run automations:check:screens`
- No invented phase, route, endpoint, or Lovable-owned domain contract.
