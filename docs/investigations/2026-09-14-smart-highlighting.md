# Smart highlighting

## Context
Sean requested optional highlights for legal empty cells corresponding to the selected filled cell's digit. The approved behavior clears these highlights when an empty cell is selected.

## Key findings
- Related-cell highlighting already exists and is controlled by `highlightPeers`.
- Active-number highlighting uses the selected cell's current value. No persistent digit selection is needed.
- The Sudoku library already caches row, column, and box peers for each cell.
- Preferences use a versioned localStorage key. Old valid records must retain their settings when the new field is absent.

## How it works
`possibleCells(values, digit)` returns empty indexes with no matching digit among their peers. The component derives this set from current game values, selection, completion status, and the opt-in `smartHighlighting` preference. Each candidate gets a green background and an accessible description naming the digit. Related-cell and smart highlighting remain independent. No solution data or pencil notes influence the calculation.

## Gotchas
- Legal placements are possibilities, not guaranteed answers; incorrect user entries also constrain them.
- Selecting an empty cell clears highlights, including after undo removes the selected entry.
- The CSS background transition can produce an intermediate color if inspected immediately after a click. Browser color checks waited for the settled color or used reduced motion.
- Theme buttons have lowercase accessible names despite CSS capitalization.
- Missing or malformed `smartHighlighting` defaults to false without resetting other valid preferences.

## Verification
- All 14 Node tests pass, including row/column/box and occupied-cell exclusion, invalid digits, notes, current entries, undo, and preference migration.
- Type checking, ESLint, and production build pass.
- Playwright MCP checked the production app at localhost:3100: opt-in default, exact candidate sets, different selected digits, entry and undo, empty selection, accessible descriptions, independent switches, and persistence after reload.
- Confirmed light candidate color `rgb(225, 242, 231)` and explicit/system dark color `rgb(41, 71, 56)`.
- Inspected desktop light, mobile dark, and mobile settings screenshots. No browser console errors.

## References
- `src/lib/sudoku.ts`: peer table and possibleCells
- `src/lib/preferences.ts`: settings migration
- `src/components/game.tsx`: selection, settings and board rendering
- `src/app/globals.css`: theme colors and highlight precedence
- `tests/sudoku.test.ts`
- `docs/plans/2026-09-14-smart-highlighting-design.md`
- `docs/plans/2026-09-14-smart-highlighting.md`
