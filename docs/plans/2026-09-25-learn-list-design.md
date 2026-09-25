# Learn page: the technique list

Lessons were reachable only from the last step of a hint. The Learn page lists every lesson so a player can learn a technique before a game needs it, and see which ones they have learned.

## Direction

Sean chose A from three renders (full page, sheet over the game, Play/Learn tabs): a full page reached from a book button in the top bar, laid out like the lesson screen.

## Behavior

- **Entry.** A book button sits in the top bar, left of Settings. It opens the Learn page. The game is held untouched with its timer paused, the same way lessons hold it.
- **The page.**
  - Header: "‹ Your game", then "Learn" with "N of M learned" underneath.
  - Lessons are grouped Easy, Medium, Hard, and Expert, matching the puzzle picker's bands.
  - Each row shows a mini board, the lesson name, a green check when learned, and a chevron.
  - Lessons without practice boards (hidden quad) are left out.
- **Mini board.** Drawn from the lesson's example board: the pattern in gold, what the move removes or places in red, coloring chains in gold and blue, filled cells in gray.
- **Lessons from the list.** A row opens the existing lesson screen. Its back button reads "‹ Learn" and returns to the list, and finishing does the same. From a hint, a lesson still returns to the game.
- **Accessibility.** Mini boards are decorative (`aria-hidden`). Each row's accessible name includes "learned" when it is.

## Out of scope

The home screen (R11), achievements, and progress beyond learned status.
