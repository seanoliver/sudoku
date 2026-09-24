# Progressive hints

Roadmap milestone 6. Sean asked for hints on September 24 while stuck on an Expert puzzle. He chose direction A (a strip on top of the board) from three rendered layouts (strip on the board, card above the keys, bottom sheet), then asked that nothing below the board move. Reference: ../designs/hint-strip-approved.png.

## Behavior

- A bulb button at the right end of the focus bar opens the hint strip, which takes the focus bar's place at the same 44px height. The board, mode switch and number row never move.
- Each tap on Next goes one level deeper, with one line of text:
  1. The technique, e.g. "Hidden single".
  2. Where to look, e.g. "Look in this box", with the area shaded.
  3. The move, e.g. "The 6 goes here": supporting cells underlined, a placement ghosted in its cell, eliminations shown as struck candidates. Next becomes Apply.
- Apply makes the move as one undo step: a placement enters the digit; an elimination records exclusions. The affected cell then takes selection and keyboard focus. Apply does not play unit celebrations.
- ✕ or Escape closes the strip. Any board change (including a note) or new puzzle clears the hint; pausing or opening a sheet hides it until you return.
- Mistakes come first: a wrong number, or an exclusion that crossed out a cell's answer. The strip says so and highlights that cell.
- When these techniques find no move, the strip says "No hint here".
- "Learn this" joins the strip when the Learn module (milestone 8) exists.

## UI

- `src/lib/hint-view.ts` turns a hint and level into the strip's one line (`text`), a screen-reader line with exact positions (`label`), the Next/Apply action, the cells' hint roles (area, supporting cells, answer, exclusions relied on, struck candidates, mistake, coloring shades), and the ghost digit.
- The hint is tied to the exact game object it was computed for, so any board change retires it. `H` opens or advances a hint.
- A naked single underlines one placed copy of each other digit (8 cells), not every placed neighbor.
- In the browser, an Expert puzzle was solved start to finish with 70 hints, including pointing and claiming, naked and hidden pairs, a swordfish and coloring, with the board and keypad never moving.

## Engine

- `src/lib/steps.ts`: each technique is a detector that returns its first move as a `Step`: technique, variant (naked or hidden sets, pointing or claiming), area, supporting cells, digits, placement or eliminations, the exclusions the move relies on (`relies`, so every ruled-out cell can be explained), and coloring's two shades. `findStep` tries them easiest first; `applyStep` applies one.
- `src/lib/difficulty.ts`: `solveWithTechniques` is now a loop over `findStep`, so grading and hints share one implementation and count one human-sized move at a time. Every Expert bank entry still meets `isExpert`.
- `src/lib/hints.ts`: `nextHint(game)` returns a mistake (a wrong number, or an excluded answer with its digit), a step, stuck, or solved. Candidates come from placed numbers plus the player's exclusions; notes are ignored. `applyHint` applies a step through `enter` or the new `excludeCandidates` (one undo step for several exclusions).
- Hints take roughly 0.1ms on average and a few milliseconds at worst. Grading is unchanged: the review found identical ratings for 900 generated puzzles and all 300 bank entries under the new solver.
