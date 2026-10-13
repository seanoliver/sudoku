# Cell coloring

Roadmap item: R14, cell coloring. On October 12 Sean asked for a lightweight way to color cells for coloring deductions, and chose direction A, Color mode, from three options rendered in the app (Color mode, swatches in the focus strip, double-tap to cycle). He preferred A because coloring is an advanced technique, and B made it too prominent for players who will not use it. He added a Clear all key and a ? button that explains colors and links to the lessons. Reference: ../designs/cell-coloring-approved.png (nothing colored, a chain partway, the full chain, and the ? sheet), with dark mode in ../designs/cell-coloring-approved-dark.png. All options: ../designs/cell-coloring-options.png.

## Scope

- Whole cells, not single notes. Two colors, gold and blue, the same shades the coloring hints use.
- Players color cells themselves. Nothing colors cells automatically, and colors never change notes, exclusions, or numbers.

## Color mode

- A fourth option, **Color**, with a palette icon, joins Numbers, Notes, and Exclude. The mode switch becomes a 2 × 2 grid (Numbers and Notes, then Exclude and Color), icon above label, so each mode stays a large target and the controls keep their height. Sean chose the grid over a taller list on October 12, after the render. The indicator slides to the chosen mode and tints gold for Color.
- In Color mode the number pad becomes the color pad: a gold key and a blue key on top, then Erase, Clear all, and ? along the bottom.
- A color key colors the selected cell, or every cell in a drag selection. When they all already have that color, it clears them. The key for the selected cell's color shows as pressed.
- Erase clears the selected cells' color, and dims when they have none. Clear all clears every color on the board, and dims when there are none.
- ? opens the Colors sheet: three sentences on how a two-color chain works, then rows for the Color wrap and Color trap lessons. A row closes the sheet and opens the lesson; the back control returns to the game.
- Choosing another mode leaves Color mode. A new puzzle or restart returns to Numbers.

## On the board

- A colored cell shows a rounded tint inset from its edges, like the hint walkthrough's shading. Notes and numbers stay on top.
- Givens cannot be colored. Entering or erasing a number keeps the cell's color.
- During a hint walkthrough the walkthrough's own shading replaces the player's colors until it closes.

## State

- Colors are part of the game: saved with it, and covered by Undo and Redo. Clear all is one undo step, so it needs no confirmation.
- Saved games from before this change load with no colors.
- Restart clears colors. Replays do not show them.

## Keyboard

- `C`: Color mode, or back to Numbers when already in it.
- In Color mode, `1` colors gold, `2` colors blue, and Backspace clears.

## Accessibility

- The cell's label adds "gold" or "blue". The color keys are labeled "Color gold" and "Color blue", with `aria-pressed`.
- Undo and Redo announce "Undid colors in 3 cells".
- The two shades differ in lightness as well as hue, as the walkthrough's do.
