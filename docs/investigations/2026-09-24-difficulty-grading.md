# Puzzle difficulty by required technique

## Context

Roadmap R2: Sean asked for a level harder than Hard (September 21 playtest). Before designing one, this measures what the current levels actually require of a player.

## Key findings

Grading 150 generated puzzles per level with a human-style solver (easiest technique first, record the hardest one needed):

| Level | Clues | Naked singles | Hidden singles | Locked candidates | Pairs | Triples / X-wing | Needs more |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Easy | 42 | 100% | 0% | 0% | 0% | 0% | 0% |
| Medium | 34 | 72% | 23% | 1% | 0% | 0% | 4% |
| Hard | 28 | 13% | 64% | 5% | 2% | 0% | 16% |
| Minimal (~24) | 24 | 4% | 41% | 15% | 7% | 0% | 33% |

- Difficulty is set only by clue count, so levels overlap heavily. 13% of Hard puzzles need nothing beyond naked singles, and 4% of Medium puzzles need techniques beyond X-wing.
- Removing every removable clue only reaches about 24 clues with this generator, and 45% of those puzzles still solve with singles.
- No puzzle in any sample needed triples or X-wing as its hardest step. Puzzles either solve with pairs or less, or need something beyond X-wing (for example chains or swordfish), or require trial and error. The grader does not yet tell these apart.
- Generation time: about 7ms per Hard puzzle and about 37ms per minimal puzzle (max about 210ms), so generating several candidates per request is affordable in the worker.

## How it works

- `generatePuzzle` (`src/lib/sudoku.ts`) builds the solution from one fixed pattern, `digits[(r * 3 + floor(r / 3) + c) % 9]`, then shuffles bands, rows within bands, stacks, columns within stacks, and digit labels. Every solution is a transformation of the same grid.
- It then removes clues in random order while `countSolutions` stays at 1, stopping at the level's target (42, 34, 28).
- `src/lib/deductions.ts` implements hidden singles, pointing pairs (exactly two cells), and hidden pairs for the candidate engine. The investigation grader adds naked singles, locked candidates (pointing and claiming, 2–3 cells), naked and hidden pairs and triples, and X-wing.

## Gotchas

- "Needs more" mixes puzzles that need advanced named techniques with puzzles that need guessing. A harder tier must exclude trial-and-error puzzles.
- The fixed solution pattern may bias which puzzles appear; it is untested whether random solution grids change the distribution.
- Seeds are deterministic, so the table is reproducible.

## Verification

`node --experimental-strip-types docs/investigations/repro/difficulty-grading.ts 150` from the repo root reproduces the table.

## References

- `docs/ROADMAP.md`, R2 and milestone 7 (technique-based difficulty).
- `src/lib/sudoku.ts` (`generatePuzzle`, `countSolutions`), `src/lib/deductions.ts`.
