# Empty-cell dragging required a stationary hold

## Symptom
Dragging immediately after pointer-down canceled selection unless a batch already existed.

## Root cause
The movement handler treated an empty selection as a cancellation condition before the 400ms hold timer fired. Drag initiation was therefore gated on a prior hold or existing selection.

## Reproduction
Start with no batch. Press an empty cell, move more than 8px before 400ms, then release. Before the fix, no batch appears. The same was reproduced with Playwright mouse input.

## Fix
Only filled-cell movement cancels the focus hold. Empty-cell movement initializes batch mode and selects the starting cell immediately; existing segment sampling adds eligible crossed cells. Existing batches preserve their annotation mode. Stationary hold remains available.

## Verification
The original immediate-movement browser check now starts a batch. Checked fast movement, filled-cell skipping, extending in Exclude mode, filled-cell hold/canceled focus, native Chromium touch input and touch cancellation. All 63 unit tests pass; lint, typecheck and production build pass. Physical iOS/Safari has not been checked.

## Recurrence guardrail
When changing the gesture hook, test a first drag without any delay or prior selection, plus the stationary-hold and filled-cell-focus paths. Movement beyond the threshold must not depend on elapsed hold time.
