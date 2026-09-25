# Hint strip focus loss and double-tap Apply

## Symptom

- Opening a hint from the bulb (click, Enter, or H while it had focus) or closing it with Escape left keyboard focus on the body. H, Escape, digits and arrows then did nothing until the player clicked a cell.
- A quick double-tap on Next at level 2 also applied the move.

## Root cause

- The focus bar swaps two fragments in a ternary. React reconciles their children by position, so the bulb and the strip's buttons unmount when the strip opens or closes. The focused element disappears and focus falls to the body, outside `.app`, which owns the key handler. This is the same failure as `2026-09-22-compact-controls-keyboard-focus.md`, reached through a new control.
- Next becomes Apply on the same button element, so the second tap of a double-tap lands on Apply.

## Reproduction

1. Tab to the bulb and press Enter or H. `document.activeElement` is BODY.
2. Press H. The hint does not advance.
3. Open a hint, tap Next once, then double-tap Next. The move is applied and history grows by one.

## Fix

- The bulb, and H pressed inside the focus bar, set `focusAfterRender` to the strip's action button (or its close button when there is no action). An effect focuses it after render.
- Escape closes the strip and focuses the selected cell, as the close button already did.
- Apply ignores clicks within 350 ms of the Next click that revealed it, using `event.timeStamp`. An `event.detail` guard was tried first and dropped: it also swallowed rapid taps on Apply, and WebKit's tap counting is unverified.

## Verification

In the local dev app at 390×844 with Playwright:
- After H or Enter on the bulb, and after H on Clear focus, focus lands on the action button and the next H advances the hint.
- After Escape, focus is on the selected cell and H opens a new hint.
- With both mouse and touch emulation, a double-tap on Next leaves history unchanged, and a later double-tap on Apply applies the move once.

Lint, typecheck and all 137 tests pass.

## Recurrence guardrail

Any control rendered inside a conditional branch unmounts when the branch flips. For each such control, browser QA activates it from the keyboard and presses the next shortcut without a pointer click. A button whose action changes in place needs a double-tap check.
