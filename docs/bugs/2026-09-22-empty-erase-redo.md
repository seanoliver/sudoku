# Empty annotation erasure discards Redo

## Symptom

After Undo, pressing Backspace on an empty cell in Notes or Exclude mode discarded available Redo even though no value or annotation changed.

## Root cause

The existing empty-erasure no-op guard applied only in value mode. Annotation-mode erasure recorded an empty snapshot, and the new edit path correctly cleared Redo for that recorded action.

## Reproduction

Add and clear a note in an empty cell. Enter a value in another cell and undo it. Select the cleared cell, enable Notes or Exclude and press Backspace. Before the repair, Redo was lost. A pristine empty cell also unnecessarily changed annotation origin.

## Fix

Treat erasure of an empty, unannotated cell as a no-op in every input mode. Preserve the exact game object, undo history, redo history and note origins. Actual erasure of values, notes or exclusions still records an edit.

## Verification

The regression failed before the repair and passes afterward for both pristine and previously cleared cells in Notes and Exclude modes. It asserts object identity and exact restoration through Redo. All 79 tests, lint, typecheck and production build pass. The local browser check covers Backspace followed by Redo.

## Recurrence guardrail

Keep explicit no-op coverage for all input modes when adding history features. A command that changes no value or annotation must not invalidate available Redo.
