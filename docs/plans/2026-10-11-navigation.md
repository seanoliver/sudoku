# Home, History, Replay, and Screen Transitions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** R13 step 7 as approved in `2026-10-11-navigation-design.md`: Learn, History, and Replay push in from the right, Continue grows Home's mini-board into the game board, with large-title headers, neutral level cards, and a Replay timeline that shows short replays.

**Architecture:** The screen switch in `game.tsx` becomes one `.app` element keyed by screen inside React's `<ViewTransition>`. Navigation handlers run in `startTransition` with a transition type (`push`, `pop`, `grow`, `shrink`), and CSS animates the view-transition pseudo-elements. The mini-board and the game board share one `<ViewTransition name="board">`. Only one screen is ever in the DOM, so the leaving screen needs no `inert` and the focus effect needs no scoping.

**Why not Motion `AnimatePresence` and `layoutId`, as the polish plan said:** the approved render was made with the browser's View Transitions, and this Next.js ships React's `<ViewTransition>` (`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`). It adds no first-load JS, keeps one screen in the DOM, and the October 11 spike in this branch ran at 60 fps in Chromium. Browsers without View Transitions (iOS before 18; the app targets 16.4) switch screens at once, as today.

**Tech Stack:** Next.js 16 App Router (bundled React canary with `ViewTransition` and `addTransitionType`), CSS `::view-transition-*` pseudo-elements, Playwright (Chromium and WebKit).

**Changes found while building (October 12):**
- Reduced motion changes screens at once instead of cross-fading. During a view transition the browser hit-tests past the named screens, so taps and keys in the first 150 ms were lost.
- React renders updates from a `popstate` event synchronously, which skips the view transition, so the Home button and Replay's back run their animated change one task after the event.
- React holds effects (focus, Escape listeners) until the transition ends, about 500 ms. The clock reads its saved time during its first render, or the game bar showed 00:00 during Continue.
- The board's view-transition group needs `z-index: 2`, or Home's card covers it on the way back.
- The header row and the large title are siblings, so the row can stick for the whole screen.
- A `motion-webkit` Playwright project runs the navigation tests in WebKit too.

**Rules:** the polish plan's rules apply (`2026-09-29-app-polish.md`, top). First-load ceiling for step 7: 166.3 + 24 + 4 × 5 = 210.3 kB.

---

### Task 1: One keyed screen tree (done in the spike)

**Files:** Modify `src/components/game.tsx`.

- Remove the three early returns for Replay, History, and Learn. Compute `const screen: Screen = replayView && replaying && game ? 'replay' : historyData ? 'history' : learnOpen ? 'learn' : onHome ? 'home' : 'game'` and render that screen inside one `<ViewTransition key={screen} enter={SCREEN_ENTER} exit={SCREEN_EXIT} default="none"><div className="app">`.
- `handleKey` stays on the game screen only (`onKeyDown={screen === 'game' ? handleKey : undefined}`), as before.
- Move the `<dialog className="sheet">` out of `.app` to be its sibling, so a screen change never unmounts an open sheet. `handleKey` already ignores events from inside a dialog, and `body:has(.sheet[open]) .app` still matches.
- Lessons stay part of the `game` screen, so the clock is never remounted during a lesson.

**Verify:** `pnpm typecheck`, then `pnpm build && pnpm test:e2e`. Expected: all pass (no visible change yet without the CSS).

### Task 2: Transition types and CSS

**Files:** Create `src/components/screen-motion.ts`; modify `game.tsx`, `home.tsx`, `src/app/globals.css`.

