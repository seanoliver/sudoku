# Sticky batch selection design

R19 (keep a batch selection after a note or exclusion). On October 13, 2026, Sean chose direction A, sticky selection, over B, key marks, and C, done bar, after trying all three on a clickable prototype. Reference: `docs/designs/sticky-batch-approved.png`.

## Behavior

- A number on a multi-cell selection toggles that note or exclusion in every selected cell, and the selection and its Notes or Exclude mode stay, so the next number applies to the same cells.
- The selection ends the same ways it already could: tap a filled cell, choose Numbers, press Escape, or remove every cell from it. Tapping an empty cell still adds or removes that cell.
- A number already on in every selected cell is removed from all of them; one on in only some is added to the rest. This was already how a batch toggled.
- Each number is its own undo step.
- Block incorrect answers still refuses a batch number that crosses out an answer, and the selection stays, as it already did. Filter number keys still skips cells whose row, column, or box holds the number.
- Erase and Color mode are unchanged: Erase on a selection ends it, and a color applied to a selection ends it.
