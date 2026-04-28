# Copy + Trust Upgrade · Sample

## TARGET STRINGS

- Real user-facing Russian strings found with `rg -n` in `src`, `shared`, or `server`.
- Ignore hidden test fixtures unless they power the visible seeded flow.

## WEAK COPY

- Example defect: a CTA describes the system action instead of the user's outcome.

## STRONGER VERSION

- Stronger copy should be concrete, Russian-first, and trust-safe.
- It must not imply guaranteed visas, guaranteed timing, unsupported legal certainty, or fake precision.

## PRODUCT EFFECT

- Clearer next action.
- Better trust without overstating certainty.

## PATCH OR TASK

- Patch only when the text exists and the meaning is unchanged.
- If the fix changes layout, hierarchy, or CTA role, output a task with `requires_png_approval`.

## VERIFY

- Tone stays premium and direct.
- No mixed-language leakage.
- No new unsupported claim.
