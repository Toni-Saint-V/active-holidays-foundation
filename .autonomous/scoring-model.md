# Autonomous Scoring Model

## Balanced Score

Each candidate receives 0-10 points for impact and cost dimensions.

```text
impact =
  trust * 0.26 +
  conversion * 0.20 +
  polish * 0.18 +
  engineering_health * 0.22 +
  strategic_fit * 0.14

cost =
  risk * 0.18 +
  effort * 0.12

balanced_score = round((impact - cost) * 10) / 10
```

## Dimensions

### Trust

How much the task improves user confidence, decision quality, evidence, human-review honesty, or source freshness.

### Conversion / Growth

How much the task improves activation, lead capture, CTA clarity, retention, or growth loops.

### Market-grade Polish

How much the task improves UX, UI, copy, mobile quality, product clarity, and premium perception.

### Engineering Health

How much the task reduces fragility, improves tests, simplifies contracts, removes drift, or increases operability.

### Strategic Fit

How tightly the task maps to the current Active Holidays direction and the near-term Lovable/Codex/GitHub/Notion workflow.

### Risk

Likelihood of regressions, trust damage, broad blast radius, or external side effects.

### Effort

Expected implementation cost for a small, reviewable increment.

## Selection Rule

The next task is the highest `balanced_score` candidate that:

- does not require a blocked approval gate
- can be verified locally
- has a clear product reason
- can be implemented in one reviewable branch

If no candidate passes safety gates, the run becomes report-first and produces a founder decision request.
