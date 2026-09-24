# Stronger Expert puzzles and play history

Sean finished an Expert puzzle on September 24 and found it easy. With Block incorrect answers, Filter number keys and Smart highlighting on, assists covered much of the scanning, and wrong guesses were rejected instantly. The first Expert bank also asked for too little: 174 of 300 puzzles needed exactly one advanced step, and half of them only needed it once 51 or more cells were filled.

## Expert rule

- `EXPERT_RULE`: at least 3 advanced steps (triples or harder), with the first needed while 45 or fewer cells are filled (at least 36 empty). The hardest step must still be in the expert band, so puzzles never need guessing.
- About 1% of random minimal puzzles qualify, so the bank is built offline: `pnpm build:expert-bank` keeps 300 puzzles that pass `isExpert`. Sean chose 300 over a larger bank for now.
- Tests check every bank entry with `isExpert`.
- A symmetry keeps a puzzle's logic but changes the solver's scan order, which can shorten its path. Each served variant is re-checked with `isExpert`; up to 20 symmetries are tried, falling back to the bank entry as stored. Over 300 requests every served puzzle passed, averaging 15ms.

## Play history

- Each bank puzzle has a stable key, `expertKey` (FNV-1a of its 81 givens), stored on the puzzle as `source`. It survives saves, restores and restarts.
- `sudoku.puzzle-history.v1` in localStorage holds `seen` and `completed` keys (`src/lib/history.ts`).
- New Expert puzzles skip seen keys. Once every bank puzzle has been seen, a new cycle starts. Completing a bank puzzle records it in `completed`, for a future history view (roadmap R10).
- The worker cannot read localStorage, so the page sends the seen list with each Expert request and the worker returns the bank size. The bank stays out of the main page bundle.
