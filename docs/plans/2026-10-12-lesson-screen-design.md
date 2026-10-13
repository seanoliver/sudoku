# Lesson screen

Roadmap item: R13, app polish, step 6. On October 12 Sean chose direction B, one coach card, from three options rendered in the app (name in the header, one coach card, coach above the board). Reference: ../designs/lesson-approved.png (watch, practice, wrong, correct, and done at 375 × 667), with dark mode in ../designs/lesson-approved-dark.png. All options: ../designs/lesson-options-watch.png and ../designs/lesson-options-practice.png.

## One name

- The technique's name appears once, in the top bar, above the practice dots.
- The strip above the board goes, so the board has its full card. On a 375 × 667 phone the lesson board grows from 286 to 325px, where the screen's width limits it.
- The walkthrough card loses its "Pointing pair · 1 of 2" line; the progress segments already show the step.

## The coach card

One card under the board (beside it on wide screens) holds everything the lesson says and the one action:

- **State line:** an icon and a short line. Watch: bulb, "Watch how it works". Practice: bulb, "Find the pointing pair". Wrong: cross, "Not quite". Correct: check, "Found it".
- **Watching, or reviewing a wrong move:** the state line, the step's progress segments, the step text, then Back and Next. On the last step Next becomes the lesson's action: Start practice, or Try again. The card is as tall as its text; the keypad is hidden.
- **Practicing:** the state line with the action on its right (Check, Next board, Finish), then the keypad as today.
- **Correct:** the card tints green. **Wrong:** it tints red.
- **Done:** the card becomes the learned message with the way back, as today.
- The full-width footer button goes.

## Unchanged

- Hint walkthroughs in a game keep their current panel.
- The lesson's top bar: the back control, the name, and the practice dots.
- Reduced motion, the double-tap guard on the action, and focus moving to the action after the last step.
