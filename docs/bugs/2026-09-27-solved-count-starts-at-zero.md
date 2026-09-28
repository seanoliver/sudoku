# Solved count starts at zero for existing players

## Symptom

Home's "N solved" chip counted only puzzles finished after the Home release (#42). A player with Expert solves from earlier saw no count at all.

## Root cause

The count reads `sudoku.solved.v1`, a list that #42 introduced, so it was empty for everyone at release. Play history (`sudoku.puzzle-history.v1`) has recorded every completed Expert bank puzzle by source since #33, but the count ignored it. Easy, Medium, and Hard solves before #42 were never recorded anywhere and can't be recovered.

## Reproduction

1. Seed `sudoku.puzzle-history.v1` with `{ "seen": ["k1", "k2"], "completed": ["k1", "k2"] }` and no `sudoku.solved.v1`.
2. Open Home. No solved chip appears; it should read "2 solved".

## Fix

- `solvedCount` in `src/lib/home.ts` counts Expert solves from play history by source, and other solves from the solved list by game id.
- Since #42, an Expert solve is in both records. Expert game ids end in `-expert`, so those ids are left out of the solved list's share, and each Expert solve counts once.
- Restoring a save that is already solved now records its Expert source before Home reads the count, so the first Home screen includes it.

## Verification

- Unit: `solvedCount` in `tests/home.test.ts`, including a solve present in both records.
- Browser: `e2e/home.spec.ts` checks history-only Expert solves, a restored solved Expert save, and a newly solved game.

## Recurrence guardrail

- A new progress stat has to start from existing records, when they exist, before it is shown. Check `history.ts` and the storage keys in `game.tsx` for data the stat can start from.
- An Expert game restored without a source (saved before #33 and finished now) still isn't counted. That case is rare and accepted.
