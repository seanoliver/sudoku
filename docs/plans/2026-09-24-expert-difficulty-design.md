# Expert difficulty

Roadmap R2, part 2. Sean approved the Expert level on September 24 and chose direction C (a four-step segmented picker with bars) from three rendered New puzzle sheets (four rows, 2 × 2 grid, segmented). Reference: ../designs/expert-picker-approved.png. Findings: ../investigations/2026-09-24-difficulty-grading.md.

## Behavior

- Expert puzzles need, as their hardest step, a naked or hidden triple, X-wing, quad, swordfish, XY-wing, or simple coloring. They never need guessing: every Expert puzzle is fully solvable with the app's techniques.
- The New puzzle sheet is a segmented picker: Easy, Medium, Hard, Expert, each with difficulty bars. One line under it names the chosen level ("Expert · For seasoned solvers").
- The header's difficulty mark has four bars, filled up to the current level.
- Saved Expert games restore.

## Implementation

- `src/lib/difficulty.ts` adds quads, swordfish, XY-wing and simple coloring, and an `expert` band.
- `src/lib/expert-bank.ts` holds 300 puzzles (81 givens each), generated from random solution grids by `pnpm build:expert-bank`. At runtime an Expert request picks a bank entry by seed, solves it with the technique solver for its solution, and applies a seeded symmetry (digit relabeling, band and row order, stack and column order, optional transpose) so the board looks new. Symmetries preserve every technique, so difficulty is unchanged.
- Tests check every bank entry for a unique solution and an Expert rating, and that transforms preserve validity, uniqueness and rating.
