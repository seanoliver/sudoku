# App polish

A polish pass across the whole app, agreed with Sean on September 29. The goal is an app that feels cohesive, modern, and effortless, with tasteful, simple motion at its core. The reference is Apple's own apps (depth, sheets, spring transitions) with the restraint of Things 3. Good Sudoku was ruled out as a reference so the app does not read as a copy. On September 29 Sean chose direction A, grouped cards, from three rendered in the app (grouped cards, glass dock, quiet paper), and asked for the game content to be centered vertically under the bar. Reference: ../designs/polish-look-approved.png, ../designs/polish-look-approved-dark.png, ../designs/polish-look-approved-home.png, ../designs/polish-look-approved-home-dark.png, ../designs/polish-look-approved-short.png; the three options: ../designs/polish-look-options.png.

## Why

A September 29 tour of all 14 screens (light and dark, 390 × 844) found two visual languages. Home, History, and Replay use the newer card and gradient style; the game, Settings, lessons, and the completion card use the older, plainer one. Headers differ on every screen. Specific problems:

- The game screen has an empty band of about 50px under the app bar and about 90px under the keypad, and repeats "Install app" from Home.
- Finishing a puzzle is the flattest moment in the app; pause and completion leave a blank focus strip on the board.
- How to play is a wall of text, against the show-don't-explain rule in `AGENTS.md`.
- The walkthrough card has a large empty area under two lines; the lesson screen names the technique twice; Settings has a hint line that restates its buttons; the Replay timeline is a blank bar for short replays.

## Visual language

- **Type:** the system font, one scale: 32 bold screen titles, 20 semibold card titles, 17 body, 15 secondary, 13 captions. Nothing smaller.
- **Headers:** list screens (Home, Learn, History) get a large title that collapses into a compact bar on scroll. The game gets one compact bar: Home on the left; difficulty and timer in the middle; pause, hint, and Settings on the right. "Install app" stays only on Home.
- **Surfaces:** grouped cards on a gray background, as in iOS. Background `#f2f2f7` light, `#0b0d11` dark; cards white light, `#1b1e25` dark. On the game screen the board with its focus strip is one card (8px padding) and the modes, tools, and keys are a second card (10px padding); keys, tools, and the mode switch fill with the background color inside the card. Translucent glass only on floating elements: sheets, the compact header while scrolling, and floating buttons such as Continue and Play.
- **Game layout:** the compact bar is 56px tall. The content under it (board card, progress line, controls card) is centered vertically in the remaining height. The short-screen height budget must include the card padding: the approved render clips the last key row at 466 × 590, and the build must not.
- **Home:** levels become one grouped list of rows with hairline dividers; the Continue card, lesson card, and install card are cards on the gray background. The greeting becomes a small uppercase label (13px, secondary) above a 32px title.
- **Color:** keep the palette. Level tiles on Home and History become neutral cards with color only in the level's bar icon.
- **Shape:** 20 on the game's two cards and on sheets, 16 on Home's grouped list and cards, 10 on the board inside its card, 8 on keys, round pills; spacing in steps of 4 and 8. The board keeps its grid.

## Motion

Motion shows where something came from or went to. It never decorates.

- **Library:** Motion (formerly Framer Motion), package `motion`, imported from `motion/react`, loaded with `LazyMotion` to keep the first load small.
- **Springs:** three presets used everywhere. Snappy (about 150ms) for presses, toggles, and selection; smooth (about 350ms, slight settle) for sheets, cards, and screen changes; gentle (slower, no bounce) for the finish and progress.
- **Screens:** Continue grows Home's mini-board into the game board through a shared `layoutId`; back reverses it. Learn, History, and Replay push in from the right.
- **Sheets:** spring up, drag down to dismiss; the screen behind scales down slightly.
- **Board:** the selection outline gets rounded corners and a more playful feel, and glides between cells; a placed number scales in from 90%; notes fade. Rejections and unit celebrations move onto the same springs.
- **Presses:** one press-in response on every button, key, and card. Haptics where the browser supports them.
- **Finish:** the board settles, a check draws itself, and the time counts up.
- **Reduced motion:** `MotionConfig reducedMotion="user"` switches off movement and scaling; where something would otherwise appear abruptly, a short fade is added explicitly.

## Shared pieces

- `src/lib/motion.ts`: the spring presets.
- `MotionProvider`: `LazyMotion` plus `MotionConfig`. The small core loads first; the layout and drag features (about 28kb, needed for the shared board transition and drag-to-dismiss) load after first render, so they stay out of the first load.
- Tokens in `globals.css`: type, spacing, radii, and surfaces as variables for both themes.
- `<ScreenHeader>`: large collapsing title with an optional back button.
- `<Sheet>`: keeps the native `<dialog>` for focus trapping, Escape, and screen readers; Motion animates the panel and backdrop and adds drag-to-dismiss. All five sheets move onto it.
- `<Pressable>`: the shared press response through `whileTap`.
- Screen transitions: the state-driven screen switch in `game.tsx` is wrapped in `AnimatePresence`.
- Each shared component ships in the PR of the first screen that uses it, so no PR adds unused code.
- Scope guard: only the sheets and the screen switch leave `game.tsx`. A broader breakup is a separate task.

## Rollout

One PR per step, each finalized before merge:

1. Three rendered directions for the game screen and Home, light and dark, at 390 × 844 and 466 × 590. Done: Sean chose A, grouped cards, with centered game content.
2. Foundation: Motion, the provider, spring presets, tokens, and a first-load JS script. No visible change.
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
- First-load JavaScript grows by no more than about 12kb gzipped, and Motion's deferred features stay under about 30kb (measured September 29: core 11.4kb, `domMax` 29.6kb).
- Sean checks smoothness on a phone for steps 3 and 7.
