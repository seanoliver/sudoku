# Input and settings polish

Sean approved rendering B with icons next to all three gameplay settings, and requested a gear for the Settings trigger.

Remove the second Sudoku heading, tagline and adjacent New puzzle button. Keep the app-bar branding as the page heading. Settings has compact side-by-side New puzzle and Restart puzzle actions, then Appearance and existing gameplay switches with icons. Preserve accurate descriptions and existing preference behavior.

Restart opens confirmation explaining that entries, notes, exclusions, elapsed time and undo history will be cleared. Cancel preserves all progress. Confirm resets the same puzzle (same ID, givens, solution and difficulty), clears selection/focus and resumes at zero seconds. This is a fresh attempt with no undo into the old attempt; later replay/checkpoint work will model attempt history explicitly. New puzzle keeps the existing difficulty-selection flow.

Empty-cell dragging begins once movement exceeds 8px, regardless of elapsed hold time. Keep stationary 400ms hold as an alternative. Select the start cell and eligible cells along the movement segment, preserve batch annotation mode when extending, and skip filled cells. Moving on a filled cell cancels focus activation. Preserve pointer capture, cancellation, pinch zoom and scrolling outside the board.
