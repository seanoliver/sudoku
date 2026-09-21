# Filled cells were ignored during batch selection

## Symptom
Tapping a filled cell while selecting cells for notes or exclusions did nothing.

## Root cause
The batch click handler rejected all nonempty cells before normal selection could run.

## Reproduction
Drag an empty cell to start a batch, then tap a given. Before the change the batch remains and the given is not selected.

## Fix
After suppressing clicks caused by holds or drags, a filled-cell activation resets the batch and invokes normal selection. This restores normal controls without a toast or extra UI, per approved option A. The help text explains the shortcut.

## Verification
Reproduced before editing. Playwright verified givens in both modes, player-entered values, keyboard activation, unchanged saved game/history, normal focused-digit switching and touch activation. Filled-cell hold and dragging onto filled cells preserve the batch. All 63 tests, lint, typecheck and production build passed. Physical Safari/iOS not tested.

## Recurrence guardrail
Keep filled-cell exit after gesture click suppression. Check tap, keyboard activation, hold and drag independently so a suppressed hold/drag click cannot clear a batch.
