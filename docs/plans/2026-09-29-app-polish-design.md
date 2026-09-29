# App polish

A polish pass across the whole app, agreed with Sean on September 29. The goal is an app that feels cohesive, modern, and effortless, with tasteful, simple motion at its core. The reference is Apple's own apps (depth, sheets, spring transitions) with the restraint of Things 3. Good Sudoku was ruled out as a reference so the app does not read as a copy. The visual language below is directional: Sean confirms it from three rendered directions before any screen is rebuilt.

## Why

A September 29 tour of all 14 screens (light and dark, 390 × 844) found two visual languages. Home, History, and Replay use the newer card and gradient style; the game, Settings, lessons, and the completion card use the older, plainer one. Headers differ on every screen. Specific problems:

- The game screen has an empty band of about 50px under the app bar and about 90px under the keypad, and repeats "Install app" from Home.
- Finishing a puzzle is the flattest moment in the app; pause and completion leave a blank focus strip on the board.
- How to play is a wall of text, against the show-don't-explain rule in `AGENTS.md`.
- The walkthrough card has a large empty area under two lines; the lesson screen names the technique twice; Settings has a hint line that restates its buttons; the Replay timeline is a blank bar for short replays.

## Visual language

- **Type:** the system font, one scale: 32 bold screen titles, 20 semibold card titles, 17 body, 15 secondary, 13 captions. Nothing smaller.
- **Headers:** list screens (Home, Learn, History) get a large title that collapses into a compact bar on scroll. The game gets one compact bar: Home on the left; difficulty and timer in the middle; pause, hint, and Settings on the right. "Install app" stays only on Home.
- **Surfaces:** a plain background with grouped white cards. Translucent glass only on floating elements: sheets, the compact header while scrolling, and floating buttons such as Continue and Play.
- **Color:** keep the palette. Level tiles on Home and History become neutral cards with color only in the level's bar icon.
- **Shape:** 12 on cards, 20 on sheets, round pills; spacing in steps of 4 and 8. The board keeps its width and grid.

## Motion

Motion shows where something came from or went to. It never decorates.

- **Library:** Motion (formerly Framer Motion), package `motion`, imported from `motion/react`, loaded with `LazyMotion` to keep the first load small.
- **Springs:** three presets used everywhere. Snappy (about 150ms) for presses, toggles, and selection; smooth (about 350ms, slight settle) for sheets, cards, and screen changes; gentle (slower, no bounce) for the finish and progress.
- **Screens:** Continue grows Home's mini-board into the game board through a shared `layoutId`; back reverses it. Learn, History, and Replay push in from the right.
- **Sheets:** spring up, drag down to dismiss; the screen behind scales down slightly.
- **Board:** selection glides between cells; a placed number scales in from 90%; notes fade. Rejections and unit celebrations move onto the same springs.
- **Presses:** one press-in response on every button, key, and card. Haptics where the browser supports them.
- **Finish:** the board settles, a check draws itself, and the time counts up.
- **Reduced motion:** `MotionConfig reducedMotion="user"`; movement becomes short fades.

## Shared pieces

- `src/lib/motion.ts`: the spring presets and matching CSS durations.
- `MotionProvider`: `LazyMotion` plus `MotionConfig`; first paint does not animate.
- Tokens in `globals.css`: type, spacing, radii, and surfaces as variables for both themes.
- `<ScreenHeader>`: large collapsing title with an optional back button.
- `<Sheet>`: keeps the native `<dialog>` for focus trapping, Escape, and screen readers; Motion animates the panel and backdrop and adds drag-to-dismiss. All five sheets move onto it.
- `<Pressable>`: the shared press response through `whileTap`.
- Screen transitions: the state-driven screen switch in `game.tsx` is wrapped in `AnimatePresence`.
- Scope guard: only the sheets and the screen switch leave `game.tsx`. A broader breakup is a separate task.

## Rollout

One PR per step, each finalized before merge:

1. Three rendered directions for the game screen and Home, light and dark, at 390 × 844 and 466 × 590. Sean picks one.
2. Foundation: Motion, tokens, shared pieces. No visible change.
3. Game screen: one bar, no empty bands, board and key motion.
4. Sheets: Settings, New puzzle, How to play (short illustrated rows).
5. Finish moment, with its own three rendered directions; blank strips removed on pause and completion.
6. Learn and lessons: headers, one technique name, walkthrough card sized to its text.
7. Home, History, Replay: muted tiles, large titles, the Replay timeline, the grow-into-board transition.

Feature brainstorming follows step 1.

## Checks on every PR

- Existing unit and browser tests, including the 32-size fit test.
- Screenshots compared with the approved direction, light and dark.
- A reduced-motion pass.
- First-load JavaScript grows by no more than about 10kb gzipped.
- Sean checks smoothness on a phone for steps 3 and 7.
