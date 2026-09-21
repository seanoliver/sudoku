# Corner selection outline clipped by rounded board

## Symptom

Selecting a corner cell left a gap in the selection outline where the board curves. Reproduced on production with the top-left cell selected.

## Root cause

The board wrapper clips overflow to an 11px radius with a 1px border. Cells had a zero radius, so their square inset selection shadows were cut off at the outer corner.

## Reproduction

1. Open the app and select each corner cell: indices 0, 8, 72, and 80.
2. Inspect the blue outline where it meets the rounded board edge.
3. Repeat with keyboard focus and in dark appearance.

## Fix

Share the board radius through a CSS custom property. Give each corner cell only its corresponding outer radius, inset by the wrapper's 1px border. Selection, keyboard focus, and incorrect-answer shadows follow the same cell shape. Internal grid corners remain square.

## Verification

- Reproduced and captured the original appearance on production.
- Checked all four corners and a center cell in Chromium at 390px and 1280px widths, in light and dark themes; keyboard focus remains visible.
- Inspected screenshots of all four corrected corners.
- 58 unit tests and ESLint pass. Production build, TypeScript, and service-worker generation pass.
- Physical iOS/Safari was not tested.
- [Before](../screenshots/corner-selection-before.png) and [after](../screenshots/corner-selection-after.png).

## Recurrence guardrail

When changing the board border or radius, keep the cell radius aligned with the inner board edge. Visually check all four corners with selection and keyboard focus; checking only middle cells will miss clipping.
