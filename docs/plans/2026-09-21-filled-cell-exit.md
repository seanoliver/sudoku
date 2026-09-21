# Filled-cell exit

Sean approved option A: selecting a filled cell exits batch selection directly, without extra feedback or layout changes.

In use-note-selection.ts, handle filled-cell activation after gesture click suppression and before empty-cell batch toggling. Reset the batch, then invoke normal onSelect. Preserve stationary filled-cell hold for digit focus and drag-through skipping. Beginning a batch already resets single-cell entry mode to value, so leaving it restores normal controls without a separate mode change.

Verify the failing behavior first, then check givens and entered values, both batch modes, keyboard activation, focus switching, unchanged saved state/history, and filled-cell hold/drag paths. Run the existing tests, lint, typecheck and production build. Open a PR for review; do not merge automatically.
