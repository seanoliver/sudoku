# Walkthrough spotlight

Roadmap item: R13, app polish, step 3c. On October 9 Sean asked to clean up the step-by-step walkthrough that hints and lessons use: its marks did not line up with the notes they pointed at, and it did not match the new rounded look. He chose direction B, spotlight, from three options rendered in the app (paged card, spotlight, step list). Reference: ../designs/walkthrough-approved.png, with the single, pointing, links, and dark states beside it. All options against today's version: ../designs/walkthrough-options.png.

## Board

- Cells the step does not use fade to about a fifth of their contrast. The cells it uses stay at full contrast: its row, column, or box, its focus and target cells, colored cells, the answer cell, and cells holding a candidate it marks.
- Candidate marks are the cell's own note digits, so they always sit in the right place. Only the candidates a step mentions show; the rest of the notes hide during the walkthrough.
  - A candidate the step uses is a small gray disc.
  - A candidate the step removes is a pale red disc with a red strike.
- Focus cells get a rounded dark outline just outside the cell, and target cells a red one, the same shape as the selection outline. On the board's edge the outline sits just inside.
- Color-trap cells are rounded blue and gold tiles inside the cell.
- Links run between the measured centers of the linked note digits and stop at each disc's edge. The newest link is drawn thicker in the hint color.

## Panel

- It replaces the keypad, as today, as a white card.
- A segmented bar across the top shows progress, one segment per step, filled up to the current one.
- Under it, a short line: the technique and "n of N". Then the sentence, larger and medium weight.
- At the bottom, a round back button and a wide Next button. On the last step of a hint, Next becomes "Learn <technique>" when a lesson exists.
- The "Why this works" heading and the cream panel are removed.

## Unchanged

- Keyboard: H steps forward, focus moves to Apply on the last step, Escape closes.
- The hint strip above the board, with the technique and Apply.
- The sentences.
