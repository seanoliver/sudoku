# Finding practice boards for each technique

## Context

The Learn module needs, per technique, boards where that technique is the easiest next move. This checked how easily the solver's walks produce them and what grading needs from the engine.

## Key findings

- Walking the 300 Expert bank puzzles, then 3,000 generated hard puzzles, filled six boards (one example plus five practice) for 14 of 15 lessons in about 100 seconds.
- Hidden quads are the exception: one board in 3,300 puzzles, because a naked set almost always appears first. The hidden-quad lesson stays in the catalog but hints don't offer it until it has a practice board (`hasLesson`).
- Boards often hold more than one instance of the same technique. In the first 40 Expert puzzles, over 50 steps had a second instance on the board, so grading must accept any instance. The detectors became generators so `allSteps` can list them all.
- Pointing and claiming boards are limited to pairs, so the prompt "Find the pointing pair" is always accurate. Grading still accepts pointing triples.

## How it works

- `scripts/build-lesson-bank.ts` solves each source puzzle with `findStep`/`applyStep`. It records a board whenever the easiest step's lesson still needs one, at most one board per lesson per puzzle.
- Each entry stores givens, current values, the solution, and the exclusions made so far (base candidates minus current candidates). `practiceGame` rebuilds it with every candidate noted and an empty undo history.
- `tests/lesson-bank.test.ts` re-derives each board's easiest step and checks its lesson and its agreement with the solution.

## Gotchas

- `findStep` depends on the key order of the `DETECTORS` table, which must stay in `TECHNIQUES` order.
- A hidden single can be found in a box and again in its row. `allSteps` then lists the same placement twice, which grading tolerates.

## Verification

`pnpm build:lesson-bank` printed each lesson's count (six each, hidden quad one). `pnpm test` runs the bank checks.

## References

- Design: `docs/plans/2026-09-25-learn-module-design.md`
- Plan: `docs/plans/2026-09-25-learn-module.md`
