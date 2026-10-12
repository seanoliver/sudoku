# Finish moment

Roadmap item: R13, app polish, step 5. On October 11 Sean chose direction A, result card, from three options rendered in the app (result card, board summary, finish sheet). Reference: ../designs/finish-approved.png, with a new best time, dark, and pause beside it. All options: ../designs/finish-options.png.

## Result card

- When the puzzle is solved, the keypad card becomes a result card in the same place. The solved board stays fully visible above it.
- First row: a solid green check, the solve time large, and the difficulty with its level bars on the right.
- Second row, small chips:
  - Best time at this difficulty, with a clock icon. When this solve beats an earlier one, the chip becomes a "Best time" badge in the hint colors with the sparkles icon instead.
  - Note steps during the solve (adding or removing notes, as Replay counts them), with the pencil icon.
  - Fixes (wrong numbers erased and replaced), with the undo icon.
- Third row: Replay and Play again, side by side and the same size. Without a replay, Play again fills the row and the note and fix chips are left out.
- The first solve at a difficulty shows no best chip. With the timer hidden in Settings, the time and the best chip are left out, and the check sits beside the difficulty.
- "Nicely done. Every number in its place." is removed; the check and the time say it.
- However the puzzle is finished (typing, a hint's Apply, or Redo), screen readers hear one announcement: solved, the time, the difficulty, and a new best when there is one. The same line starts the card, and each chip has its own spoken text.

## Pause and completion

- The empty focus strip above the board is hidden while paused and once the puzzle is solved.
- Pause otherwise stays as it is.

## Reduced motion

- The card fades in; nothing moves.

## Not in this step

- Hints used during the solve: the app does not record them yet.
