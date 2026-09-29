# Undo descriptions

Roadmap item: 3, Recovery, first release (action descriptions). On September 28 Sean chose D, tool-row buttons with a focus-bar description, after seeing three directions rendered in the app (tools and board flash, last-action chip, history sheet). The chip in B pushed the keypad off screen at 22 of the 32 sizes in the fit test, including the iPhone Duo closed, so D combines A's buttons with B's description in the focus bar. Reference: ../designs/undo-approved.png, ../designs/undo-approved-dark.png, ../designs/undo-approved-short.png, and ../designs/undo-approved.webm.

## Buttons

- Undo, Erase, and Redo share the row under the modes, in that order. Erase keeps the middle and is slightly wider. Each is at least 36px tall, as Erase is now.
- Undo and Redo dim when there is nothing to undo or redo, and while paused, generating, or locked in a lesson.
- Undo and Redo leave the Settings sheet. The ⌘Z and ⌘⇧Z shortcuts are unchanged.

## What changed

- An action is described by its kind and its cells:
  - **Number** when any cell's number changed. The cells are the ones whose number changed, not the peers whose notes were cleared.
  - **Exclusion** when any cell gained an exclusion, or when only exclusions changed.
  - **Notes** otherwise, such as notes added or removed, a note batch, or Fill notes.
- The kind is read from the action in the order it was made, for both undo and redo, so undoing an exclusion is still an exclusion.
- Colors follow the modes: blue for numbers, note blue for notes, note red for exclusions.

## Feedback

- **Board:** the action's cells get a dashed outline and a tint in the kind's color, which fades over 1.6s. Reduced motion shows the outline without the fade.
- **Focus bar:** for 3 seconds the bar shows, in the kind's color, the Undo or Redo arrow, a mini-board of the cells, and the kind's icon with the count. The hint button stays on the right. The mini-board is hidden in the short layout, where the bar is 36px tall.
- The bar returns to digit focus early on the next edit, a new digit focus, or a hint. A hint takes the bar over.
- **Assistive tech:** a status announcement, such as "Undid notes in 4 cells" or "Redid a number in 1 cell". No visible text.

## Unchanged

- History is still bounded at 200 snapshots, persists across reopening, and a new edit clears Redo. Nothing new is saved: the description is derived from the two snapshots.
- Replay still records undo and redo as ordinary changes.

## Tests

- **Unit:** describing an action as a number, notes, exclusion, a note toggle that removes an exclusion, an exclusion that removes a note, a note batch, and Fill notes; number actions count only the cells whose number changed.
- **Browser:** the tool row shows Undo, Erase, and Redo in order; Undo and Redo are disabled with no history; Undo outlines the cells and describes the action in the focus bar, then the bar returns to focus; the announcement text; Redo does the same with the redo arrow; Settings no longer has Undo or Redo; the existing fit test still passes at every size.
