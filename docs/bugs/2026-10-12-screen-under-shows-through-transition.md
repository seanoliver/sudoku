# The screen underneath shows through a push or pop

## Symptom
While History, Learn, or Replay slid in or out, Home's text showed through the moving screen: its large title ran through History's title, and its level list showed between History's cards. It lasted the whole 460 ms, up to the last frame of the slide. Sean saw it in the 60 fps clip after PR #82 merged.

## Root cause
A view transition snapshots `.app`, and `.app` had no background. The page color comes from `html`, which is not in the snapshot. So the snapshot of the screen on top was transparent everywhere except its cards and its sticky header row, and the screen under it, which slides only 30%, showed through.

## Reproduction
1. Open Home with motion on.
2. Tap the solved count, and freeze the transition at 90% (`document.getAnimations()`, pause, set `currentTime`).
3. Home's title and level list are visible through History.

## Fix
`::view-transition-new(.push-in)` and `::view-transition-old(.pop-out)`, the snapshots on top, get `background: var(--canvas)` in `globals.css`. The iOS swipe already had this on `.app.swiping`.

## Verification
- Frozen frames at 90% of a push and 8% of a pop, before and after: `docs/screenshots/navigation-overlap-before-after.png`.
- `e2e/navigation.spec.ts` ("the screen on top of a push or pop is opaque…") reads the computed background of the `screen-in` and `screen-out` snapshots. It fails with `rgba(0, 0, 0, 0)` without the fix, in Chromium and WebKit.

## Recurrence guardrail
The test above. A new transition class that puts a screen on top needs the same background.
