# Fill lone notes

Roadmap item: optional sole-candidate autofill, from the September 21 playtest. On October 16 Sean chose direction A, fills itself, from three options rendered in the app: fills itself, tap to place, and a place key. Reference: ../designs/lone-notes-approved.png and ../designs/lone-notes-approved-dark.png.

## Rule

- A cell qualifies when it is empty, holds exactly one note, and the numbers placed in its row, column, and box rule out every other digit.
- Exclusions and other notes are not evidence. One note alone never proves anything.
- Only cells that the player's action just made qualify are filled. A cell that already qualified stays as it is.
- A fill clears its digit from its peers' notes, exclusions, and bold, but never fills another cell. The next fill needs another action from the player.

## Behavior

- Off by default. Settings has a "Fill lone notes" switch under Hide timer.
- Any entry from the keypad or keyboard can trigger it: placing a number, adding or removing a note or exclusion, erasing, and a batch of notes or exclusions.
- Fill notes, hints, undo, redo, and holding a key to bold a note do not trigger it. It never runs in a lesson.
- The number appears after a 250 ms beat and sits in a soft green ring that fades by 1.45 s. With reduced motion the ring stays still until it goes.
- The fill is part of the player's action: one Undo takes back both. A live region announces "Filled 2 in row 8, column 7".
- A fill that finishes the puzzle plays the whole-board celebration. Fills that complete a row, column, or box do not sweep it.
- A solve that used it still counts as clean, as Fill notes does: the fill only places what the player's notes and the placed numbers already prove. Sean decided this on October 16.

## Rejected

- **Tap to place:** a green ring on each proven lone note, and tapping the cell again placed it. The rings showed which lone notes were proven before the player worked it out, and an unmarked lone note gave away that it was not.
- **Place key:** a check key beside Redo, with a badge counting proven lone notes, that placed them all at once. The count was a hint, and the tool row was already full.
