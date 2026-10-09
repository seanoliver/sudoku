# Polish step 3c: walkthrough spotlight

**Goal:** rebuild the walkthrough that hints and lessons share, per the [spotlight design](2026-10-09-walkthrough-spotlight-design.md): marks that line up with the notes they point at, cells the step does not use faded, and a white panel with segmented progress and a wide Next button.

**Architecture:** the old SVG overlay placed chips with a formula that assumed where each note sat in a cell; grid lines and the board border moved the real notes, so chips landed a few pixels off. Now each cell carries `data-chip` and `data-strike` lists, and CSS styles the cell's own note digit (`data-digit`). Links stay in an SVG, but its endpoints are measured from those note digits and re-measured on resize. Cells the step uses get a `walk-used` class; the rest fade.

**Out of scope:** the sentences, keyboard behaviour, and the hint strip.

## Tasks

1. `CellNotes`: add `data-digit` to each note digit.
2. `game.tsx`: `walk-used`, `data-chip`, and `data-strike` on cells during a walkthrough; a ref on `.board-wrap` for measuring; `WALK_NEXT_FOCUS` points at the new Next button; the panel gets the technique or lesson name.
3. `hint-walkthrough.tsx`: `WalkthroughLinks` (measured) replaces `WalkthroughOverlay`; `WalkthroughPanel` becomes progress, eyebrow, sentence, back, and Next (Learn on a hint's last step when a lesson exists).
4. CSS: remove the overlay, chip, cream panel, and stepper rules; add the spotlight rules.
5. Tests: update selectors (`.walk-count`, the Learn button name, a `stepToEnd` helper), and add: each chip sits on its note digit; unused cells fade; the links' ends sit on their note digits.
6. Verify: typecheck, lint, unit, e2e, first-load size; capture the built UI at the approved states and compare with `docs/designs/walkthrough-approved*.png`.
