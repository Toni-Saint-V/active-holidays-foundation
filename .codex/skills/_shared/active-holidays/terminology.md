# Active Holidays Terminology

- `primary path`
  The deterministic best current route or offer. This is the only path allowed to feel action-confirmed.
- `alternative path`
  A non-primary route or offer surfaced for comparison, not confirmation.
- `compare-only`
  UX state where the user may inspect or fork/compare a variant, but must not treat it as already approved.
- `scenario lab`
  Repo term for the deterministic "Как улучшить шанс" surface and server-side candidate generation.
- `fork`
  Independent case copy used for side-by-side scenario comparison.
- `trust surface`
  Confidence, source, volatility, and explanation UI rooted in deterministic output.
- `human review`
  Explicit escalation when automation should stop or a manager/operator must confirm the case.
- `replay`
  Historical rerun of a stored decision snapshot.
- `drift`
  Difference between stored and replayed/current results, including fingerprint-only drift.
- `golden evals`
  Stable seeded scenarios and targeted regression tests that prove the decision surface still behaves as intended.
