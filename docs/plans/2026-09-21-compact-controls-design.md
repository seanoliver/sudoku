# Compact notes controls

Sean approved the refined A rendering in ../designs/compact-controls-approved.png: one control row above the keypad, Notes switch at left, an Exclude chip beside it only while Notes is on, and contextual Erase at right. Exclude uses a checkmark and muted red active fill. Preserve the board, focus strip, keypad geometry, and optional number filtering. Generated board digits are illustrative.

Notes off means value entry. Notes on means positive notes unless Exclude is active. Turning Notes off also leaves exclusion mode. Exclude toggles back to positive notes without leaving Notes mode. N toggles Notes; X toggles Exclude only in Notes mode.

Erase appears for a single selected user-filled cell or a cell with notes/exclusions. It clears that cell's editable content in one existing undoable action, then returns focus to the cell. It is absent for givens, empty cells, and batch selection. Keep controls in fixed positions so showing/hiding Erase does not shift Notes or the keypad.

Batch selection activates Notes with the same Exclude chip, preserving exclusion mode when starting a selection from that mode. Keep selected-count and Clear selection feedback. Turning Notes off cancels selection. Finishing a batch or selecting a filled cell returns to value entry as before; hold/drag suppression is unchanged.

Move Undo and Fill notes to Settings, retaining keyboard Undo. Settings actions close the sheet after application. Do not add Redo or change game persistence/undo semantics.
