# Undo and Redo beside Erase

Roadmap item: 3, Recovery, first release (action descriptions). On September 28 Sean chose D, tool-row buttons with a focus-bar description, from three directions rendered in the app (tools and board flash, last-action chip, history sheet) and a hybrid of the first two. After using the built version the same day, he dropped the focus-bar description and the cell outline as hard to read and unnecessary: Undo and Redo buttons are enough. Reference: ../screenshots/undo-descriptions.png and ../screenshots/undo-descriptions-short.png.

## Buttons

- Undo, Erase, and Redo share the row under the modes, in that order. Erase keeps the middle and is slightly wider. Each is at least 36px tall, as Erase is now.
- Undo and Redo dim when there is nothing to undo or redo, and while paused, generating, or locked in a lesson.
- Undo and Redo leave the Settings sheet, which keeps New puzzle, Restart puzzle, and Fill notes. The ⌘Z and ⌘⇧Z shortcuts are unchanged.

## Screen readers

- Each undo or redo is announced, such as "Undid notes in 4 cells" or "Redid a number in 1 cell". Nothing is shown on screen.
- The kind is **number** when any cell's number changed, counting only those cells and not peers whose notes were cleared; **exclusion** when a cell gained an exclusion, or only exclusions changed; **notes** otherwise, including Fill notes that only changes who owns the notes.
- The kind is read from the action in the order it was played, so undoing an exclusion is still an exclusion.

## Unchanged

- History is still bounded at 200 snapshots, persists across reopening, and a new edit clears Redo. Nothing new is saved.

## Tests

- **Unit:** describing and announcing each kind, including note and exclusion edits that change both, and Fill notes.
- **Browser:** the tool row order and disabled states; the buttons undo and redo and announce it; Settings no longer has Undo or Redo; the fit test passes at every size.
