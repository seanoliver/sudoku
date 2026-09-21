# Batch exclusions: keypad panel

Sean approved rendering C: group selection count, Clear selection, Add note / Exclude controls, number keys and a short instruction in one restrained panel below the board. Preserve the existing digit-focus toolbar. Replace the usual five tools during selection and remove the old selection overlay above the board.

Hold an empty cell to start selection in Add note mode; drag or tap additional empty cells. Choose Exclude, then tap a keypad digit or type 1–9 to exclude it from all selected cells. Repeated exclusions stay excluded. Positive notes for that digit are removed, selected annotations become manual, and one undo restores the full batch. Filled cells, invalid indices and duplicate targets are harmless; no-ops create no history.

N and X choose batch modes without discarding the selection. Entering a digit finishes the batch and returns to ordinary value entry. Clear selection / Escape cancel without edits. Digit focus remains independent. Keep existing single-cell exclusion toggling, save format, Smart highlighting and gesture cancellation.

Use existing light/dark tokens, a muted red selected Exclude mode, native buttons with pressed states, generous touch targets and visible keyboard focus. Restore board keyboard focus after completing or clearing selection. Do not add automatic deductions.
