# Sudoku PWA implementation and verification

## Context

Create a free Next.js Sudoku game with a Things-inspired interface, fast mobile interactions, local progress saving, and offline installation. Work lives in the standalone `sudoku` Git repository.

## Key findings

- Next.js 16.3.5, React 19.3.0, and a TypeScript 5.9 toolchain produce a statically rendered App Router page. ESLint 9 is used because the React/import/a11y plugins bundled with the Next ESLint configuration do not yet advertise ESLint 10 support.
- Puzzle creation runs in a dedicated worker. A uniqueness solver checks each removed clue; 36 seeded generated puzzles cover the three difficulties in automated tests.
- Building the service worker after Next finishes lets its atomic precache include all actual hashed assets, including the separate puzzle worker. The production build precaches 27 URLs.
- A read-only code review found a preferences error that could overwrite a valid game. The fix and regression are recorded in [the bug journal](../bugs/2026-09-13-preferences-recovery.md).

## How it works

The main page renders a client game with pure number/note/undo transitions. Changes persist to a versioned localStorage record that is validated on restore. The clock updates within a separate component and retains fractional time between effect lifecycles. It excludes background time and pauses in dialogs, on explicit pause, and after completion.

The service worker atomically installs the shell, icons, manifest, and all static chunks. Navigation uses the shell matching that worker version; exact static-resource requests use that cache. A new worker waits while existing app clients are open, then activates and cleans older Sudoku caches. RSC requests are not treated as HTML. Service workers are not registered by development builds.

## Gotchas

- Use `pnpm build` so the service worker is generated after the framework output. Restart production after rebuilding. Close the old app tab before reopening to activate an update.
- Physical phones require HTTPS for installation and service workers; a plain HTTP LAN address is insufficient.
- Difficulty is based on clue density, with uniqueness taking precedence. It is not yet graded by human solving techniques.
- Storage is per device and may be cleared or evicted. Multiple active tabs are not synchronized.
- The Browser tool's full-page capture rendered at half scale in this session; regular viewport captures match the DOM geometry. Screenshots use regular captures.

## Verification

- Ten automated tests pass: unique generation at three difficulties, solver immutability/ambiguity, conflicts, fixed clues, number/note undo, peer-note cleanup, completion, corrupt saved-game rejection, and independent preference recovery.
- TypeScript, ESLint, and the production build pass.
- Browser initial load produced 81 cells and usable controls, without console errors.
- At 390 × 844, the board is 354px square and the entire game/footer fits the viewport. At 320 × 568, there is no horizontal overflow; compact spacing keeps the number pad visible. The footer may scroll on the shortest screens.
- Entered a deliberate conflict: both duplicate numbers were marked; undo restored the empty cell.
- Added a pencil note, reloaded, and verified the same cell retained the note.
- Paused: board was covered and input disabled. Resumed through the visible Resume puzzle button.
- Opened new-puzzle selection, cancelled, and verified existing notes were retained.
- Stopped the local server. Curl confirmed connection refused. Reloaded the app successfully with saved notes, then generated a medium puzzle with 34 givens while the server remained stopped.
- Solved the visible medium puzzle from its displayed clues and entered all 47 missing numbers through the UI. Completion appeared, pause became disabled, and completion persisted after reload.
- Restarted production, reloaded, left the origin, and reopened. The updated cell readonly semantics confirmed new-worker activation while the completed game was preserved.
- Keyboard digit entry, Cmd/Ctrl+Z, and arrow navigation passed through visible controls. Light/dark settings and phone-size sheet layout were inspected. Final delivery is a fresh easy puzzle. See [light screenshot](../screenshots/mobile-light.png) and [dark screenshot](../screenshots/mobile-dark.png).

Actual home-screen installation, VoiceOver behavior, and physical-device animation performance require a phone; they are not claimed as verified here.

## References

- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Using Service Workers, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [React useReducer reference](https://react.dev/reference/react/useReducer)
- Installed Next metadata/manifest types and React TypeScript declarations were inspected before API use.
