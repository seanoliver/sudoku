# Compact annotation controls

## Context
Sean selected the refined A design: one Notes switch, a compact Exclude chip within Notes mode, and contextual Erase. Undo and Fill notes move to Settings.

## Key findings
The existing game engine already clears a cell’s number, notes, and exclusions through enter(value: 0), with undo history. No persistence or engine changes were needed. Batch selection has its own annotation mode and must derive the visible Notes state from its active selection.

## How it works
The shared row renders Notes as an accessible switch and Exclude as a pressed-state button. Exclude is absent in number mode. Turning Notes off clears batch selection. Beginning a batch preserves an active exclusion mode; applying annotations or selecting a filled cell returns to number entry. Erase appears only for editable content outside a batch, then returns focus to the selected board cell when clicked. Settings actions close the dialog after applying.

## Gotchas
X does nothing outside Notes mode. Erase remains hidden during batch selection because a bulk clear is not part of this change. Existing keyboard Delete cancels a batch. Small viewports may scroll vertically during batch selection or inside Settings. Browser screenshots need a settled frame after mode changes.

## Verification
- 69 existing tests passed; TypeScript, ESLint, production build, and diff whitespace checks passed.
- Browser checks covered note/exclusion toggles, X guard, number entry, erase of values and combined annotations, hidden erase for empty/given/batch cells, keyboard focus restoration, unchanged keypad position, Settings Undo and Fill notes, and keyboard Undo.
- Production browser checks covered batch exclusions and notes, exclusion-mode inheritance, switching back to positive notes, Notes-off cancellation, filled-cell exit, and unrestricted annotation keys with Filter number keys enabled.
- Settled layouts had no horizontal overflow at 320×740, 390×844, and 1280×1000. Board margins were 12/12, 17/17, and 418/418 CSS pixels respectively. Settings remained scrollable at 320px.
- Inspected actual light/dark phone screenshots and Settings capture. Physical iOS testing was not performed.

## September 22 release verification

- Fixed keyboard focus loss when N hides Exclude and when keyboard deletion hides Erase; see the [bug journal](../bugs/2026-09-22-compact-controls-keyboard-focus.md).
- Rebuilt production browser checks confirmed focus restoration and subsequent keyboard input, Settings Undo and Fill notes, and System appearance reacting to emulated light/dark changes.
- All 69 tests, lint, typecheck and production build passed after the fix.
- The [release phone capture](../screenshots/compact-controls-release-phone.png) uses 390 × 844 CSS pixels, 17px board margins on both sides, Smart highlighting and no viewport-width loss. Physical iOS testing remains outstanding.

## References
- [Approved design](../designs/compact-controls-approved.png)
- [Design behavior](../plans/2026-09-21-compact-controls-design.md)
- [Implementation plan](../plans/2026-09-21-compact-controls.md)
- [Numbers](../screenshots/compact-controls-numbers-phone.png)
- [Notes](../screenshots/compact-controls-notes-phone.png)
- [Exclusions](../screenshots/compact-controls-exclusions-phone.png)
- [Dark](../screenshots/compact-controls-dark-phone.png)
- [Settings](../screenshots/compact-controls-settings-phone.png)
