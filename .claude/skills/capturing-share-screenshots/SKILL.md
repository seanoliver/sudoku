---
name: capturing-share-screenshots
description: Use when Sean wants a screenshot, still, or clip of the Sudoku app for an X post, Typefully draft, PR, sharing brief, or docs, or when replacing media on a scheduled post. Covers any screen of the app, including the game board, Learn page, lessons, hints, and settings sheets.
---

# Capturing share screenshots

Capture the real app at phone size with equal side margins and the feature visibly in use.

## Steps

1. **Serve the right code.** Screenshot what the post is about, usually `main` or the feature branch. Run `pnpm install --frozen-lockfile` if `node_modules/@playwright` is missing, then `pnpm build && pnpm start --port <free port>`. Do not reuse a server that is already running; it may come from another worktree or a stale `.next`. Check the port with `lsof -i :<port>` first.
2. **Copy `capture-template.mjs`** (next to this file) to the scratchpad. It opens a fresh context at **390 × 844** with reduced motion, seeds storage, measures, refuses to capture on bad margins, and saves. You edit only `SETUP` and `setup()`. Use `colorScheme: 'light'` unless Sean asks for dark. Offer dark as a second capture only when color is the point of the feature.
3. **Seed state with `addInitScript`, never by clicking through a game.** Reuse the helpers in `e2e/fixtures.ts`:
   - Saved game: `localStorage[SAVE_KEY]` (`src/lib/game.ts`). `gameBefore(step => …)` gives a game whose next hint is a given technique.
   - Learned lessons: `localStorage[LEARNED_KEY]` (`src/lib/lessons.ts`), keys must be real `LessonId`s from `LESSONS`. Mark the easiest four or five. The app opens on Home: `openGame()` in `e2e/fixtures.ts` enters a saved game; `openLearn()` in `e2e/learn-page.spec.ts` reaches Learn.
   - Preferences: read `src/lib/preferences.ts` for the key and shape.
4. **Show the feature in use.** On the board, turn on Smart highlighting and select a filled cell so green possible cells show. On Learn, mark a few lessons learned. On hints, open the strip or walkthrough.
5. **Measure before capture** (`page.evaluate`):
   - Target element: `.board-wrap` when a board is on screen, otherwise `.app-bar`.
   - `rect.left` and `innerWidth - rect.right` must be within 1px of each other, and both 17 at 390px.
   - `document.documentElement.clientWidth === innerWidth`. If not, raise the viewport height until the page fits, then remeasure. Do not hide the scrollbar with CSS. Headless Chromium hides scrollbars, so this check matters mainly in headed or WebKit runs.
   - For a page taller than the viewport (the Learn list), capture the top 844px. A row cut off at the bottom edge is acceptable; say so in the report.
   - Blur the focused element so no focus ring shows.
6. **Capture** with `fullPage: false`, `scale: 'css'`. Never full-page. Run the copy with `node --experimental-strip-types <copy>.mjs <port> <out.png> [light|dark]`.
7. **Inspect the saved image** with Read: equal margins, readable digits, visible highlighting, nothing clipped, no browser chrome. Confirm 390 × 844 with `sips -g pixelWidth -g pixelHeight`.
8. **Save** to `docs/screenshots/<feature>-<state>[-dark].png`. Check `docs/screenshots/` first; if a matching capture exists, say so and ask whether it is stale.
9. **Stop the server** you started.

Reference capture: `docs/screenshots/smart-highlighting-phone-centered.png`.

## Clips

Playwright's `recordVideo` records frames at CSS-pixel size and ignores `deviceScaleFactor`. If `recordVideo.size` is larger than the viewport, for example 780 × 1688 to get a 2x clip, the page fills only the top-left 390 × 844, and the rest of the frame is gray (`#808080`). That is how the first PR #65 clip broke.

1. Set `recordVideo.size` equal to the viewport (`{ width: 390, height: 844 }`).
2. Upscale afterward if you need a larger file: `ffmpeg -i raw.webm -vf "scale=780:1688:flags=lanczos,format=yuv420p" -c:v libx264 -crf 16 -movflags +faststart -an out.mp4`.
3. Trim dead frames at the start (page load) with `-ss`.
4. **Gate:** extract frames at the start, middle, and end, and open each one with Read. Then confirm that the bottom-right corner is not filler:
   ```bash
   ffmpeg -v error -ss 1 -i out.mp4 -frames:v 1 -vf "crop=40:40:iw-40:ih-40" -f rawvideo -pix_fmt gray - \
     | od -An -v -tu1 | tr -s ' ' '\n' | grep -v '^$' | sort -u
   ```
   Output that is only `128`, or only `0`, means filler. Do not ship that clip.
5. Report the duration, dimensions, and the frames you inspected.

## Output

Report to Sean:
- The path, and the image itself (SendUserFile when available).
- Measured margins and `clientWidth` check, and the commit it was built from.
- One line of alt text describing what the image shows.

## Typefully

When replacing media on an existing post: fetch the latest version first, keep Sean's text, platforms, and scheduled time, attach with alt text, then fetch again to confirm the media is attached. **REQUIRED SUB-SKILL:** Use typefully for the API.

## Out of scope

- Writing the post text. Use writing-as-sean and build-in-public.
- Design mockups before a feature exists. Use rendering-design-directions.
- The link-preview image in `src/app/opengraph-image.png` (built by `pnpm build:share-image`).
- Committing the image, unless Sean asks.
