# Hold and drag selection for batch notes

## Context

Requested interaction: hold a cell to enter note selection, drag across cells, tap additional nonadjacent cells, then enter a note in the selection and return to normal entry.

## Key findings

- `src/components/game.tsx` stores one selected index and a persistent value/note/exclude mode. Cells currently handle clicks only.
- `src/lib/game.ts` records one undo snapshot per `enter` call. Repeated calls for a batch would create multiple undo steps, so batch entry needs one atomic game action.
- Existing note entry toggles a digit, removes any matching exclusion, and claims the cell's notes as manual. Notes cannot be entered in filled cells or givens.
- Board buttons use `touch-action: manipulation`; touch drag selection needs explicit handling of browser scrolling and pointer cancellation.

## How it works

The component routes keyboard and number-pad input through `input`, which invokes `enter` for the selected index. The game engine owns note data, exclusions, ownership, persistence, and undo. Selection and input mode remain transient component state.

The extension keeps a focused cell for keyboard navigation and a separate group of empty cells for batch notes. A single game action applies a digit to that group and records one snapshot. Completing the action clears the group and returns to value entry.

## Gotchas

- Mixed selections may already contain the requested digit. Batch addition should preserve those notes, rather than invert each cell independently.
- Pointer release after a hold must not trigger an ordinary cell click that changes the group.
- Dragging across givens or user-filled cells should skip them.
- Cancel pending holds on pointer cancellation, pause, dialogs, new puzzles, and unmount.
- Keep the existing Notes button behavior distinct from temporary hold selection unless the user requests a global change.

## Verification

- Baseline: 50 tests passed. Four new batch tests failed before the action existed, then passed after implementation; all 54 tests pass.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed.
- Playwright mouse input: 400 ms hold activates notes, dragging adds cells, a nonadjacent tap adds one, tapping a selected cell removes it, and entering 4 changes all selected cells with exactly one history entry. Undo exactly restores the saved pre-entry state.
- Chromium touch emulation at 390 × 844: a single fast move across a row selected all eight empty cells and skipped its filled cell. Nonadjacent taps added and removed a ninth cell. Batch note entry returned to normal entry, and the next number became a value.
- Early movement cancels the hold; pointer cancellation does not fire a late timer. Escape, pause/resume, and deselecting the last cell exit selection. Existing Notes mode remains active for consecutive number inputs.
- Phone screenshot inspected: four distinct selection outlines, readable number pad, equal 17px margins, and no clipped controls. Browser console: no errors.
- Physical iOS/Safari testing was not performed.

## Implementation details

- `use-note-selection.ts` captures the active pointer and samples drag segments every 6 CSS pixels so fast moves include intermediate cells. A movement greater than 8px before activation cancels the hold. Once a group exists, drags can begin immediately.
- Pointer release suppresses the following click for hold/drag gestures. Ordinary clicks and keyboard activation still select normally.
- Group selection is transient. Mode changes, dialogs, puzzle changes, pause, and window blur clear it. Erase is disabled during group selection; Backspace cancels it.
- `addNotes` adds without toggling, preserves other notes, removes matching exclusions, claims affected generated notes as manual, and records only one snapshot. Already-manual unchanged notes consume no history.
- Cells use `touch-action: pinch-zoom`: one-finger motion on the board is reserved for selection, with pinch zoom still available. Scrolling remains available outside the board.
- The initial browser session had an old service worker on localhost:3102; unregistering that local worker and clearing its caches exposed the actual development build. The worktree shares dependencies with the root via a symlink, so local development used webpack because Turbopack rejects dependencies outside its project root.

## References

- `src/components/game.tsx`
- `src/lib/game.ts`
- `src/app/globals.css`
- `tests/manual-notes.test.ts`

- `src/components/use-note-selection.ts`
- `tests/batch-notes.test.ts`
- [Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [Touch action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)
