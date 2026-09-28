# Number grid keypad

Roadmap item: R8, number grid keypad. On September 28 Sean chose A, tools beside the grid, from three directions rendered in the app (tools beside the grid, wide grid, grid on the board). Reference: ../designs/keypad-approved.png, ../designs/keypad-approved-notes.png, and ../designs/keypad-approved-dark.png.

## Layout

- The one-row number pad becomes a 3 × 3 grid on the right: 1 2 3, 4 5 6, 7 8 9, like a phone keypad and like a cell's notes.
- On the left, Numbers, Notes, and Exclude stack vertically, with Erase below them. The column is at least 122px wide, so the labels have room. The mode indicator slides up and down to the active mode.
- Keys are 56px tall, and 48px below 760px of height, where the keys and the tool column end level; the mode buttons and Erase stay at least 36px.
- On short screens (phones in Safari with the browser bars showing, laptops, iPad in landscape), the board shrinks to fit the height left after everything else, down to 280px wide, so the game doesn't scroll. The calculation includes the installed app's notch and home-bar padding. Only the play screen shrinks; Home, Learn, History, and Replay keep their width. On a 390 × 844 phone the board keeps its full width.

## Other screen shapes

On September 28 Sean asked how the grid fits the iPhone Duo's squat screens, then chose these after seeing them rendered (references: ../designs/keypad-side-by-side.png and ../designs/keypad-short-portrait.png):

- **Wide, short screens** (at least 5:4 and 500–820px tall: a folding phone open, laptops, iPads in landscape): the board takes the height on the left, up to 560px, and the modes, grid, and any lesson button sit beside it in one column, centered. The board is also capped by the width left for that column.
- **Short portrait screens** (under 630px tall and narrower than 5:4: a folding phone closed, or an iPhone SE, in Safari): the app bar folds into the difficulty and timer row, the focus bar shrinks to 36px, and the 3 × 3 grid stays. The logo and Install are left for Home; Home and Settings line up with the board's right edge. The same layout covers windows wider than 600px and up to 760px tall. On lesson screens the board also budgets for the lesson header and footer button. Sean chose this over falling back to the one-row keypad.
- **Landscape phones** (under 500px tall): unchanged; the page scrolls.
- The height formula reads the app bar's height from `--bar-height`, so the installed app's taller bar is counted.

## Keys

- In Notes and Exclude, each key shows its digit in that digit's note position, larger than on the old row.
- Everything else is unchanged: filtered and finished digits dim, digit focus, the batch keypad labels, keyboard shortcuts, the walkthrough and lesson panels over the controls.

## Tests

- **Browser:** the keys form three rows of three in order; the modes stack to the left of the grid with Erase below them; the indicator sits on the active mode; the game fits without scrolling up or sideways at 28 phone, folding phone, laptop, and iPad sizes, including the 5:4, 600–629px, and 630–699px boundaries; lessons fit on short phones; a lesson's button can be tapped beside the board; keys and tools stay at least 36px tall; Notes mode puts each digit in its note position.
