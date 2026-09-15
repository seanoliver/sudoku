# Smart highlighting

Approved by Sean on September 14, 2026.

Add a separate **Smart highlighting** setting, off by default and persisted on this device. Selecting a filled cell highlights empty cells where that digit does not already appear in the row, column, or box. Selecting an empty cell clears candidate highlights. Use a soft green shade in light and dark themes, separate from blue related-cell and matching-number highlights.

Calculate possibilities from current board entries, including mistakes, without consulting the solution or pencil notes. Recalculate after entry, erase, and undo; suppress highlights when complete. Existing related-cell highlighting stays independent.

Keep candidate calculation in the Sudoku library and preference migration in the preferences library. Render a candidate class and accessible description in the board. Add brief instructions to settings/help. Validate row, column, box, occupied cells, changing digits, undo, and preference compatibility with unit tests, plus browser checks for selection, toggles, persistence, and both themes.
