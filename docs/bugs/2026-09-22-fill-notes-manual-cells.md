# Fill notes skips manually edited cells

## Symptom

Fill notes leaves some empty cells blank or partially noted even though legal candidates exist.

## Root cause

The fill function skips cells marked as manual. Note and exclusion edits set that flag, which persists after removing annotations and through saves. Even erasing an already-empty cell in an annotation mode sets it. This followed the previous manual-preservation policy and conflicts with Sean's clarified requirement to fill every empty cell while retaining exclusions.

## Reproduction

On Hard seed 1, select r1c1, enable Notes and Exclude, and tap 2 twice. The cell becomes visibly empty. Open Settings and use Fill notes. Before the fix it stays empty despite legal candidates 2, 4 and 9. An untouched r1c1 fills correctly. Keeping a manual note 2 instead leaves only that note.

## Fix

Rebuild every empty cell's notes from placed-number constraints minus exclusions. Keep placed values and exclusions unchanged. Save validation permits generated notes with exclusions; the sets must remain disjoint. Record one undoable action, and avoid a new history entry for an unchanged repeat fill. Update Help, README and the roadmap to match.

## Verification

Six regression cases failed before the fix. All 72 tests, lint, typecheck and production build pass afterward. The deterministic reproduction covers cleared notes, removed exclusions, empty erasure and save/restore; unit tests also cover legacy saves. Browser checks against the local production build passed five scenarios, each including reload, exact Undo restoration and repeated-fill no-op behavior.

## Recurrence guardrail

Keep coverage for manual and visibly empty cells, batch exclusions, mixed generated notes and exclusions after reload, exact Undo restoration, and unchanged repeated fills. Treat note origin as presentation metadata rather than permission to skip a cell during Fill notes.
