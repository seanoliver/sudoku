# Progressive hints

Roadmap milestone 6. Sean asked for hints on September 24 while stuck on an Expert puzzle. He chose direction A (a strip on top of the board) from three rendered layouts (strip on the board, card above the keys, bottom sheet), then asked that nothing below the board move. Reference: ../designs/hint-strip-approved.png.

## Behavior

- A bulb button at the right end of the focus bar opens the hint strip, which takes the focus bar's place at the same 44px height. The board, mode switch and number row never move.
- Each tap on Next goes one level deeper, with one line of text:
  1. The technique, e.g. "Hidden single".
  2. Where to look, e.g. "Look in this box", with the area shaded.
  3. The move, e.g. "The 6 goes here": supporting cells underlined, a placement ghosted in its cell, eliminations shown as struck candidates. Next becomes Apply.
- Apply makes the move as one undo step: a placement enters the digit; an elimination records exclusions.
- ✕ closes the strip. Any board change, pause, sheet or new puzzle clears the hint.
- A wrong number on the board comes first: the strip says so and highlights that cell.
- When these techniques find no move, the strip says "No hint available for this position".
- "Learn this" joins the strip when the Learn module (milestone 8) exists.

## Engine (this PR)

- `src/lib/steps.ts`: each technique is a detector that returns its first move as a `Step` (technique, area, supporting cells, digits, placement or eliminations). `findStep` tries them easiest first; `applyStep` applies one.
- `src/lib/difficulty.ts`: `solveWithTechniques` is now a loop over `findStep`, so grading and hints share one implementation and count one human-sized move at a time. Every Expert bank entry still meets `isExpert`.
- `src/lib/hints.ts`: `nextHint(game)` returns a mistake, a step, stuck, or solved. Candidates come from placed numbers plus the player's correct exclusions; notes are ignored. `applyHint` applies a step through `enter` or the new `excludeCandidates` (one undo step for several exclusions).
- Hints take about 0.1ms on average and 3.4ms at worst.
