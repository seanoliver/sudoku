# Fill notes skips empty cells

## Context

The September 21 playtest reported individual cells left without notes after Fill notes. Sean clarified that affected cells included both previously noted cells and cells with no visible notes. On September 22 he specified that Fill notes must replace all possible notes regardless of existing notes, retaining exclusions.

## Key findings

- `fillNotes` computed candidates, then skipped every cell whose `noteOrigins` was `manual`.
- Editing notes or exclusions marks the whole cell as manual. Removing the last annotation retains that flag. The cell appears empty but remains ineligible for filling under the previous contract.
- Pressing Backspace on an already-empty cell in Notes or Exclude mode also creates manual ownership. The value-mode no-op guard does not cover annotation modes.
- Existing tests and the September 15 design explicitly protected manual cells. The requested behavior supersedes that policy.
- A seeded control sample of 600 board states, covering 24,800 empty cells, produced no missing candidates in untouched cells. This does not establish the exact action history of Sean's saved puzzle.

## How it works

The candidate calculation checks placed values in the row, column and box, then removes explicitly excluded digits. It never uses the stored solution or advanced deductions. The old fill path applied a second eligibility check based on manual ownership. That check caused the reproduced omissions.

The corrected fill path replaces notes in every empty cell with its candidate set, preserves exclusions and placed values, and marks nonempty generated notes for blue rendering. Save validation accepts generated notes alongside exclusions while preserving their disjointness. One history entry restores notes, exclusions and origins together. Repeating an unchanged fill creates no history.

## Reproduction

Use Hard seed 1, cell r1c1. Its legal digits are 2, 4 and 9.

| Prior action | Previous Fill result | Corrected Fill result |
| --- | --- | --- |
| None | 2, 4, 9 | 2, 4, 9 |
| Add note 2 | 2 | 2, 4, 9 |
| Add and remove note 2 | Empty | 2, 4, 9 |
| Exclude 2 | No positive notes; exclusion 2 | Notes 4, 9; exclusion 2 retained |
| Add and remove exclusion 2 | Empty | 2, 4, 9 |
| Clear generated notes | Empty | 2, 4, 9 |
| Backspace in an empty cell with Notes enabled | Empty | 2, 4, 9 |

The original browser reproduction in the local production build also left r1c1 empty while populating the other cells. See the [before screenshot](../screenshots/fill-notes-skipped-empty-cell.png).

## Gotchas

- A truly impossible cell can still have no candidates because of placed values or exclusions. Fill notes must not invent a candidate in that case.
- Candidate completeness cannot be inferred from the number of visible pencil marks.
- Clearing or toggling an annotation can leave a manual origin, but the corrected fill no longer uses that origin to decide eligibility.
- Old notes and exclusions remain unchanged until the player explicitly uses Fill notes. Existing saves are accepted without resetting the puzzle.
- No original playtest save was available. The reproduction establishes the defect and likely mechanism. The exact playtest action sequence remains unknown.

## Verification

- Deterministic reproduction: `node --experimental-strip-types docs/investigations/repro/fill-notes.mjs --expect-fixed` checks ten prior states, save/restore results, Undo and the 600-board control sample.
- Six updated/new test cases failed under the old implementation. The corrected implementation passes all 72 tests, lint, typecheck and the production build.
- Pre-fix browser checks against the local production build covered an untouched cell, a manual note, a removed exclusion and Backspace in an empty cell with Notes enabled.
- Post-fix browser checks against the local production build passed for untouched cells, manual notes, removed exclusions, empty erasure and retained exclusions. Each case passed reload, exact Undo restoration and repeated-fill no-op checks. The [after screenshot](../screenshots/fill-notes-retained-exclusions.png) shows generated 4 and 9 alongside the retained crossed-out 2.

## References

- [Game transitions and save validation](../../src/lib/game.ts)
- [Candidate calculation](../../src/lib/candidates.ts)
- [Regression tests](../../tests/manual-notes.test.ts)
- [Runnable reproduction](repro/fill-notes.mjs)
- [Original ownership design](2026-09-15-manual-notes.md)
- [Bug journal](../bugs/2026-09-22-fill-notes-manual-cells.md)
