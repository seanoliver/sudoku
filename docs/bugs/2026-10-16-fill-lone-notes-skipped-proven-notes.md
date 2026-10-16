# Fill lone notes skipped some proven lone notes

## Symptom
With Fill lone notes on (TestFlight build 12), some cells whose one note was the only number left filled, and identical-looking ones stayed as notes.

## Root cause
`fillLoneNotes` filled only cells that the player's latest entry newly proved: it compared the proven lone notes before and after the entry and skipped any cell that already qualified. A cell that became a proven lone note any other way stayed a note for the rest of the game:
- a fill's own peer cleanup (the no-chain rule)
- Fill notes, a hint, a bold hold, undo or redo
- turning the setting on mid-game

## Reproduction
1. Turn on Fill lone notes.
2. Write the note 2 in a cell whose row, column, and box already rule out every other digit, while the setting is off; then turn it on.
3. Make any other entry. Before the fix, the 2 stayed a note.

## Fix
After each entry, fill every proven lone note in a cell whose notes the player wrote or edited (`noteOrigins` is `manual`), in one pass. Notes from Fill notes are `generated`, so they wait until the player edits the cell; that keeps Fill notes plus one tap from solving the board. A cell a fill proves still waits for the next entry (#122).

## Verification
- `tests/lone-notes.test.ts`: a proven lone note fills on an unrelated entry; Fill notes' lone notes do not fill until edited; fills prove no more cells in the same entry.
- `e2e/lone-notes.spec.ts`: the same two cases in Chromium and WebKit.

## Recurrence guardrail
Both unit and browser tests pin that a proven lone note the player wrote fills on any later entry. A change back to "newly proven only" fails them.