- `screen-motion.ts` exports `SCREEN_ENTER` (`push-in`, `pop-in`, `fade`), `SCREEN_EXIT` (`push-out`, `pop-out`, `fade`), and `BOARD_SHARE` (`board` for `grow` and `shrink`, otherwise `none`), all with `default: 'none'`.
- `move(type, change)` in `game.tsx`: when `.app.swiping` exists (a finished iOS swipe has already moved the screen), call `change()` directly; otherwise `startTransition(() => { addTransitionType(type); change(); })`.
- Push: `openHistory`, `openLearn`, `openReplay`. Pop: `exitHistory`, `exitLearn`, `closeReplay` when not in the replay entry. Grow: `continueGame`. Shrink: `leaveGame` when not in the game entry.
- Controls that step back through history (`leaveGame`, `exitReplay`) set `pendingMove` first; `onHistory` reads and clears it and runs the change in `move(pending, …)`. Browser Back and Forward carry no type and change at once, because Safari's own swipe-back already animates.
- Wrap the Continue button's `MiniBoard` and the game's `.board-wrap` in `<ViewTransition name="board" share={BOARD_SHARE} default="none">`.
- CSS: `::view-transition { pointer-events: none }`; push: the new screen slides in from 100% with a left shadow, the old moves to −30% and dims to brightness .88; pop: the reverse, with the leaving group at `z-index: 1`; `fade` cross-fades; 460 ms, `cubic-bezier(.32, .72, 0, 1)` (the sheets' curve). Reduced motion: every pseudo-element cross-fades in 150 ms and nothing moves.

**Tests:** create `e2e/navigation.spec.ts` and a third Playwright project `motion` (Chromium, `reducedMotion: 'no-preference'`, `testMatch: /navigation|replay|history|back-button/`).
- History pushes: right after the click, `document.getAnimations()` includes an animation on `::view-transition-new(...)` named `screen-in`.
- Back from History pops: the animation is `screen-out`; focus lands on the solved-count chip after it ends.
- Continue grows: a `::view-transition-group(board)` animation runs; focus lands on the selected cell.
- Browser Back from History: no `::view-transition` animation with a slide name.
- The motion project runs the existing replay tests (Escape, two quick Escapes, focus on Play) and back-button tests with motion on.
- Reduced motion (default projects): opening History runs no `screen-in` animation.

### Task 3: ScreenHeader

**Files:** Create `src/components/screen-header.tsx`; modify `history-page.tsx`, `learn-page.tsx`, `replay-page.tsx`, `globals.css`.

- `ScreenHeader({ title, subtitle, back, size, onExit })`: a nav row (back button with the classes `screen-back lesson-back`, which the iOS swipe presses; a centered compact title) and, for `size="large"`, a 32px `h1` with the subtitle under it. For `large`, the compact title is hidden until the large title scrolls under the row (an `IntersectionObserver` on the `h1` toggles `data-collapsed` on the header; the row is `position: sticky; top: 0` with the canvas background).
- History and Learn: `large`, back "Home". Replay: `compact`, title "Medium solve", the level tiles and time under it; back "Home" or "Your game" by `replayView.from`.
- Focus targets that named `.lesson-back` keep working, because the class stays.

**Tests:** `e2e/history.spec.ts` and `learn-page.spec.ts` find the title by role `heading` and name; one test scrolls History and expects `data-collapsed`.

### Task 4: Home and History look

**Files:** `globals.css`, `home.tsx`.

- Greeting: 13px, uppercase, `--secondary`. Title: 32px.
- Levels: one grouped list, `--surface`, 16px radius, hairline dividers; color only in the tiles.
- History level cards: `--surface` with a hairline border; the best time in `--secondary`.

### Task 5: Replay timeline

**Files:** `globals.css`.

- Unplayed ticks: numbers `color-mix(in srgb, var(--blue) 30%, var(--line))`, notes `color-mix(in srgb, var(--hint) 35%, var(--line))`. Played ticks keep their full colors.

**Test:** in `replay.spec.ts`, a short replay at step 1 has number ticks whose fill differs from `--line`.

### Task 6: Clock on the first frame

**Files:** `src/components/clock.tsx`.

- The spike showed the game bar at 00:00 during Continue, then the saved time. If the clock reads its saved seconds in `useEffect`, read it during the first render instead (or in `useLayoutEffect`), so the new snapshot already shows the time. Check that the clock e2e and unit tests still pass.

### Task 7: Verify

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`, `node scripts/first-load-js.mjs` within 210.3 kB.
- Capture Home, History, Replay, and Learn at 390 × 844, light and dark, and compare them side by side with `docs/designs/navigation-approved*.png`.
- Record the transitions with the screencast recorder at 60 fps and compare with `navigation-approved.webm`.
- WebKit: run the motion tests in WebKit once locally (Playwright's WebKit supports View Transitions); if it fails, keep the project Chromium-only and note it.
- iOS: `pnpm build:ios` builds; on device or simulator, a finished swipe-back from History does not play the pop after the swipe.

### Task 8: Docs and PR

- Update `2026-10-11-navigation-design.md` (View Transitions, not `layoutId`), the polish design and plan's step 7 lines, and the roadmap status.
- Investigation entry `docs/investigations/2026-10-11-view-transitions.md`: how React's `<ViewTransition>` works here, the swipe and Back rules, browser support, and why the dialog moved out of `.app`.
- PR with the approved and built renders, the 60 fps clip, and first-load JS numbers; then `finalize-pr`.
