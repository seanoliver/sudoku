# Screenshot board with no legal candidates

## Context

Sean reported empty cells with no possible candidates and suspected puzzle generation. Reconstructed the September 18 screenshot using white numbers as original clues and blue numbers as player entries, matching the app's CSS.

## Key findings

- The 28 original clues have exactly one solution.
- The current entries have no solution, despite containing no repeated numbers in any row, column, or box.
- Four empty cells have no candidates: r4c2, r5c6, r8c8, and r9c4 (one-based coordinates).
- An independent backtracking solve identified these incorrect entries: r1c7 4→3, r1c8 3→4, r4c4 8→2, r4c6 2→1, r5c5 4→8, r6c8 4→7, r8c4 3→8, r8c5 8→4, r8c6 4→2, r9c7 3→7.
- This report does not demonstrate a generator defect. It demonstrates the limitation of duplicate-only conflict feedback.

## How it works

`generatePuzzle` permutes a valid completed grid, removes clues, and retains a removal only when `countSolutions` returns one. `enter` permits mistakes. `conflicts` only marks duplicate digits among peers; the setting explicitly says “Mark repeated numbers in red.” Candidate calculation uses current entries, so incorrect entries can remove all possibilities from another cell without causing a duplicate.

## Gotchas

- A locally legal move need not belong to the puzzle's solution.
- Absence of red conflict marks does not establish that the board remains solvable.
- The reconstruction depends on reading the screenshot's clue/entry colors; no saved game or original puzzle seed was available.
- No gameplay behavior was changed. Solution-based mistake checking or contradiction warnings would be a separate product change.

## Verification

`tests/screenshot-board.test.ts` preserves both transcribed boards and checks uniqueness of the original puzzle, absence of duplicates, unsolvability of current entries, and all four empty candidate sets. An independent backtracking solver agreed with the application's solution count.

## References

- `src/lib/sudoku.ts`: generation, solution counting, and conflicts
- `src/lib/game.ts`: entry handling
- `src/lib/candidates.ts`: candidate calculation
- `src/components/game.tsx`: conflict display and settings copy
- `src/app/globals.css`: original versus entered number colors
- `tests/screenshot-board.test.ts`: screenshot reproduction
