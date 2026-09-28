# Number grid keypad

Roadmap item: R8, number grid keypad. On September 28 Sean chose A, tools beside the grid, from three directions rendered in the app (tools beside the grid, wide grid, grid on the board). Reference: ../designs/keypad-approved.png, ../designs/keypad-approved-notes.png, and ../designs/keypad-approved-dark.png.

## Layout

- The one-row number pad becomes a 3 × 3 grid on the right: 1 2 3, 4 5 6, 7 8 9, like a phone keypad and like a cell's notes.
- On the left, Numbers, Notes, and Exclude stack vertically, with Erase below them. The mode indicator slides up and down to the active mode.
- The board keeps its size. Keys shrink on short screens so the game never scrolls: 56px tall on a 390 × 844 phone, smaller below 760px of height.

## Keys

- In Notes and Exclude, each key shows its digit in that digit's note position, larger than on the old row.
- Everything else is unchanged: filtered and finished digits dim, digit focus, the batch keypad labels, keyboard shortcuts, the walkthrough and lesson panels over the controls.

## Tests

- **Browser:** the keys form three rows of three in order; the modes stack to the left of the grid with Erase below them; the indicator sits on the active mode; the game fits without scrolling at 390 × 844 and 375 × 667.
