# Bold notes

Roadmap item: R23, bold notes. On October 15 Sean asked for a way to give a single note extra emphasis, such as the two cells of a pair. He turned down a first round of three options rendered in the app (a fifth Bold mode, tapping a note again to bold it, and a bold pen toggle beside Undo): each changed the trigger, the mark, or the keypad in a way he did not like. From a second round (hold the key, a note loupe over the cell, tapping Notes twice) he chose direction D's gesture, hold the key, with direction E's mark, a disc. Reference: ../designs/bold-notes-approved.png and ../designs/bold-notes-approved-dark.png.

## Gesture

- In Notes mode, a tap on a number key works as it does today: it adds or removes the note.
- Holding a number key for about 450 ms bolds that note in the selected cell, with a tap haptic. If the cell does not have the note yet, the hold adds it already bold. Holding the key of a bold note makes it plain again.
- A hold applies to every cell of a batch selection, like a tap does.
- The keypad looks the same as today. Nothing on the keys shows which notes are bold.

## Mark

- A bold note has a soft gray disc behind it and a heavier digit (weight 800), slightly larger than the other notes.
- When the bold note's number is focused, it keeps the blue focus chip and adds a thin ink ring, so focus and bold both read.
- Removing a note removes its bold.

## Rejected

- **Bold mode:** a fifth mode beside Numbers, Notes, Exclude, and Color. Easy to find, but the mode grid became cramped and cut off "Numbers" at phone width.
- **Tap again:** a tap cycled a note from none to plain to bold to none. No new control, but removing a plain note took two taps, and the keys needed rings to show where the cycle was.
- **Bold pen:** a B toggle beside Undo in Notes mode. It added a control and a state the player had to remember to turn off.
- **Note loupe:** tapping the selected cell again opened a magnified 3×3 of its notes. Direct, but it covered neighboring cells and worked on one cell at a time.
- **Notes twice:** tapping Notes again switched to a bold pencil. No new control, but a hidden state that stayed on.
- **Ring and big digit marks:** a thin ring read like ©, and a digit twice the size crowded its neighbors.

## Decisions

Sean accepted these defaults on October 15.

- Bold is saved with the game, and bolding or unbolding is one undo step.
- Fill notes keeps bold on the notes it keeps.
- Shift with a number key bolds from the keyboard, in Notes mode. The cell's accessible label says "bold" after each bold note, and a live region announces the change.
- Hints, lessons, and replays ignore bold.
