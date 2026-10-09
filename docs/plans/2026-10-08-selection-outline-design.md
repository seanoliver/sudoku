# Selection outline

Roadmap item: R13, app polish, step 3b. Sean asked on September 29 for a rounded, more playful selection outline. On October 8 he chose direction C, merged halo, from three options rendered in the app (rounded ring, lifted tile, merged halo). Reference: ../designs/selection-outline-approved.png, with the batch, dark, and rejected states beside it and the motion in selection-outline-approved.webm. All three options: ../designs/selection-outline-options.png.

## Single cell

- A rounded outline (10px corners, 2.5px, `--blue`) sits just outside the selected cell, over the grid lines, with a faint glow of the same color around it. The cell keeps its pale blue selection fill.
- It glides to the next selected cell on the snappy spring, by tap or by arrow key. Reduced motion moves it at once.
- The outline turns red on a rejected entry and on an incorrect answer, so the red digit and the outline agree.
- It replaces the inset square outline, and the selected cell's keyboard focus ring: the halo already marks the focused cell.

## Several cells

- Cells selected by dragging share one outline. Each cell draws the outline only on sides that do not touch another selected cell, and rounds a corner only where both of its sides are drawn. An L-shaped selection reads as one shape.
- The group outline has no glow, so a large selection stays light. It does not glide; it follows the drag.

## Unchanged

- Peer, matching, and possible-placement highlighting.
- The hint walkthrough hides the selection, as it does today.
- Replay's changed-cell outline.

## Options not chosen

- **A, rounded ring:** today's outline with rounded corners, inside the cell. A batch shows one ring per cell, which looks busy.
- **B, lifted tile:** a solid blue tile over the cell with white text. It hides the cell's own highlight, turns a rejection into a solid red block, and a batch becomes a row of heavy tiles.
