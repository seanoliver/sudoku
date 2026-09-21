# Batch exclusions and grouped keypad

## Context
The next roadmap milestone extends batch notes to exclusions. Sean chose rendering C: one panel containing selection count, mode controls, digit keys and help text.

## Key findings
- Batch notes already use one atomic history snapshot. Exclusions can use the same snapshot format without save migration.
- Single-cell exclusion input toggles; batch input must instead add consistently across mixed selections.
- Annotation ownership is cell-level. Excluding a digit claims the affected cell as manual while preserving its other notes.
- Repeated holds while extending selection must not reset the chosen batch mode.

## How it works
addExclusions validates and deduplicates targets, skips filled cells and already-excluded digits, removes matching positive notes, claims changed cells, and records one snapshot. The game dispatches either addNotes or addExclusions based on transient batch mode. N/X choose the mode while selected. Completing a batch clears selection, restores board focus and returns to value entry. Digit focus is independent.

The contextual keypad replaces the normal tool row during selection. Its native buttons expose pressed states and explicit per-digit accessible names. Clear selection and Escape cancel without changes. The existing hook initializes mode only when beginning a new selection.

## Gotchas
- No-op batches must preserve object identity and history length.
- Keyboard focus must return to the board when a panel button disappears.
- Browser captures need time for color transitions even with reduced-motion emulation.
- Use localhost for Next dev resources; 127.0.0.1 was blocked by dev-origin checks. Production testing used a fresh browser context to avoid stale service workers.

## Verification
- 58 baseline tests passed. Three new engine tests initially failed with missing addExclusions; all 61 tests now pass.
- Tests cover mixed notes/exclusions, duplicate/invalid/filled targets, no-op identity, ownership, no mutation, candidate removal, round-trip saves and atomic undo.
- Playwright verified explicit exclusion, batch notes, N/X mode switching, preserving Exclude while holding more cells, independent focus/selection clearing, Escape focus return, batch finish and reload/undo.
- Phone widths 320 and 390 and desktop width 1100 showed no horizontal overflow; panel edges match board edges.
- Production screenshots in both themes were inspected at 390×1020 with equal 17px board margins.
- Lint, typecheck, production build/service-worker generation and diff checks passed. Production page reported no JavaScript errors.
- Physical iOS/Safari gesture checks have not been run.

## References
- ../plans/2026-09-21-batch-exclusions-design.md
- ../plans/2026-09-21-batch-exclusions.md
- ../screenshots/batch-exclusions-panel.png
- ../screenshots/batch-exclusions-dark.png
