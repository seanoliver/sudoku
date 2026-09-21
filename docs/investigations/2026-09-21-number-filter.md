# Optional number-key filtering

## Context
Sean approved direction A, muted unavailable keys, for the optional constraint-aware number picker. Implementation is isolated in .worktrees/number-filter from main after PR #13.

## Key findings
- Existing playable candidates include manual exclusions and exclude occupied cells, so they cannot define replacement-key availability.
- The peer table excludes the selected cell itself. A peer-value helper gives replacement-safe choices without reading notes, exclusions, deductions, or the solution.
- Batch annotation mode already determines pencil/exclude independently of single-cell mode; both remain exempt from filtering.

## How it works
getEntryDigits takes only values and index. The keypad and game entry guard use the same helper. Filter number keys defaults off, migrates missing/invalid flags to false, and saves immediately. Rejected keyboard entries announce a constraint-specific message without changing state. Block incorrect answers still rejects legal-but-wrong entries separately. Native disabled keys have explicit accessible labels and muted theme-aware styling. Empty availability shows guidance while retaining erase and undo.

## Gotchas
- Manual exclusions must never constrain the picker. A legal digit is not necessarily the solution.
- Replacing a value must ignore itself but still consider every peer.
- New preferences require updating older full-object assertions without weakening migration coverage.
- Physical iOS/Safari remains untested; native touch checks used Chromium. Browser coverage was exercised through Playwright MCP, not committed as a new test stack.

## Verification
- Baseline 63 tests passed. Three initial new behavior tests failed before implementation. Final suite: 69 passing tests, including six filtering tests. Lint, TypeScript, production build/service-worker generation, and whitespace checks pass.
- Playwright on the production build: default off, persisted toggle, exact enabled digits, keyboard rejection with unchanged serialized game/history, independent solution blocking, legal incorrect entry when answer blocking is off, ignoring manual exclusions, replacement, erase, undo, restart, new puzzle, and all-keys-disabled feedback.
- Single note/exclusion addition and removal and both batch modes permit constrained digits. Disabling filtering restores all keys and permits duplicate input when answer blocking is also off.
- Chromium native touch: disabled key leaves saved state unchanged, enabled key enters its digit.
- Light/dark and Settings phone screenshots inspected against approved direction A. Board margins are 17px each at 390x844; viewport and document client width match. No horizontal overflow at 320, 390, and 1100px.
- A browser script used capitalized Light instead of the lowercase accessible name light; corrected the selector and continued. No application failure was involved.

## References
- ../plans/2026-09-21-number-filter-design.md
- ../plans/2026-09-21-number-filter.md
- ../designs/number-filter-approved-a.png
- ../screenshots/number-filter-light.png
- ../screenshots/number-filter-dark.png
- ../screenshots/number-filter-settings.png
- ../../src/lib/sudoku.ts
- ../../src/lib/game.ts
- ../../tests/number-filter.test.ts
