# Screen transitions with React's ViewTransition

## Context

R13 step 7 needed iOS-style pushes for Learn, History, and Replay, and the mini-board growing into the game board. The polish plan assumed Motion's `AnimatePresence` and `layoutId`. The approved prototype was made with the browser's View Transitions API, and this Next.js ships React's `<ViewTransition>` (`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`), so step 7 used that.

## Key findings

- `ViewTransition` and `addTransitionType` import from `react` here; Next's App Router bundles a React canary that has them. They add no first-load JS (187.5 kB after step 7).
- Only one screen is in the DOM. The browser snapshots the old screen, React commits the new one, and CSS animates `::view-transition-old/new(...)`. The leaving screen needs no `inert`, and the focus code needs no scoping.
- React holds passive effects until the transition finishes (measured: DOM switched at 54 ms, focus moved at 537 ms). Focus, the Escape listeners, and anything read in `useEffect` arrive after the animation.
- While a transition runs, hit-testing skips named elements. `::view-transition { pointer-events: none }` does not help, because the whole screen is named, so taps in that window are lost.
- React renders updates inside a `popstate` handler synchronously, and a synchronous update skips the view transition. In-app controls that call `history.back()` set `pendingMove`, and `onHistory` starts the animated change in a `setTimeout`.
- Paint order of view-transition groups follows the DOM, so a shared element nested in a screen can be painted under the other screen's snapshot. `::view-transition-group(.board) { z-index: 2 }` keeps the board on top.

## How it works

- `game.tsx` computes `screen` (`home`, `game`, `learn`, `history`, `replay`) and renders one `<ViewTransition key={screen} enter={SCREEN_ENTER} exit={SCREEN_EXIT} default="none">` around `.app`. The Settings dialog sits beside `.app`, so a screen change never unmounts an open sheet.
- `move(type, change)` runs `change` inside `startTransition` with `addTransitionType(type)`. It changes at once for reduced motion and while `.app.swiping` exists (a finished iOS swipe-back).
- `SCREEN_ENTER` and `SCREEN_EXIT` (`screen-motion.ts`) map each type to a view-transition class: `push-in`, `push-out`, `pop-in`, `pop-out`, `fade`. `globals.css` animates those classes.
- The Continue button's mini-board and the game's `.board-wrap` share `<ViewTransition name="board" share={BOARD_SHARE}>`, which only shares for `grow` and `shrink`.

## Gotchas

- Tests that act right after a navigation must wait for the transition to finish. `e2e/navigation.spec.ts` wraps `document.startViewTransition` to count started and finished transitions. `document.activeViewTransition` alone races, because React starts the transition after the click handler returns.
- An element that is still animating keeps the screencast busy. The mini-board's endless float made the recorder capture about twice as many frames.
- Browsers without View Transitions (iOS before 18; the app targets 16.4) change screens at once.

## Verification

- `e2e/navigation.spec.ts` runs in the `motion` (Chromium) and `motion-webkit` projects: push and pop animation names, focus after the animation, Escape, browser Back with no transition, two quick Escapes on Replay, and the board's z-index.
- Frozen-frame screenshots (pause every view-transition animation at 30%, 60%, and 90%) found the blank board, which a screencast showed only as missing frames.

## References

- `src/components/game.tsx` (`move`, `pendingMove`, the screen tree), `src/components/screen-motion.ts`, `src/app/globals.css` (screen transitions).
- `docs/plans/2026-10-11-navigation.md`, `docs/plans/2026-10-11-navigation-design.md`.
