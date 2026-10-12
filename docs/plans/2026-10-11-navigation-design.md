# Home, History, Replay, and screen transitions

Roadmap item: R13, app polish, step 7. On October 11 Sean chose direction A, push stack, from three options rendered in the app (push stack, zoom from source, card stack). Reference: ../designs/navigation-approved.png (History), with dark, Replay, and Home beside it, and the motion in ../designs/navigation-approved.webm. All options: ../designs/navigation-options.png.

## Transitions

- Learn, History, and Replay push in from the right. The screen underneath slides 30% left and dims slightly. Back reverses it: the top screen slides off to the right, with a shadow on its left edge.
- This matches the iOS app's interactive swipe-back, which already slides the screen right over Home.
- Continue grows Home's mini-board into the game board, which share one view-transition name; the rest of the screen cross-fades. The game's Home button shrinks it into the mini-board again.
- Browser Back and Forward, and a finished iOS swipe-back, change the screen at once: the browser or the swipe has already moved it.
- Replay opened from the game pushes over the game in the same way.
- Reduced motion: screens change at once, as before step 7.

## Headers

- History and Learn: a row with "‹ Home" on the left, then a 32px large title with a secondary line under it ("14 solved", "2 of 14 learned"). The large title collapses into the row's center on scroll.
- Replay: one compact row: "‹ Home" (or the game, when opened from it) on the left, and the title ("Medium solve") centered with the level tiles and time under it.
- Home keeps the brand bar and the Settings button. The greeting becomes a small uppercase label above the 32px title.

## Home and History

- Home's levels become one grouped list of neutral rows with hairline dividers; color stays only in each level's tile icon.
- History's level cards become neutral cards; color stays only in the tile icon.

## Replay

- The timeline shows every step before playback: unplayed number and note ticks are a light tint of their color instead of the plain line color, so a short replay is not a blank bar.

## Not in this step

- Learn's own restyle (step 6). Learn only gets the shared header and the push.
