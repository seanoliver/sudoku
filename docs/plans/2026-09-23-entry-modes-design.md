# Entry mode switch

Roadmap item: R3, annotation mode switching. Sean named four problems on September 23: Exclude takes two taps, the mode resets after a batch, the current mode is hard to see, and the controls are small. He chose direction A (three-way segmented control) from three options rendered in the app (segmented control, two large toggles, swipe gestures). Reference: ../designs/entry-modes-approved.png.

## Controls

- One segmented control, **Numbers | Notes | Exclude**, about 44px tall across the keypad width, replaces the Notes switch and the Exclude chip. Every mode is one tap away.
- The active segment is filled in its mode color: blue for Numbers, note blue for Notes, pale red for Exclude.
- Erase is a fixed icon button at the right end of the row. When nothing is erasable it is hidden with `visibility: hidden`, so the row never shifts.
- Accessibility: a labeled group ("Entry mode") of three buttons with `aria-pressed`. Number keys keep their existing labels ("Enter 4", "Enter 4 as a note", "Rule out 4").

## Mode shown on the keys

- Numbers: current key style.
- Notes: smaller digits in note blue.
- Exclude: pale red key tint, red digits struck top left to bottom right.
- The "Notes on. …" and "Exclude on. …" hint lines are removed.

## Mode persistence

- A batch starts in Notes, or in Exclude when the mode is Exclude. The regular mode is left unchanged.
- Changing the batch mode also changes the regular mode, unless the batch started in Numbers.
- Every way a batch ends (finishing, Escape, Clear selection, selecting a filled cell, pause, sheets, undo, redo, arrow keys) therefore leaves you in Notes or Exclude if you were annotating before, and in Numbers if you started there.
- Tapping Numbers during a batch cancels the selection and switches to Numbers.
- New puzzle and restart reset to Numbers.

## Keyboard

- `N`: Notes, or back to Numbers when already in Notes.
- `X`: Exclude from any mode, or back to Numbers when already in Exclude.

## Implementation

- `src/lib/entry-mode.ts`: pure functions over `{ mode, batchMode }` for begin batch, select, toggle, and the active mode. Unit tested.
- `game.tsx` replaces `noteMode`/`batchMode` handling with these functions and renders the new control; `globals.css` styles the control and the per-mode keys.

## Verification

- Unit tests for every transition above.
- Browser at 390 × 844, light and dark: each mode's control and key styling, one-tap switches, a drag batch keeping Notes and Exclude, a drag from Numbers returning to Numbers, keyboard N and X. Screenshots in `docs/screenshots/`.
