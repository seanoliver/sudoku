# Faded red exclusions

Roadmap item: "Faded red exclusions" (September 21 playtest). Sean approved this design on September 23, choosing direction A (faded red fill) from three options rendered in the app (fill, fill with outline, hatching). Reference: ../designs/excluded-highlighting-approved.png.

## Problem

Smart highlighting shows where the active digit can go in green. When the player has excluded that digit from a cell the rules would otherwise allow, the cell drops out of green and looks the same as a cell the rules rule out. The player's own exclusions are invisible at board scale.

## Behavior

- With Smart highlighting on and an active digit (focused digit, or the selected filled cell's value), empty cells where row/column/box rules allow the digit but the player has excluded it get a pale red background (`--red-soft`).
- The existing small struck note in the cell is the cue beyond color. No visible text is added. The cell's accessible name adds "excluded placement for N", matching the green cells' "possible placement for N".
- Cells blocked by the rules stay plain. Green cells are unchanged. Selection and rejected-entry styling take precedence on the selected cell.
- The state is derived from the board, so it updates with digit changes, placements, erasing, exclusion changes, undo, redo and restart. No state is stored.
- With Smart highlighting off, or when the puzzle is complete, nothing changes.

## Implementation

- Pure helper in `src/lib/candidates.ts`: `excludedCells({ values, exclusions, digit })` returns the cells in `possibleCells(values, digit)` (empty cells whose row, column and box allow `digit`) whose `exclusions[i]` contains the digit. Invalid digits return an empty set.
- `game.tsx`: an `excludedPossible` `useMemo` beside `possible`, with the same gating, adding an `excluded-possible` cell class.
- `globals.css`: `.cell.excluded-possible { background: var(--red-soft); }`, placed after `.cell.possible` and before `.cell.selected` so selection still wins.

## Verification

- Unit tests for `excludedCells`: an excluded legal cell, an excluded cell the rules already block, a filled cell, invalid digits, and removing the exclusion.
- Browser at 390 × 844 in light and dark: highlighted state, adding/removing an exclusion toggles green and red, changing digit, Smart highlighting off. Screenshots in `docs/screenshots/`.
