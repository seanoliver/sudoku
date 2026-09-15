# Automatic note animation

> Historical design. Gameplay now follows [manual notes and one-time Fill notes](../plans/2026-09-15-manual-notes.md); automatic deduction application and its settings have been removed.


## Context

Automatic note changes need a subtle visual cue so players can follow deductions as the board changes.

## Key findings

- Animate the visible union of manual and automatic notes. Losing automatic ownership must not hide a note the player also entered manually.
- Keep the note grid mounted in filled cells, hidden, so erasing a value can animate returning automatic notes.
- Keep removed glyphs mounted for their exit animation while updating the cell's accessible label immediately.

## How it works

`CellNotes` compares previous and current note visibility in a layout effect. Automatic additions fade and scale from 85% over 220 ms; removals reverse this over 180 ms. Native Web Animations effects leave the final appearance to CSS.

An interrupted transition starts from its current opacity and transform. Filling a cell cancels its animations and hides the grid. Initial puzzle rendering is quiet. Reduced motion makes changes immediate.

## Gotchas

All nine glyphs exist in the DOM, including invisible notes. Read the cell's accessible label or note visibility attributes when testing; raw cell text includes hidden glyphs. Animation never changes candidate eligibility or saved notes.

## Verification

- Existing 40 tests, type checking, lint, and production build passed.
- Browser checks verified additions, removal of the last note, rapid undo reversal, stable board dimensions, and immediate accessible-label updates.
- Manual/automatic overlap remained visible without animation. Manual-only removal was immediate.
- Filling a cell hid its grid and canceled effects; erasing it animated returning notes.
- Reduced motion produced no note animations. Unpaused removal completed with opacity zero and no remaining effect.

## References

- [React useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)
- [Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate)
- `src/components/cell-notes.tsx`
