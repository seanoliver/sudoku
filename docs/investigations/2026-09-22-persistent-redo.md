# Persistent Redo

## Context

Sean approved persistent Redo as a standalone release using existing Settings controls and styling. Action descriptions and checkpoints remain separate work.

## Key findings

The existing undo stack stored complete annotation snapshots but discarded each undone state. The saved game already validates snapshots and migrates legacy annotations. Reusing those contracts keeps batch actions atomic.

## How it works

Undo moves the current snapshot onto a redo stack and restores the last undo snapshot. Redo reverses that transfer. A recorded edit clears the redo stack; rejected/no-op actions and transient selection/focus do not. Erasing an already-empty cell is a no-op in all modes. Both stacks share a 200-action limit. Restore validates both stacks and treats a missing redo stack as a legacy save with no redo. Restart and new puzzles clear both stacks.

Settings exposes Undo and Redo with the existing button layout. Command/Control+Z undoes; adding Shift redoes. The final placement can also be undone and redone. Paused games and busy generation disable both actions; modal keyboard input remains isolated.

## Gotchas

Redo stores values, notes, exclusions and note origins together. It does not restore time, selection or preferences. It is not a chronological replay log. A new branch intentionally discards the undone future. The combined limit keeps saved-state size bounded rather than allocating 200 snapshots to each stack separately.

## Verification

New engine tests failed before implementation. The full suite now passes 79 tests. Coverage includes exact redo after multiple undos and reload, batch exclusions, Fill notes, input immutability, invalid/no-op operations, legacy saves, malformed redo snapshots, combined bounds, 230 edits followed by 200 undos/redos, restart, and final completion.

Lint, typecheck and production build passed. Local production browser checks passed Settings and Control/Command keyboard actions, redo after reload, focus preserving redo, branching, exact Fill notes restoration, pause gates, and final completion Undo/Redo. Checked phone/light and desktop/dark. A browser assertion initially ran before the dialog close event settled; rerunning after the close state settled passed. No gesture changes; physical iOS was not tested.

## References

- [Game transitions and save validation](../../src/lib/game.ts)
- [Regression tests](../../tests/redo.test.ts)
- [Settings screenshot](../screenshots/persistent-redo-settings.png)
