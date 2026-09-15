# Manual notes and one-time candidate filling

## Context

Unrestricted deduction chaining reduced 86 of 100 fixed Hard puzzles to one candidate per empty cell before the first move. The approved design keeps detection for future hints and gives note management back to the player.

## Key findings

- Note presence does not establish completeness. Missing notes never imply exclusions.
- Ownership belongs to the cell. A manual edit claims all remaining notes, including an empty cell after clearing notes.
- Animation cause and note ownership are separate: entering a number removes both manual and generated peer notes automatically.

## How it works

`GameState` stores `notes`, `exclusions`, and `noteOrigins` in current state and every undo snapshot. Fill notes calculates basic candidates minus explicit exclusions and replaces only unowned/generated empty cells. Unchanged fills add no history. Exclusions and pencil notes are mutually exclusive for a digit.

Version-1 saves without either new annotation field migrate their nonempty notes to manual ownership. New saves validate ownership, disjoint note/exclusion sets, and empty annotations on filled cells. A malformed current state or undo snapshot is rejected.

`getPlayableCandidates` is the only candidate entry point used by Fill notes and Smart highlighting. It never enables deduction rules. The existing detection functions and characterization tests remain for future hints; no hint UI ships here. Retired automation preferences are ignored.

Generated notes use theme-specific blue; manual notes use the normal text color. Exclusions have a strike-through, and accessible cell labels identify generated notes and ruled-out digits. Fill additions and automatic peer cleanup animate; initial loads and reduced-motion updates stay quiet.

## Gotchas

- Manually removing a generated note claims the entire cell, so Fill notes cannot reintroduce it.
- Clearing a filled value does not refill notes. Use Undo to restore the prior snapshot or Fill notes to populate eligible cells.
- Explicit exclusions reflect player reasoning and may be wrong. They filter only that cell and do not propagate other eliminations.
- The engine's historical 86/100 characterization is distinct from the gameplay guard: the new Fill notes operation fully reduces zero of those 100 Hard puzzles.

## Verification

- 50 unit tests pass, including ownership, exclusions, single-action undo, migration, invalid saves, gameplay isolation, and retained deduction detection.
- Type checking, lint, and production build pass.
- Browser checks verified filling, manual preservation, generated-to-manual color changes, cleared-cell protection, exclusion toggle/highlight restoration, save reload, retired settings, peer cleanup animations for both origins, and reduced motion.
- Phone screenshots at 390 × 844 have 17px board margins. No horizontal overflow at 320, 390, or 1024px. Both theme screenshots were inspected. Browser console has no errors.

## References

- `docs/plans/2026-09-15-manual-notes.md`
- `tests/manual-notes.test.ts`
- `tests/deduction-gameplay.test.ts`
- `docs/screenshots/manual-notes-light.png`
- `docs/screenshots/manual-notes-dark.png`
