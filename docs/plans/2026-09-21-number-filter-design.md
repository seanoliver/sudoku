# Filter number keys

Sean selected direction A: muted unavailable keys, retaining the nine-key row, number counts, board, and focus behavior. Reference: ../designs/number-filter-approved-a.png (generated concept; incidental board/focus details are not behavior changes).

Add an optional, immediately saved Filter number keys setting, default off, with a filter icon and description: “Disable numbers already in this row, column, or box.” Only normal value entry is filtered; single and batch notes/exclusions remain unrestricted. Keyboard and keypad agree. Numbers legal under visible constraints remain available even if not the solution or manually excluded. Block incorrect answers retains its independent solution check.

Availability comes exclusively from filled peers, ignoring the selected cell's own value when replacing an entry. It recomputes for selection, placement, erasure, undo, restart, and puzzle changes. Rejected keyboard inputs announce why without writing history. If no numbers are available, show a neutral explanation; erasing and undo remain possible. Use native disabled controls plus accessible descriptions, neutral gray unavailable keys, normal blue available keys, and existing theme tokens.

Do not add deduction automation, filtering in annotation modes, reordered keys, or a new keypad panel. Verify actual light/dark phone screenshots against direction A, plus desktop and narrow layouts.
