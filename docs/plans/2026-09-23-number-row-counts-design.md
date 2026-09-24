# Number row without counts

Roadmap item: R4, number-row presentation. Sean's playtest note said the remaining counts under the number keys look messy. On September 23 he chose direction C (no count, finished digits fade) from three options rendered in the app (progress bar, remaining dots, no count). Reference: ../designs/number-row-approved.png.

## Behavior

- The small remaining count and the finished check under each number key are removed in every mode.
- A digit with nine placements on the board is finished: its key loses its fill and shadow, and the digit fades to secondary gray at 35% opacity. The key stays enabled (unless Filter number keys disables it for the selected cell), so digit focus and annotation behavior are unchanged. Finished keys fade in the batch keypad too, and show no hover fill.
- "Placed" counts every entry on the board, correct or not. With Block incorrect answers on (the default) the two are the same; with it off, counting only correct entries would reveal correctness.
- Erasing or undoing a placement restores the key.
- Number keys add ", all placed" to their accessible name when finished.

## Scope

A 3 × 3 number grid in place of the row is tracked separately as roadmap item R8.

## Verification

- Existing tests pass; no logic changed.
- Browser at 390 × 844, light and dark, in Numbers, Notes and Exclude: finished and unfinished keys, the accessible name, and a key restoring after undo.
