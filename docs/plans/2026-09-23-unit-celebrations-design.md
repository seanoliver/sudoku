# Unit celebrations

Roadmap item: "Small celebrations for completed units". Sean approved this design on September 23, choosing direction A (sweep) from three recorded directions (sweep, glow, pop). Reference: ../designs/unit-celebration-approved.webm and ../designs/unit-celebration-approved.png.

## Behavior

- Plays only after a single-cell value entry (keypad or keyboard). Loading a game, undo, redo, restart, Fill notes, batch notes and exclusions never celebrate.
- A row, column or box counts when the entry changes it from incomplete to holding 1–9 exactly once. Nine filled cells with a duplicate do not count.
- One sweep covers every newly completed unit. Cells flash once each, staggered by Manhattan distance from the entered cell.
- The entry that completes the puzzle sweeps all 81 cells from that cell, alongside the existing "Nicely done" panel.
- Re-entering a value after undo is a new qualifying move and celebrates again.

## Visual

- Pale green flash (`--possible`) in an overlay span inside each cell: 45ms delay per distance step, 520ms per cell. The digit sits above the overlay; selection, highlights and values are unchanged.
- Reduced motion: no ripple or fade. The same cells show a static pale green tint until the timer clears it.
- A visually hidden live region announces the result, e.g. "Row 4 and column 5 complete" or "Puzzle complete".
- Pause, opening a sheet, undo, redo, restart and new puzzle clear it immediately. Selecting another cell does not.

## Implementation

- `completedUnits({ before, after, index })` in `src/lib/sudoku.ts` returns `{ kind: 'row' | 'column' | 'box'; number: number; cells: number[] }[]` for units containing `index` that are complete in `after` and not in `before`. Numbers are 1-based; boxes count left to right, top to bottom.
- `input()` computes the next game once, sets it, and stores `{ id, origin, cells, label }` when units completed or the puzzle completed. A timer clears it after `maxDistance × 45 + 520` ms.
- The celebration stays visible when the puzzle is complete (unlike rejection feedback).

## Verification

- Unit tests for `completedUnits`: a row; a row and box together; a duplicate-filled unit; an already complete unit; erase (value 0); the final cell completing row, column and box.
- Browser at 390 × 844, light, dark and reduced motion: single unit, two units, final entry, undo does not celebrate, pause clears. Recording and screenshots in `docs/screenshots/`.
