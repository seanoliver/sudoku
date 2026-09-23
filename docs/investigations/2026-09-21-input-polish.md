# Settings, restart and immediate drag

## Context
Sean approved Settings option B with icons next to gameplay preferences, requested a gear button, and removed Settings greetings and Done. This pass also implements the previously requested immediate drag and header cleanup.

## Key findings
The game and clock save independently. Clock cleanup writes elapsed time, so directly clearing its storage before restarting could be overwritten by cleanup. The selection hook already samples movement segments and restricts touch panning on cells while allowing pinch zoom.

## How it works
The top app-bar brand is the single h1. Settings groups New puzzle and Restart puzzle above Appearance and three icon-labeled gameplay switches. Preferences retain immediate persistence; close via the x, Escape or backdrop.

Restart confirmation clears entries, annotations and history using restartGame, retaining puzzle ID, difficulty, givens and solution. Transient selection, focus and modes clear and play resumes. Clock receives a reset revision: the old effect saves during cleanup, then the new effect starts from zero and saves the reset for the same puzzle ID.

Movement beyond 8px starts empty-cell selection immediately. Filled-cell drags cancel focus, stationary holds remain supported and batch modes survive extension.

## Gotchas
Restart is a fresh attempt and cannot be undone, stated in confirmation. Full attempt/replay history remains future work. A new puzzle still opens difficulty selection. Native browser clock cleanup also overwrites test storage injection during reload; verify with actual elapsed time instead.

## Verification
- 61 baseline tests passed. Two restart tests failed before implementation, then all 63 passed.
- Tests verify reset from edited/completed states, identity preservation, immutability, history clearing and restore validation.
- Playwright reproduced and verified immediate drag, filled-cell skipping, batch mode preservation, filled-cell hold and drag cancellation.
- Native Chromium touch events verified immediate selection and touch cancellation without a later hold firing.
- Restart cancellation preserved saved game; confirmation cleared progress, reset a running timer from 01:48, and reload showed 00:00.
- Preference switches persisted without Done; New puzzle created a new Medium puzzle.
- Production screenshots inspected in light and dark. At 390×844 board margins are 17px and no scrollbar consumes width. No horizontal overflow at 320/390/1100 widths.
- Lint, typecheck, tests, production build and service-worker generation passed. No production JavaScript errors observed.
- Physical iOS/Safari gesture testing remains unverified.

## References
- ../plans/2026-09-21-input-polish-design.md
- ../plans/2026-09-21-input-polish.md
- ../bugs/2026-09-21-immediate-drag-selection.md
- ../screenshots/input-polish-settings.png
