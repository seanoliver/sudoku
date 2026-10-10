# Sheets

Roadmap item: R13, app polish, step 4. On October 9 Sean chose direction A, card sheet, for Settings, New puzzle, How to play, and Install, and direction C's centered alert for Restart, from three options rendered in the app (card sheet, popover, pages). Reference: ../designs/sheets-approved.png, with New puzzle, Restart, and dark beside it, and the motion in sheets-approved.webm. All options against today's sheets: ../designs/sheets-options.png.

## Card sheet

- On a phone the sheet rises from the bottom (420ms, the iOS sheet curve) and stops short of the top. The game behind shrinks to 93%, moves down slightly, rounds its corners, and dims; the area around it turns black. On wider screens the sheet stays a centered card and rises the same way.
- Closing plays the reverse: the sheet drops and the game grows back.
- A grab handle sits at the top. Dragging the handle down moves the sheet with the finger; letting go past 100px, or with a quick flick, closes it, and anything less springs it back.
- Escape, the close button, and a tap on the dimmed background close it the same way. A second Escape while it is closing closes it at once.
- Focus returns to the button that opened it.

## Restart alert

- Restart opens as a small card in the middle of the screen with the restart symbol, the question, the warning, and the two buttons, centered. It pops in (240ms, slight overshoot) and fades out.
- Opened from Settings, the sheet turns into the alert in place, and the game behind grows back while the alert pops in.

## Settings fixes

- The line under the puzzle actions ("Choose a new puzzle or start this one over.") is removed; the buttons say it.
- In dark mode the Restart and Fill notes buttons are lighter than the sheet instead of darker.

## Reduced motion

- No sliding, shrinking, or popping. Sheets and the alert fade in and out (150ms).

## Not in this step

- How to play as short rows with small illustrations: it needs its own rendered directions first.
