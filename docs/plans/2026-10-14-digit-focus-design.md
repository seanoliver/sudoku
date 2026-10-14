# Digit focus

Roadmap item: R22, rethink digit focus, including R20, a focused digit's notes stand out. On October 14, 2026, Sean chose direction A, lit key, over B, focus follows the selection, and C, a 1–9 rail above the board. All three were rendered in the app. Reference: `../designs/digit-focus-approved.png` (focused, after tapping an empty cell, Notes, dark), with the comparison in `../designs/digit-focus-options.png`.

## When a number is focused

- Selecting a filled cell focuses its number. No focus button, no hold.
- Placing a number focuses it.
- Tapping a number key that would not enter anything (a filled cell is selected, or the key is filtered or finished) focuses its number. This is today's behavior.
- Notes and exclusions do not change focus.

## When focus ends

- Tapping the lit key again, in any case where the key would focus rather than enter. The same works for its keyboard digit.
- New puzzle, restart, and reload clear it, as today.
- Selecting an empty cell keeps focus, so the player can look for where the number goes.

## How it looks

- The focused key on the keypad is solid blue with a surface-colored digit. Color mode shows the color pad, so no key is lit.
- Matching placed numbers keep the matching background and add a blue ring and a bold blue digit.
- The focused number's notes are a solid blue chip with a surface-colored digit (R20), so fish patterns read across the board.
- The focus bar's button, label, Clear focus, and "Or hold a filled cell" hint are removed. The row keeps its height for the hint strip, so the board does not move when a hint opens.
- A polite live region announces "Focused on 8" for assistive technology.

## Unchanged

- Smart highlighting already follows the focused number.
- Holding a filled cell during a batch still focuses its number without changing the selection.
- Hints and the walkthrough hide focus cues on the board, as today.

## Verification

- e2e: selecting a filled cell lights its key and marks its notes; selecting an empty cell keeps focus; placing a number moves focus; tapping the lit key clears it; Notes mode leaves focus alone.
- Screenshots of the build at the approved states, compared with the approved render.
