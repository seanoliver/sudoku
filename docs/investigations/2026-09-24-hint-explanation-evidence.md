# Evidence a hint needs to explain its move

## Context

Sean found a coloring hint that crossed out 2s with no explanation. Before designing walkthroughs, this checked what each step report already carries and what the detectors compute but discard.

## Key findings

- `findStep` returns the move and the cells involved (`area`, `pattern`, `relies`, `shades`), not the reason the move is valid.
- Coloring found either two same-shade cells sharing a house (a color wrap) or a cell that sees both shades (a color trap), then discarded which one. Of the first six coloring steps found across Expert seeds 1–10, five were traps and one was a wrap.
- The chain's links are the houses with exactly two places for the digit. They are not stored; `explain.ts` rebuilds them from the candidates.
- XY-wing sorts its three digits, which loses which digit the wings share. Fish report the cells, not the base and cover lines.

## How it works

- `coloring()` in `src/lib/steps.ts` links cells over houses with exactly two candidates for a digit, 2-colors each connected component by BFS, then tests the wrap rule per shade before the trap rule. It now returns `variant: 'wrap' | 'trap'`.
- The prototype `explainColoring()` in `src/lib/explain.ts` finds the wrap pair again, starts a BFS from its first cell, and emits one line per tree edge with the house that made the link. The conflict cell is reached last, so the walkthrough ends on the contradiction.

## Gotchas

- Two cells can be linked by two houses at once (a row and a box). The walkthrough names the first house found.
- A house with two same-colored cells can have more than two places for the digit, so it never linked them. Players ask about this, so the walkthrough says it.
- Coloring cells showed a gold "pattern" outline even when shaded blue, and a selected cell's tint overrode its shade. The walkthrough draws only fills.
- CSS `text-transform: uppercase` changes what Playwright's `innerText` returns ("1 OF 9"). Use `textContent` when parsing labels.

## Verification

`pnpm typecheck` and `pnpm test` (137 pass) with the `variant` change. The walkthroughs for a wrap on 2 (Expert seed 10) and a trap on 4 (seed 4) rendered correctly at 390×844.

## References

- HoDoKu, Simple Colors: https://hodoku.sourceforge.net/en/tech_col.php
- Sudopedia, Color Wrap and Color Trap: http://sudopedia.enjoysudoku.com/Color_Wrap.html
- Design: `docs/plans/2026-09-24-hint-explanations-design.md`
