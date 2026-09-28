# Number grid keypad

Roadmap item: R8, number grid keypad. On September 28 Sean chose A, tools beside the grid, from three directions rendered in the app (tools beside the grid, wide grid, grid on the board). Reference: ../designs/keypad-approved.png, ../designs/keypad-approved-notes.png, and ../designs/keypad-approved-dark.png.

## Layout

- The one-row number pad becomes a 3 × 3 grid on the right: 1 2 3, 4 5 6, 7 8 9, like a phone keypad and like a cell's notes.
- On the left, Numbers, Notes, and Exclude stack vertically, with Erase below them. The mode indicator slides up and down to the active mode.
- Keys are 56px tall, and 48px below 760px of height, where the keys and the tool column end level; the mode buttons and Erase stay at least 36px.
- On short screens (phones in Safari with the browser bars showing, laptops, iPad in landscape), the board shrinks to fit the height left after everything else, down to 280px wide, so the game doesn't scroll. The calculation includes the installed app's notch and home-bar padding. Only the play screen shrinks; Home, Learn, History, and Replay keep their width. Below 600px of height the board keeps its size and the page scrolls, since it couldn't fit anyway. On a 390 × 844 phone the board keeps its full width.

## Keys

- In Notes and Exclude, each key shows its digit in that digit's note position, larger than on the old row.
- Everything else is unchanged: filtered and finished digits dim, digit focus, the batch keypad labels, keyboard shortcuts, the walkthrough and lesson panels over the controls.

## Tests

- **Browser:** the keys form three rows of three in order; the modes stack to the left of the grid with Erase below them; the indicator sits on the active mode; the game fits without scrolling at ten phone, laptop, and iPad sizes; keys and tools stay at least 36px tall; Notes mode puts each digit in its note position.
