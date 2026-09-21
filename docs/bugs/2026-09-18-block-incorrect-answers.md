# Replace duplicate-only conflict feedback with answer blocking

## Symptom

Incorrect entries could leave empty cells with no legal candidate while Show conflicts displayed no warning.

## Root cause

The preference only enabled duplicate detection. A digit can avoid repeating a peer while still differing from the unique solution.

## Reproduction

See `tests/screenshot-board.test.ts` for the reported board. Its original clues have one solution, its current entries have none, and it contains no duplicates.

## Fix

Replace Show conflicts with Block incorrect answers. Both keyboard and number-pad entry reject nonzero answers that differ from the stored solution and announce the rejection. The game state entry function also enforces this option before changing values, annotations, or history. Erasing, notes, and exclusions remain available. Existing incorrect entries are marked when enabled and remain editable; enabling the setting does not alter saved answers. New installs default to enabled. Existing preferences migrate their previous on/off choice, with the new key taking precedence.

## Verification

- 58 unit tests pass, including rejection without duplicates, unchanged state on rejection, correct answers, erase, undo, annotations, and preference migration.
- TypeScript, ESLint, and diff whitespace checks pass.
- Local Playwright browser checks passed for keyboard and number-pad rejection, correct entry, erase, disabling blocking, preference persistence after reload, and marking existing incorrect entries.
- Integrated with current `main` on September 20: hold-and-drag batch notes accept arbitrary digits with blocking enabled, undo remains atomic, and Clear selection leaves the game unchanged. Rejection feedback clears when selection or annotation mode changes.
- Production build and service-worker generation pass. Chromium phone viewport checks pass in light and dark themes with no console errors; physical iOS/Safari was not tested in this pass.
- Browser capture: [Blocked answer on phone](../screenshots/block-incorrect-phone.png).

## Recurrence guardrail

Keep `tests/block-incorrect.test.ts` and the screenshot reproduction. Validate answers against the stored solution, and route both input methods through the same entry handler. Do not substitute duplicate-only checks for correctness checks.
