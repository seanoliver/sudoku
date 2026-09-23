# Deduction automation and Hard puzzle difficulty

## Context

Sean reported that fresh Hard puzzles show only one possible placement per digit in each box with deductions enabled, and that note animations are not visible. Investigated PR #3 at commit c6f0051 before changing behavior.

## Key findings

Generated 100 Hard puzzles with seeds 1 through 100. Each had 53 empty cells. Ran `getCandidates` on their givens with four configurations:

| Enabled rules | Puzzles with every empty cell reduced to one candidate | Single-candidate cells across 5,300 empty cells |
| --- | ---: | ---: |
| None | 0 | 153 |
| Both pair rules | 0 | 174 |
| Hidden singles | 71 | 4,276 |
| All three | 86 | 4,795 |

This sample demonstrates a gameplay problem with unrestricted deduction chaining. It does not establish the distribution across every possible generated puzzle.

## How it works

`getCandidates` repeats enabled rules until no further eliminations occur. Hidden singles reserve a cell and eliminate the digit from its peers, allowing more singles to emerge without the player entering a value. The candidate state can therefore encode the complete answer before play begins.

The generator targets 42, 34, or 28 givens for Easy, Medium, or Hard and checks uniqueness. It does not rate the techniques needed to solve the puzzle.

`CellNotes` intentionally suppresses initial-render animations. Filling a cell immediately hides its notes. Animations occur when visible automatic notes change in other empty cells. In this sample, entering the first available single with all rules enabled changed no other automatic notes in any of the 100 puzzles. This provides a plausible explanation for the report without establishing the user's exact device state or reduced-motion preference.

## Gotchas

A correct deduction engine can still remove most of the intended gameplay. Solution-preservation tests do not measure how much reasoning remains for the player. A single mutable pass is also not necessarily one logical step: deductions earlier in the pass can influence later deductions.

## Verification

Used Node's TypeScript stripping to import `generatePuzzle`, `getCandidates`, and `automaticNotes` directly. For each seed and configuration, counted singleton candidate sets in empty cells and compared automatic notes before/after placing the solution digit in the first singleton. Read the generator, candidate loop, and animation lifecycle. No production behavior changed in this investigation.

## References

- `src/lib/sudoku.ts`: generator and clue targets
- `src/lib/candidates.ts`: fixed-point deduction loop
- `src/lib/deductions.ts`: hidden singles propagation
- `src/components/cell-notes.tsx`: initial-render and filled-cell behavior
- `docs/plans/2026-09-14-learning-and-automation-follow-up.md`

## Recommended next step

Prioritize a gameplay spike before merging PR #3. Compare unrestricted chaining with deductions based on the candidate state before each move, and with explicit player-triggered deduction steps. Record deduction reasons and measure remaining choices on the same seeded puzzles. Evaluate note-change visibility during actual play. Rate difficulty by required reasoning and enabled assistance before introducing another tier.
