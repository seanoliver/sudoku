# Back button and browser history

## Context

Home and the game are one page with a `view` state, so the browser's back button left the app from inside a game. The fix gives the game its own history entry. Next.js 16 patches the History API, so the question was whether a custom `pushState` survives its router.

## Key findings

- Next.js wraps `window.history.pushState` and `replaceState` (`node_modules/next/dist/client/components/app-router.js`). A call without its `__NA` key gets Next's internal keys (`__NA`, `__PRIVATE_NEXTJS_INTERNALS_TREE`) copied in from the current entry. Custom keys in the same object are kept.
- Next's `popstate` handler reloads the page when an entry lacks `__NA`. Entries created through the patched `pushState` always have it, so back and forward never reload.
- Going back to the same URL makes Next dispatch a traverse to the same route tree. It re-renders nothing visible.

## How it works

- Entering the game (Continue, or starting a puzzle) pushes `{ sudokuGame: true }` unless the current entry already has it.
- The Home button calls `history.back()` when on that entry, so the button and the back button use one entry and history does not grow.
- A `popstate` listener maps entries to views:
  - Back to Home while in the game: closes any open sheet and goes Home.
  - Back while a lesson opened from a hint is showing: leaves the lesson and pushes the game entry again, since the player is back in the game.
  - Back while a puzzle is generating: pushes the entry again and stays put.
  - Forward to the game entry from Home: continues the game.
- On load, a leftover game entry is cleared with `replaceState`, because a reload always opens on Home.

## Gotchas

- Pass a fresh object to `pushState`. Next mutates the object it is given.
- Lessons and the Learn page opened from Home have no entry of their own, so back from them leaves the app, as before.
- After a reload inside the game, the cleared entry stays in history. Leaving the app from Home then takes one extra back.

## Verification

- `e2e/back-button.spec.ts` covers each case above in Chromium and WebKit.

## References

- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` (Native History API)
- `src/components/game.tsx` (`GAME_ENTRY`, `leaveGame`, `onHistory`)
