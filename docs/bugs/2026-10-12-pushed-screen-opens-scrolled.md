# A pushed screen opens scrolled down, with its large title already gone

## Symptom
On a short screen (landscape, or a small phone), scrolling Home to reach the History or Learn chip and tapping it opened that screen scrolled by the same amount. History's large title was off-screen and its header had already collapsed. Back to Home kept whatever scroll the pushed screen had.

## Root cause
Every screen is a child of the same document, so they all share the window's scroll position. Nothing reset it when the screen changed. This was true before R13 step 7, but the new large-title headers made it visible: the title is the first thing a pushed screen shows.

## Reproduction
1. At 844 × 390, open Home and scroll to the bottom (about 530 px).
2. Tap the solved count.
3. History opens at a `scrollY` of about 530 px, with `.screen-nav[data-collapsed='true']`.

## Fix
`game.tsx` records the window's scroll position for each screen and restores it when the screen changes. History, Learn, and Replay open at 0. Home and the game go back to where they were left. The restore runs in a layout effect, so during a view transition the browser takes the new snapshot after the scroll.

## Verification
- `e2e/navigation.spec.ts` ("a pushed screen opens at its top…") with motion on, in Chromium and WebKit.
- `e2e/history.spec.ts` ("History opens at its top from a scrolled Home…") under reduced motion.
- With the `scrollTo` removed, the motion test fails with History at 352 px instead of 0.
- 15 repeats of each test in all four projects pass.

## Recurrence guardrail
The two tests above. A new screen added to `Screen` opens at its top unless it is added to the restore list beside Home and the game.
