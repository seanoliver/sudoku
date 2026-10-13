# Accomplishments and sharing (R7 research)

## Context

R7 asks which wins are worth keeping, how they show in the app, and how a player shares one from a phone, including "Instagram-native" stories. This spike reads what the app stores per solve today, proposes an accomplishment model, and checks current platform facts for sharing. No app code changed.

## Key findings

### What is stored per solve today

| Key | Written by | Holds |
| --- | --- | --- |
| `sudoku.solves.v1` | `src/lib/solves.ts`, `game.tsx:222` | One record per game id: `id`, `difficulty`, `seconds`, `day`, `givens`. First solve only (`recordSolve`); capped at 500. |
| `sudoku.daily-solves.v1` | `src/lib/daily.ts`, `game.tsx:227` | One record per day and level: `day`, `level`, `seconds`. `dailyStreak` counts days in a row. |
| `sudoku.solved.v1` | `src/lib/home.ts` (`storeSolved`) | Ids of every finished game, uncapped. |
| `sudoku.puzzle-history.v1` | `src/lib/history.ts` | Expert bank puzzles seen and completed, including solves from before History. |
| `sudoku.replays.v1` | `src/lib/replay.ts` | Move recordings for the last 20 games, under 1 MB. `replayStats` derives numbers, notes, and fixes. |
| `sudoku.learned.v1` | `src/lib/lessons.ts` | Lesson id to the date it was learned. |

Gaps:

- **Hints are not recorded.** `applyHint` writes an ordinary move, so a replay cannot tell a hinted number from a placed one. A no-hint solve needs a new counter.
- **Fixes are derived, not stored.** The finish card computes them from the replay, which is dropped after 20 newer games. History cannot show fixes for older solves.
- **Restart resets the clock** (`game.tsx:441` writes `seconds: 0`) but keeps the game id. A player who restarts an unsolved puzzle replays it from memory and can set a fast best time.
- **The link preview image is static.** PR #41 renders `src/app/opengraph-image.png` at build time from `scripts/share-image/`. There is no image route, and the iOS app is a static export with no server, so per-solve images must be drawn on the device.

### Platform facts (checked 2026-10-13)

