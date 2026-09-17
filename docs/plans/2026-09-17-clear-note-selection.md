# Clear note selection

## Approved design

Show a Clear selection button above the board beside the selection count whenever temporary note selection is active, including a single selected cell. Clearing returns to normal entry and preserves notes, values, exclusions, and undo history. Keep the normal focused cell and return keyboard focus to it when the button disappears.

## Implementation

1. In `src/components/game.tsx`, add the conditional button in the metadata row above the board. Reset selection and input mode without changing game state. Update the help text.
2. In `src/app/globals.css`, arrange the status and button together with a 44px touch target and a filled button. Reserve a fixed metadata-row height so starting a hold does not move the board under the pointer. Keep the clock mounted while selection controls temporarily cover the difficulty and timer.
3. Verify selection clearing with mouse and touch input, preservation of saved game state, normal entry afterward, and keyboard focus. Check phone layout, lint, types, tests, and production build.
4. Open a new PR against `main`.

## Verification

- Lint, TypeScript, all 54 tests, and production build passed.
- Browser checks at 390 × 844 covered mouse and keyboard clearing, preserved saved game data (including notes and history), normal number entry afterward, and focus restoration.
- Emulated touch clearing passed against the production build.
- Board position stayed unchanged when selection began. The button measured 44px high and appeared above the board. The saved phone screenshot has equal 17px board margins and no horizontal overflow.
- Physical iOS testing remains unverified.
