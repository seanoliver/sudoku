# Stale history entries after a reload

## Symptom

After reloading on a replay opened from the completion card, the app reopened on Home as designed, but Back reopened the finished game instead of staying on Home. Forward then reloaded the whole page.

## Root cause

- The game and replay each push a browser history entry marked `sudokuGame: true` or `sudokuReplay: true`. A reload only cleaned the entry it reloaded, so the game entry underneath still read as live, and Back landed in the game.
- The cleanup replaced the entry's state with `{}`. Next.js keeps its own keys (`__NA`, the route tree) in each entry and reloads the page on Back or Forward to an entry without them (`node_modules/next/dist/client/components/app-router.js`).

## Reproduction

1. Finish a puzzle, open Replay from the completion card.
2. Reload. The app opens on Home.
3. Press Back: the finished game opens. Press Forward: the page reloads.

## Fix

- Entries now carry a token for the page load (`PAGE_LOAD` in `src/components/game.tsx`) in place of `true`. An entry from an earlier load is stale, and the history handler steps past it.
- The reload cleanup removes only the app's two keys and keeps the rest of the entry's state, so Next.js never sees an entry without its keys.

## Verification

`e2e/replay.spec.ts`, "after a reload on a replay, Back goes to Home once and never reopens the finished game", checks that Back after the reload stays on Home and that the page doesn't reload. The back-button, history, and replay suites pass in Chromium and WebKit.

## Recurrence guardrail

- Any new history entry the app pushes must use `PAGE_LOAD` as its marker, never `true`.
- Never pass a fresh object to `replaceState` in this app; copy `history.state` and change only the app's keys.
