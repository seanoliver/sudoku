# Graded difficulty

Roadmap R2, part 1 of 2. Sean chose, on September 24, to first make the existing levels consistent by required technique (this change), then add an Expert level backed by a stronger solver (next change). Findings: `docs/investigations/2026-09-24-difficulty-grading.md`.

## Behavior

- Each level is defined by the hardest technique a person needs:
  - Easy: naked singles only.
  - Medium: needs hidden singles.
  - Hard: needs locked candidates (pointing or claiming) or a naked or hidden pair.
- Puzzles still have exactly one solution. Clue counts vary: Easy about 42, Medium about 34, Hard as few as the generator can remove (about 24).
- No UI change. The New puzzle sheet keeps its three options and descriptions.

## Implementation

- `src/lib/difficulty.ts`: `ratePuzzle(givens)` solves with the easiest technique first and returns the hardest one used, or `beyond`. `createPuzzle(difficulty, seed)` draws seeded candidates from `buildPuzzle` until one rates inside the level's band, up to 60 attempts, then falls back to the hardest candidate that does not exceed the band.
- `src/lib/sudoku.ts`: `generatePuzzle` now delegates to `buildPuzzle({ difficulty, seed, clueTarget })` with unchanged output for every seed, so existing seeded tests keep their puzzles.
- The puzzle worker calls `createPuzzle`.

## Performance

Measured on a laptop over 100 seeds each: Easy about 1ms, Medium about 7ms, Hard about 160ms on average with a worst case of 1.6s. Generation runs in the worker behind the existing loading state. Phone timing is unverified.
