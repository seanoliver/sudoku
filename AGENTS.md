# Sudoku repository guidance

## UI design principle: show, don't explain

- Communicate state and feedback visually wherever possible: color, shape, icons, motion, position, and disabled or highlighted states. Treat explanatory text as a last resort.
- Before adding or keeping UI text, check whether a visual indicator can carry the same meaning. If it can, use the indicator and remove the text.
- Text is justified only for things a player cannot infer from the board, such as how an advanced deduction works or what a complex setting changes. Keep that text short.
- Visual indicators must still be accessible. Pair color with a second cue (shape, icon, pattern, or motion), provide `aria-label` or live-region announcements for assistive technology, and respect reduced motion. Accessible names are not visible UI text and do not count against this principle.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
