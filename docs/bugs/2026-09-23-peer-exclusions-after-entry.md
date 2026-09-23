# Exclusions survive a placement in the same row, column or box

## Symptom
Sean excluded 3 from two empty cells in a column, then entered 3 elsewhere in that column. The struck-out 3s stayed in both cells. Notes of the placed digit already disappeared from related cells; exclusions did not.

## Root cause
`enter()` in `src/lib/game.ts` removed the placed digit from `notes` of every peer (same row, column or box) but never touched `exclusions`. Exclusions were added after the peer-clearing line was written, and the cleanup was not extended to them.

## Reproduction
1. Exclude a digit (Notes → Exclude → digit) in two empty cells of one column.
2. Select another empty cell in that column and enter the same digit.
3. Before the fix: both cells still show the struck digit.

## Fix
The peer loop in `enter()` now filters the placed digit out of both `notes[peer]` and `exclusions[peer]`. Unrelated exclusions in those cells and exclusions outside the peer set are kept. Undo restores the previous snapshot, including the exclusions. The help text now says entering a number clears matching notes and exclusions.

## Verification
- New unit test in `tests/manual-notes.test.ts`: exclusions of the placed digit clear in a row peer, a column peer and a box peer; another digit's exclusion in a peer stays; a non-peer's exclusion stays; undo restores the original state. It failed before the fix and passes after (88/88).
- Browser: excluded 6 in two cells of column 1 and noted 6 in a third, entered 6 at the top of the column. Both exclusions and the note cleared, with no struck marks left.

## Recurrence guardrail
Any new per-cell annotation type must be added to the peer cleanup in `enter()`. The unit test covers both notes and exclusions, so dropping either from that loop fails CI.
