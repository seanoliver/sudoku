# Auto notes

> Historical design. Gameplay now follows [manual notes and one-time Fill notes](../plans/2026-09-15-manual-notes.md); automatic deduction application and its settings have been removed.


Sean requested automatic notes for digits with one or two legal placements in a box, and confirmed that calculation should use placed numbers only.

Add an independent **Auto notes** setting, disabled by default and persisted on this device. For each digit and each 3 × 3 box, show a note in each legal empty cell when there are exactly one or two legal placements. Reuse the current row, column, and box checks; do not consult the solution or manual notes. A single placement stays a note.

Derive automatic notes from current values, separately from saved manual notes, and render their sorted union. Automatic notes update on enable, entry, erase, undo, new puzzle, and reload. Disabling the setting hides automatic notes without changing manual notes or history. Automatic notes cannot be manually dismissed while the rule applies; explain this in Help. Manual notes retain existing entry, peer cleanup, erase, and undo behavior.

Keep the calculation in `src/lib/sudoku.ts`, preference migration in `src/lib/preferences.ts`, and composition in the board component. Add settings/help copy. Test zero, one, two, and three placements; separate boxes and digits; occupied cells; erase and undo; manual-note independence; and preference migration. Verify toggling, persistence, union rendering, mobile framing, and themes in the browser.
