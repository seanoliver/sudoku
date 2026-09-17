# Batch Notes Implementation Plan

> **For Codex:** Use executing-plans to implement this plan task-by-task.

**Goal:** Hold an empty cell, drag or tap to select more cells, and add one note to the entire group before returning to value entry.

**Architecture:** Keep focused-cell navigation separate from temporary note selection. A pointer selection hook handles the 400 ms hold, drag, tap toggles, and cancellation. An atomic game action adds notes and records one undo snapshot.

**Tech Stack:** React 19, TypeScript, Pointer Events, Next.js, Node test runner, Playwright MCP.

## Approved design

- Hold an empty cell for 400 ms to enter temporary notes mode.
- Drag across empty cells to add them; ignore filled cells.
- Tap nonadjacent cells to add them, or selected cells to remove them.
- Add the chosen digit everywhere, preserving existing copies and clearing matching exclusions.
- Clear the group after entry and return to normal input with the last focused cell.
- Undo reverses the complete batch. The existing Notes button stays persistent.
- Escape, mode changes, pause, dialogs, and new puzzles cancel the temporary selection. Pointer cancellation stops the current gesture.

## Task 1: Atomic notes

1. Add `tests/batch-notes.test.ts` covering mixed existing notes, exclusions, generated ownership, single undo, invalid inputs, filled cells, no-ops, and persistence.
2. Run `node --experimental-strip-types --test tests/batch-notes.test.ts` and confirm failures for the missing action.
3. Add `addNotes(game, { indices, value })` to `src/lib/game.ts`. Validate inputs, update eligible cells immutably, and call `record` once only when something changed.
4. Rerun the focused tests.

## Task 2: Selection and input

1. Verify the missing hold gesture in the local browser.
2. Create `src/components/use-note-selection.ts` for pointer capture, hold timing, drag interpolation, tap toggles, and timer cleanup.
3. Integrate group selection into `src/components/game.tsx`: selection highlights, batch input, cancellation, keyboard Escape, tool behavior, and accessible selection count.
4. Update `src/app/globals.css` so board gestures are reliable on touch devices; keep pinch zoom available.
5. Update the help text with the gesture instructions.

## Task 3: Verification and documentation

1. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
2. Use Playwright MCP on the worktree's local server to verify real touch and mouse holds, drag, nonadjacent taps, deselection, batch entry, undo, normal entry afterward, persistent Notes, early movement, cancellation, and pause.
3. Capture and inspect a phone-sized screenshot.
4. Update the investigation with actual implementation and verification results, then inspect the final diff.
