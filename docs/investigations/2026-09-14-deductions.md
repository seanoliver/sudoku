# Shared candidate deductions

## Context
Auto notes previously counted legal placements independently of Smart highlighting. Sean requested Pointing pairs and Hidden pairs, each independently enabled in Settings with explanations and examples. Both displays must reflect chained deductions.

## Key findings
- Candidate calculation must begin with every legal digit in every empty cell. The visible Auto notes are intentionally incomplete because they only show digits with one or two placements per box.
- Manual notes are user annotations; an absent note does not mean a candidate has been eliminated.
- A shared candidate board prevents notes and highlights from applying different deductions or different numbers of passes.

## How it works
- `getCandidates` builds sets from placed values, then runs enabled rules until no candidates change. Rules only remove candidates, so this loop terminates.
- Pointing pairs require exactly two cells for a digit in a box and a shared row or column. Only cells outside the source box lose the digit.
- Hidden pairs require two digits with the same two possible cells in one house. All other candidates are removed from those two cells. Houses include rows, columns, and boxes.
- `candidateCells` supplies Smart highlighting; `automaticNotes` applies the existing one-or-two-placements-per-box threshold to the same candidate board.
- Candidate results are derived rather than saved. Disabling a rule, changing entries, erasing, undoing, or restoring a game starts calculation from the current values.
- `DEDUCTIONS` supplies identifiers, descriptions, rule functions, default settings, and known preference keys. Add a rule there plus a corresponding example in `EXAMPLES` in `deduction-settings.tsx`; the iteration loop, preference migration, and Settings list need no new branches. Add direct rule tests and extend the solution-preservation configurations.

## Gotchas
- Pointing triples, claiming pairs, naked pairs, and automatic value entry are outside this version's scope.
- If entries conflict, a cell has no candidates, or a house has no placement for a missing digit, use basic candidates. The same fallback applies when a rule first exposes the contradiction.
- Manual notes can still show a digit eliminated by deductions; enabling rules does not overwrite user annotations. Settings explains this distinction.
- An example disclosure can be opened independently of its rule toggle. Native `details`/`summary` provides keyboard behavior, and each diagram has a complete accessible text description.

## Verification
- 34 tests pass. Coverage includes both pointing orientations, hidden pairs in each house type, negative patterns, repeated deduction, independent rule flags, legacy/malformed preferences, entry/erase/undo, and contradiction fallback.
- All four rule combinations preserve the known solution candidate in every empty cell across 60 generated puzzles (20 seeds per difficulty).
- A hard puzzle generated with seed 2 needs another pointing-pair pass after a hidden-pair reduction; the test verifies the additional eliminations and that neither rule can change the final result.
- An independent code review found no implementation defects and identified a missing test for contradictions exposed after deduction. The added fixture uses hard seed 1 with an incorrect 2 entered at index 30.
- Type checking, ESLint, and the production build pass.
- Playwright verified legacy default-off behavior, both display updates, newly created notes, independent toggle persistence, restoration on disable, chained rules, preservation of saved values/manual notes, entry/undo, keyboard switches and disclosures, and examples that do not enable rules.
- Mobile light/dark examples were visually inspected. No horizontal overflow at widths 320, 390, or 1024. The 390 × 844 board capture has equal 17px margins and no scrollbar width loss. The desktop page's vertical scrollbar accounts for its smaller client width.
- No browser console errors on the local production build.

## References
- `src/lib/deductions.ts`
- `src/lib/candidates.ts`
- `src/lib/preferences.ts`
- `src/components/deduction-settings.tsx`
- `src/components/game.tsx`
- `tests/deductions.test.ts`
- `tests/candidates.test.ts`
- `tests/preferences.test.ts`
- `docs/plans/2026-09-14-deductions-design.md`
