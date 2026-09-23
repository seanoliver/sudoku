# Hide timer

## Context

Sean approved a persistent Hide timer setting using the existing Settings controls and styling. It must not change elapsed-time, pause or save behavior.

## Key findings

The Clock component owns elapsed-time tracking and storage. Conditionally unmounting it would stop that work. Its running flag already accounts for pause, dialogs, generation and completion, and its effect observes document visibility.

## How it works

A hideTimer preference defaults to false, migrates missing or malformed values to false, and persists alongside the other settings. Settings uses the existing accessible switch pattern. Clock always remains mounted with the same identity and effect dependencies; when hidden it returns no display markup. The pause button remains available. The setting does not write game history or clock storage itself.

## Gotchas

Hiding time does not pause it. Showing the timer reveals the current elapsed time. Returning no display markup also removes the time announcement from the accessibility tree. Restart resets the hidden clock; new puzzles retain the visibility preference. Existing saves and other preference values remain intact.

## Verification

The new preference regression failed before implementation. All 80 tests, lint, typecheck and the production build pass. Preference tests cover defaults, legacy settings, true/false round trips and malformed values without changing the other settings.

Browser assertions against a local production build passed visible defaults, hiding, continuing elapsed time, reload persistence, pause/resume, modal pause, showing the current time, unchanged game state, hidden restart reset, completion stopping time, keyboard switch activation, and a new puzzle retaining the preference. Checked phone/light and desktop/dark. Phone board margins remain 17px on both sides. Screenshots were inspected. No gesture changes; physical iOS and background-tab suspension were not independently exercised; existing visibility handling is unchanged.

## References

- [Clock](../../src/components/clock.tsx)
- [Preferences](../../src/lib/preferences.ts)
- [Preference tests](../../tests/preferences.test.ts)
- [Hidden timer](../screenshots/hidden-timer-phone.png)
- [Settings switch](../screenshots/hide-timer-settings.png)
