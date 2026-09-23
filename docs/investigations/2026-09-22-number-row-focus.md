# Number-row focus

## Context

Sean specified that digit input enters a value only when an empty cell is selected. With a filled cell selected, it focuses the chosen digit. Existing annotations must keep their behavior. Sean approved reusing existing controls and styling for this release.

## Key findings

The previous number row was disabled on givens and replaced player-entered values. The shared input handler serves clicks and digit keys. Cell selection is always present in the current UI; the focus condition also accepts an absent selection without introducing a new deselection interaction.

## How it works

In value mode, a filled selection routes digit input to the existing transient focus state before answer or constraint filtering. Empty selections still enter values. Notes and Exclude modes, including batch entry, keep their existing routes. Erase remains available for player-entered values before replacement.

## Gotchas

Focus changes do not edit saved values, annotations or undo history. Focus is not persisted. Digit keys follow the same selection rules as the number row. Selecting a filled cell alone still uses the existing focus behavior; default automatic focus is a separate roadmap item.

## Verification

The pre-change browser check confirmed the number row was disabled on a given. Post-change checks against a local production build passed: all nine focus digits on a given with filtering enabled, unchanged saved state, empty-cell entry, player-entered-cell focus, keyboard focus and button activation, Erase, Notes, Exclude, batch notes, Clear focus and paused controls. Checked phone/light and desktop/dark layouts. The phone screenshot has equal 17px board margins and no viewport-width overflow. No gesture implementation changed; physical iOS was not tested.

Lint, typecheck, all 72 unit tests and the production build passed.

## References

- [Input and keypad](../../src/components/game.tsx)
- [Screenshot](../screenshots/number-row-focus.png)
- [Roadmap](../ROADMAP.md#number-row-focus)
