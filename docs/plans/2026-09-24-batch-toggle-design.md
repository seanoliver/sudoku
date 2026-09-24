# Batch notes and exclusions toggle off

Sean asked on September 24 to remove a note from several selected cells at once by tapping its number.

- In a batch, if every selected empty cell already has the note (Notes) or exclusion (Exclude) for the tapped number, the tap removes it from all of them. Generated notes count as notes.
- If only some selected cells have it, the tap adds it to the rest, as before.
- Removal is one undo step, marks the cells' notes as the player's own, and is allowed with Filter number keys on.
- The key's accessible name says "Remove note 5 from 2 selected cells" when the tap will remove.
- `addNotes`/`addExclusions` are renamed `toggleNotes`/`toggleExclusions`; `batchHasMark` decides removal for both the engine and the key label.
