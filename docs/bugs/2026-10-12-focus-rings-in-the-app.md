# Focus rings show in the iPhone app

## Symptom
In the iPhone app, some controls showed the browser's blue focus ring after a tap or when the app moved focus to them. The clearest case was the X on the new-game sheet, which opens with focus on it. Sean said it reads like web UI.

## Root cause
The app is a web view running the website's code, and the website draws a ring on `:focus-visible` so keyboard users can see where they are. WebKit matches `:focus-visible` when script moves focus (a sheet focusing its close button, for example), so tap users in the app saw rings too. Nothing told the CSS it was running in the app.

## Reproduction
1. In the iPhone app, open a game and tap the difficulty name to start a new puzzle.
2. The sheet opens with a blue ring around its X.

## Fix
`src/app/layout.tsx` sets `data-app="ios"` on `<html>` in the iOS build only. Under it, `globals.css` removes every focus outline and a focused cell's blue ring; a hint-mistake cell keeps its red ring. The website is unchanged.

## Verification
- `e2e/app-focus.spec.ts` checks a control, a focused cell, a hint-mistake cell, and a walkthrough cell on the website and with `data-app="ios"`. Each check fails with its CSS removed.
- CI builds the iOS export and fails unless `out/index.html` has `data-app="ios"`.

## Recurrence guardrail
The tests and CI step above, and the AGENTS.md note that CSS for the app goes under `:root[data-app='ios']`.
