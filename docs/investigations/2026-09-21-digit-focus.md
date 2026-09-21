# Digit focus and filled-cell holds

## Context

Roadmap milestone 1 keeps a digit highlighted independently of cell selection. Sean approved an explicit Focus button and holding a filled cell, with a shortcut hint that retires after learning it. This integrates with the current game rather than shipping the throwaway prototype.

## Key findings

- The existing pointer handler already owns hold timing, movement tolerance, pointer capture, blur/cancellation, and click suppression. A separate filled-cell gesture kind can share these without changing empty-cell batch selection.
- The focused digit is display state. No changes to saved games, history, candidate deductions, or keypad input are necessary.
- React Compiler rejected a callback that referenced the hook result itself. Passing batch presence into the callback avoids that circular dependency and preserves the stable puzzle-request callback.

## How it works

`focusedDigit` lives in `SudokuGame` and overrides the selected cell's digit for matching and candidate highlighting. The selected cell still controls entry. Positive notes receive a focus class; excluded or invisible notes do not. Smart highlighting continues to be an explicit preference.

A 400ms filled-cell hold invokes the focus callback. Movement beyond 8px before activation cancels it, and dragging after activation cannot turn into batch selection. Holding a filled cell during a batch keeps the batch and its selected entry target. Native Focus and Clear focus buttons support keyboard activation.

Only shortcut discovery is saved, under `sudoku.focus-hold-learned.v1`. Read/write failure is tolerated. Focus itself resets on reload or a new puzzle. After playtest feedback, a slim 58px panel groups a focus icon, the action/status text, and a small shortcut hint. The active state uses an icon-only close button with a Clear focus accessible label; nested button fills and the digit badge were removed. A stable-height panel prevents the board moving when the hint disappears or focus changes.

## Gotchas

The prototype forced Smart highlighting on and disabled saving. Neither behavior belongs in production. Clear selection must not clear focus. Focus is separate from note mode and must never become digit-first number entry. A filled-cell hold must suppress its subsequent click and must not select empty cells while dragging.

## Verification

- Before implementation, browser checks failed because the Focus button and hold indicator were absent. Both passed after implementation without changing saved game JSON.
- Chromium checks passed for explicit/keyboard activation, hold activation, persistent focus across empty selection and annotations, matching positive notes, Smart highlighting off/on, exclusions, normal keypad entry, undo, and clearing focus.
- Batch selection, arbitrary note entry, atomic undo, and Clear selection passed with focus active. Holding another filled digit preserved the batch.
- Short taps and canceled holds (movement, blur, pointer cancellation, a second pointer, dialog, pause) did not activate focus.
- Hint appearance, retirement after a successful hold, persistence across reload, unavailable hint storage, and focus reset on reload/new puzzle passed.
- All 58 existing unit tests, ESLint, TypeScript, production build, service-worker generation, and whitespace checks passed.
- Production-build checks passed for both activation methods and persistent focus. Inspected phone light/dark and desktop captures. Phone captures use 390 × 930 to fit the extra control row without a scrollbar; board margins are 17px on both sides.
- Keep the test page foreground for hold checks: background-tab timer throttling can postpone the 400ms hold beyond a simulated press.
- Physical iOS/Safari gesture behavior remains unverified.

## References

- [Approved design](../plans/2026-09-21-digit-focus-design.md)
- [Implementation plan](../plans/2026-09-21-digit-focus.md)
- `src/components/game.tsx`
- `src/components/use-note-selection.ts`
- `src/components/cell-notes.tsx`

## Approved board toolbar (rendering B)

Sean selected B from three generated directions. The 44px toolbar now joins the board outline; its hint sits alongside the action. Top board cells have square selection corners at the internal seam, while bottom cells retain rounded selection corners. Rendering-first review is now saved in repository and global Codex guidance.

Verified button activation, filled-cell hold, clear and pause in Playwright. At 320px, 390px and 1100px the toolbar and board edges align with no gap or horizontal overflow. Light and dark screenshots inspected. Production screenshots at 390×930 have equal 17px board margins and no scrollbar. Lint, typecheck, production build and diff checks passed.