1. **Web Share with files works in Safari.** MDN's compatibility data lists `navigator.share()` from Safari 12.1 and the `files` member and `canShare()` from Safari 14, with iOS mirroring desktop Safari ([MDN browser-compat-data, Navigator.json](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json)). It needs HTTPS and a user gesture ([MDN canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare)).
2. **WKWebView is unverified.** MDN marks the iOS WebView as mirroring Safari, but I found no primary source confirming `navigator.share({ files })` inside a Capacitor app. Test on a device before depending on it.
3. **`@capacitor/share` shares files on iOS.** Current version 8.0.3 (npm, published 2026-10-02). `ShareOptions.files` takes `file://` URLs and is "only supported on iOS and Android" ([Capacitor Share docs](https://capacitorjs.com/docs/apis/share)). The image must first be written to a file, for example with `@capacitor/filesystem`.
4. **Direct Instagram Stories is native only.** The `instagram-stories://share?source_application=<App ID>` scheme needs a Facebook App ID (required since January 2023), `instagram-stories` in `LSApplicationQueriesSchemes`, and the image placed on the iOS pasteboard under `com.instagram.sharedSticker.backgroundImage` or `.stickerImage`, with optional top and bottom colors ([Meta, Sharing to Stories](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories/)). Background images are JPG or PNG, at least 720×1280, 9:16. Stickers are about 640×480. Meta documents only iOS and Android apps, so a website cannot use it, and our app would need native code in `MainViewController`. `Info.plist` has no `LSApplicationQueriesSchemes` today.
5. **Story size.** 1080×1920. Instagram covers about 250 px at the top and bottom, which leaves a central area of about 1080×1420 ([inro.social, 2026 guide](https://www.inro.social/blog/instagram-story-size)). Meta publishes no official safe zone for organic stories, so treat this as community guidance.

"Instagram-native" in practice: the share sheet path sends a PNG to Instagram, which offers Stories, Feed, and Messages. The player then edits it in Instagram's story editor. The direct scheme skips the sheet and opens the story editor with our image as the background or as a sticker on our colors. The second costs a Meta app registration and a native bridge; the first costs nothing beyond the image. That the share sheet offers Stories for an image is expected behavior I did not verify on a device.

## How it works

### Proposed accomplishment model

| Accomplishment | Evidence | Supported today? | Rule against cheap repeats | Game Center later |
| --- | --- | --- | --- | --- |
| New best time per level | `seconds`, `difficulty` | Yes: `solves.v1`, `isNewBest` | First solve only (exists). Exclude solves after a restart. | Leaderboard, not achievement |
| First solve at a level | count per level | Yes: `levelStats` | Once per level | Achievement |
| Clean solve (no hints, no fixes) | hints used, fixes | No: needs new counters | Counters keyed by game id, never lowered by undo or restart | Achievement (Hard, Expert) |
| Daily solved | day, level | Yes: `daily-solves.v1` | One per day and level (exists) | None |
| Daily streak 7, 30, 100 | streak length | Yes: `dailyStreak` | Earned once per threshold; date kept | Achievement |
| Solve count 10, 50, 100, 500 | total solves | Yes: `solved.v1` plus Expert history | Ids are unique (exists) | Incremental achievement |
| Technique learned, all learned | lesson dates | Yes: `learned.v1` | Once per lesson (exists) | Achievement |

Assistance boundaries: Fill notes, highlighting, and filtered keys are bookkeeping the player chose, so they do not affect a clean solve. Only applied hints and fixes do. Lesson practice games (`lesson-*` ids) do not earn solve accomplishments.

Storage: keep the per-solve evidence on the solve record (`hints`, `fixes`, `restarted`, all optional so old records still read), and earned milestones in `sudoku.accomplishments.v1` as id to `{ day, solveId }`. Derived wins such as first solve can be recomputed, but storing the earned date keeps them after the 500-solve cap trims History. Both keys stay under `sudoku.` so `ProgressStore` backs them up.

### Where it surfaces (show, don't explain)

- **Finish card:** the existing "Best time" sparkles chip is the pattern. Add one chip for the best accomplishment earned: a level icon for a first solve, a shield for a clean solve, a flame with the number for a streak milestone. A share icon button joins Replay and Play again.
- **History:** recent solve rows get a small shield for clean solves; each level card already shows the best time.
- **Daily:** a streak milestone day gets a ring in the week row and month calendar.
- **Replay:** the share button also sits in Replay's header, since a replay is the record of the solve.

### Save-to-share flow

1. The solve finishes and the evidence is saved with the record.
2. The finish card shows the chip for anything earned.
3. The player taps Share. The app draws the image on a canvas from stored data, offline, after `document.fonts.ready`.
4. `canvas.toBlob` gives a PNG. On the website: `navigator.canShare({ files })`, then `navigator.share({ files, text })`. In the iOS app: write the PNG to the cache folder and call `Share.share({ files })`.
5. If file sharing is unavailable, share the text summary, then fall back to copying it.

A daily is the same puzzle for everyone, so the image must not show the solved board. Show the givens, or cells shaded by when they were filled, never the digits the player placed.

### Text share, the cheap slice

```
Sudoclue Daily, Oct 13, Hard
6:42, no hints, 1 fix
🟦🟦🟨
🟨🟦🟪
🟪🟪🟨
sudoku.seanoliver.dev
```

The 3 × 3 grid is the nine boxes, colored by when each was completed (first, middle, or last third of the solve), computed from the replay. It shows the shape of a solve without revealing digits, which is what Wordle's grid does.

### Recommended first slice

Record solve evidence (hints applied, fixes, restarted) on each solve, show one accomplishment chip on the finish card, and add a Share button that sends the text summary.

- **In:** the evidence fields, the clean-solve, first-solve, and streak-milestone chips, the text share with clipboard fallback, and `sudoku.accomplishments.v1`.
- **Out:** the story image, direct Instagram Stories, an accomplishments screen, and Game Center. Slice 2 is the story image through the share sheet. Slice 3, only if Sean wants it, is the native Instagram scheme.

### Design directions to render later

- **A. Result card:** the finish card, enlarged to 9:16 on midnight, with the givens board above it.
- **B. Solve map:** cells shaded by when they were filled as the hero, with the time and level below.
- **C. Streak calendar:** the month calendar with the streak lit, for daily and milestone shares.

## Gotchas

- A best time set after a restart is suspect. Mark the solve `restarted` and leave it out of best times, or decide otherwise in the open questions.
- Counting hints by "levels opened" punishes a player who peeks and then finds the move alone. Counting only applied hints misses a player who reads the full walkthrough and enters the digit themselves.
- The device clock sets `day`, so streaks can be gamed. That is acceptable while progress is local; R16 must solve it before ranking.
- With Hide timer on, the finish card hides the time, and the share text should leave it out too.

## Verification

- Storage keys and write paths read from source on 2026-10-13 at `e2210b5`.
- Platform facts fetched on 2026-10-13 from the sources linked above; `@capacitor/share` version and date from `npm view`.
- Not verified: `navigator.share({ files })` in WKWebView; that Instagram's share sheet entry offers Stories for a PNG; Meta's story safe zone.

## Decisions and open questions

Sean answered on October 13:

1. **Hints.** Opening a hint to see the technique's name keeps a solve clean. Going on to the walkthrough, which shows where on the board to look, counts as assisted, and so does applying a move. Sean also wants a limit on hints per puzzle, after which the player starts over. The limit and what happens when it is reached are still open.
2. **Restart.** A time set after Restart does not count as a best time.
3. **Daily share.** Agreed in principle that it shows no numbers. Sean wants to see design options before choosing.
4. **Instagram Stories.** Not now. The share sheet is enough until players ask for it.
5. **Text or image.** Open. Sean wants to see an example of a text share and an image share before choosing.

## References

- `src/lib/solves.ts`, `src/lib/daily.ts`, `src/lib/home.ts`, `src/lib/replay.ts`, `src/lib/lessons.ts`, `src/components/game.tsx` (`FinishCard`, solve recording).
- `docs/plans/2026-09-25-share-image-design.md`, `docs/plans/2026-10-11-finish-moment-design.md`, `docs/plans/2026-10-12-daily-puzzle-design.md`, `docs/investigations/2026-10-09-ios-wrapper.md`.
- [Meta, Sharing to Stories](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories/), [Capacitor Share](https://capacitorjs.com/docs/apis/share), [MDN canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare), [MDN browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json), [inro.social story size guide](https://www.inro.social/blog/instagram-story-size), all accessed 2026-10-13.
