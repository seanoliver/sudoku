# Block incorrect exclusions

Roadmap item: 5, Chosen deductions, which Sean dropped on September 28 while keeping this part. He skipped rendered directions because it reuses the approved rejected-entry feedback (../plans/2026-09-23-rejected-entry-feedback-design.md). Reference: ../screenshots/block-exclusion.png.

## Behavior

- With Block incorrect answers on, crossing out a cell's answer in Exclude mode is refused. The cell shows the same red struck digit, shake, and pale red fill as a refused number, and nothing is saved.
- A batch exclusion is refused whole when the digit is the answer in any selected cell. Only those cells show the rejection; the selection stays so another digit can be tried.
- Crossing out a wrong digit, removing an existing exclusion, notes, and exclusions from hints are unchanged. Exclusions already in saved games are kept.
- With Block incorrect answers off, nothing changes.
- Screen readers hear "5 rejected, it is the answer for this cell", or in a batch "for 1 of 3 selected cells".
- Learn practice boards follow the setting too, as they already do for wrong numbers: crossing out the answer is never a correct elimination.
- With Filter number keys on, a batch is still refused when an answer cell would have been skipped because a peer holds a wrong copy of the digit. That board already has a wrong number, so the refusal is accepted.
- The setting's description becomes "Refuse wrong numbers, and crossing out right ones".

## Tests

- **Unit:** single-cell rejection only with blocking on; removal never rejected; a batch refused whole and accepted without the answer cell; `incorrectExclusions` lists the cells.
- **Browser:** single-cell rejection and its announcement, a wrong digit still crossed out, blocking off, and a drag-selected batch refused with only the answer cell marked.
