# Auto notes for one or two placements in a box

> Historical design. Gameplay now follows [manual notes and one-time Fill notes](../plans/2026-09-15-manual-notes.md); automatic deduction application and its settings have been removed.


## Context
Sean requested automatic pencil notes when a digit has only one or two possible cells in a 3 × 3 box. Further configuration may follow later.

## Key findings
- `possibleCells(values, digit)` already computes legal empty cells using current row, column, and box entries. It does not consult the solution or manual notes.
- Manual notes live in `GameState.notes`; entry clears a filled cell's notes and removes the entered digit from peer notes.
- Undo snapshots contain both values and notes. Preferences persist independently of game state.

## How it works
The board renders notes from the saved game. Smart highlighting independently derives possible placements from current values. The requested rule can reuse that candidate calculation, grouping results by box and retaining groups of size one or two for each digit.

## Gotchas
- An absent manual note currently does not distinguish an elimination from a candidate the player has never written down.
- Automatic notes stay separate from manual notes and recalculate after erase and undo without deleting the player's work. They remain visible while the rule applies; Help explains this behavior.
- A single possible placement should remain a note; the request does not authorize filling answers automatically.
- Zero possible placements must produce no notes.

## Verification
- All 18 Node tests pass, including zero/one/two/three placements, all boxes, multiple digits, immutability, erase/undo, and preference migration.
- Type checking, ESLint, and the production build pass.
- Playwright verified default off, enabling, manual-note union and deduplication, manual removal while automatic notes remain, entry/erase/undo, reload persistence, disabling without losing manual notes, independent Smart highlighting, and light/dark themes. No browser console errors.
- A controlled fixture places 5 in rows 1 and 2 outside the top-left box and 1 at row 3 column 1. This leaves exactly two cells for 5 in that box. The left cell also has a manual 7, demonstrating coexistence.
- The 390 × 844 screenshot has 17px board margins on both sides and no scrollbar width loss. Captured from the local production build.

## References
- `src/lib/sudoku.ts`
- `src/lib/game.ts`
- `src/lib/preferences.ts`
- `src/components/game.tsx`
- `tests/sudoku.test.ts`
