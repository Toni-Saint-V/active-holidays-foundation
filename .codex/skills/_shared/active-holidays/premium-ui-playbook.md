# Active Holidays Premium UI Playbook

Use this file when a screen needs to feel commercially strong, intentional, and trustworthy without drifting away from the repo's real product contracts.

## What Premium Means Here

- stronger hierarchy, not more decoration
- calmer surfaces, not more cards
- explicit next action, not persuasive fog
- visible trust cues, not fake certainty

## First Viewport Contract

Every important screen should answer these questions in order:

1. What is this screen deciding or helping with?
2. What should the user do next?
3. Why is that the right next move?
4. Where does the user go when certainty is not enough?

Above the fold, prefer exactly these elements:

- one concise context cue or eyebrow
- one dominant title or verdict line
- one primary CTA cluster
- one compact proof or trust rail
- one explicit escalation or fallback hint when risk exists

## Surface Recipes

### Result screen

- put verdict, next action, and primary path first
- keep compare and AI below the deterministic answer
- use one compact evidence rail for trust, documents, or blockers
- alternative paths must look secondary before the user reads the copy

Reference surfaces:

- `src/screens/result/ResultScreen.tsx`
- `src/screens/result/ResultCompareSurface.tsx`
- `src/screens/result/AiRecommendationPanel.tsx`

### Recommendation UI

- only the deterministic primary path may feel ready to act on
- alternative options use verbs like `проверить`, `сравнить`, or `сверить`
- disclaimer text sits close to the recommendation header, not buried below long content
- if detail is unavailable, preserve orientation and honesty; do not fake a full explanation

### Trust and human review

- trust screens should explain caps, sources, and uncertainty with structure, not drama
- `HUMAN_REVIEW` must look like a deliberate escalation, not a broken happy path
- bad news gets a clear action ladder, not a neutral card stack

Reference surfaces:

- `src/screens/trust/TrustScreen.tsx`
- `src/screens/human-review/HumanReviewScreen.tsx`

### Landing and discovery

- hero copy must describe the real product job, not generic inspiration
- one route starts the flow, one route opens a real example
- proof points should sound operational and specific, not like marketing wallpaper

Reference surface:

- `src/screens/landing/LandingScreen.tsx`

## Mobile-First Restraint

- one dominant CTA per viewport
- avoid two dense grids back-to-back
- prefer four to six meaningful sections over a long card ladder
- keep important copy within short paragraphs or compact bullet rails
- if a block needs horizontal scrolling, the information is probably too dense

## Russian Trust-Safe Wording

- prefer verbs like `проверить`, `сверить`, `подготовить`, `загрузить`, `передать на ручную проверку`
- avoid adjectives like `идеально`, `гарантированно`, `лучший` unless deterministic proof exists
- CTA labels should describe the action, not the aspiration
- remove filler before adding more explanatory text

## De-Clutter Moves

- merge adjacent weak cards into one stronger section
- pull disclaimers closer to the thing they qualify
- demote tertiary metadata into compact rows
- delete duplicate headings and repeated explanation sentences
- if the surface only works because of shadow or glow, fix spacing and order first

## Failure Modes To Reject

- premium equals more chrome
- AI panel visually outranks the deterministic result
- compare CTA styled like the confirmed primary action
- too many badges, accents, or conflicting tones
- long paragraphs where the user needs action structure

## Validation

- three-second CTA test
- no-shadow test
- grayscale test
- one-hand mobile thumb test
