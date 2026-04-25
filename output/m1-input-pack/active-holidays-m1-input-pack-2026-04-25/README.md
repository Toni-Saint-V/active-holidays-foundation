# Active Holidays M1 Input Pack

This archive is an input bundle for assembling the M1 screen set:

- Landing
- Visa Intake
- Visa Verdict
- HR Form
- HR Sent

## Design Concept Split

`Concept A` is a separate landing/hero direction:

- `01_reference_design/concepts/concept-a-landing-poster.png`

`Concept B` is the internal Digital Travel Pass product system:

- `01_reference_design/concepts/concept-b-ticket-status.png`
- `01_reference_design/concepts/concept-b-minimal-map-pass.png`

Do not merge Concept A and Concept B into one visual language by default. Use Concept A for Landing and Concept B for internal M1 screens unless a later design decision says otherwise.

## Included

- `01_reference_design/` - local HTML reference and supplied PNG concepts.
- `02_contracts/` - `shared/contracts`.
- `03_screen_models/` - `src/presentation/activeHolidays`.
- `04_screens/` - `src/screens`.
- `05_data/` - `data` and Codex fixtures.
- `06_copy/` - existing copy pack, if present.
- `07_existing_design_artifacts/` - existing flow-pack PNG artifacts.

## Not Final Yet

The archive is strong enough for a first design/build handoff, but not a final Definition of Ready until these are added or explicitly waived:

- final per-screen RU copy and legal copy;
- authoritative screen-state matrix;
- error taxonomy;
- Notion source links;
- separate brandbook/tokens/logo/font package if it exists outside the repo.
