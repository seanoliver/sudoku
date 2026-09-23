# Sudoku repository guidance

## Feature design workflow

- Before implementing a new feature, generate three distinct visual design directions as images for Sean to review. Show the relevant states in the actual app context, keeping unrelated UI consistent.
- Present the images directly and wait for Sean to choose a direction before implementation. Use the chosen rendering as the visual reference, then verify the implemented UI with real browser screenshots.
- This is the default for future feature development; Sean may explicitly skip or adjust the process.

## Screenshots for sharing

- Default to a phone-sized portrait viewport: **390 × 844 CSS pixels**. Keep the board large and the side margins tight.
- Capture the actual app at that viewport with `fullPage: false` and `scale: 'css'`. Use a fresh browser capture when changing framing.
- Avoid full-page screenshots for social posts. Scrollbars and layout changes during capture can produce uneven margins.
- Before capture, measure `.board-wrap` with `getBoundingClientRect()`. Compare `rect.left` with `window.innerWidth - rect.right`; they must match within 1 CSS pixel. At 390px wide, the expected margins are **17px on each side**.
- Check that `document.documentElement.clientWidth === window.innerWidth` so a vertical scrollbar is not consuming image width. If content overflows, increase viewport height and remeasure before capture.
- Show the feature in use: enable Smart highlighting and select a filled cell so green possible cells are visible. Wait for the layout and color transitions to settle, or emulate reduced motion.
- Inspect the saved image before uploading. Confirm equal margins, readable numbers, visible highlighting, and no clipped controls or browser chrome.
- Save captures in `docs/screenshots/`. Reference: `docs/screenshots/smart-highlighting-phone-centered.png`.
- When replacing media in Typefully, fetch the latest post first and preserve the user's text, enabled platforms, and scheduled time. Include descriptive alt text and verify the new media is attached.

## Deployment

- Production URL: `https://sudoku.seanoliver.dev`.
- Vercel workspace: **Cabin 9** (`cabin-9`, team `team_zbOQcoGZ8Edz3hYHUC0mHa3t`), project `sudoku` (`prj_ZvtqGcLsOIhWF59NxNzNDZEg3vS5`).
- GitHub repository: `seanoliver/sudoku`. Production tracks `main`. Prefer the connected GitHub deployment workflow.
- Verify both the project link and authenticated account before CLI deployments. The CLI previously used another account; never infer workspace ownership from the project name alone.
