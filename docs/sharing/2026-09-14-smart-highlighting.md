# Sudoku: smart highlighting sharing brief

## Source and objective

- Source: feature commit `2162cb8`, approved design, and `docs/investigations/2026-09-14-smart-highlighting.md`.
- Primary objective: feedback on optional solving assistance.
- Project stage: personal Sudoku app with a deployed, browser-tested highlighting feature.

## Central story

The app can highlight legal empty cells for a selected number. Players enable this assistance in Settings.

## Proof

- Live demo: https://sudoku-three-liard.vercel.app
- Screenshot: `docs/screenshots/smart-highlighting-live.png`.
- Live browser checks: default off, correct legal cells for the selected digit, highlights clear on empty selection, and preference persists after reload. No browser console errors.
- Local verification: 14 tests, type checking, lint, and production build passed. Light and dark themes inspected.

## Audience

Sudoku players who can describe whether candidate highlighting helps them solve or removes reasoning they enjoy.

## Distribution sequence

| Order | Channel | Native angle | Artifact | Call to action | Timing rationale |
| ----- | ------- | ------------ | -------- | -------------- | ---------------- |
| 1 | X | One optional solving aid with a playable example | Short draft below, live screenshot, demo URL | Would you keep this on while solving? | Ready for Sean to review now that the feature is live. Publish when he can respond. |

## Core learning question

Do players want legal-cell highlighting available throughout a puzzle, or only when they get stuck?

## Measures

- Audience signal: replies from people who describe trying the feature.
- Product-learning signal: reasons for leaving highlighting enabled or disabling it.
- Follow-up threshold: review after five substantive player responses; fewer responses leave the question open. This is a proposed threshold, not an observed result.

## Feedback return path

Record attributed feedback in a follow-up investigation entry. Use it to decide whether to retain the opt-in default or explore more temporary highlighting controls. No feedback has been collected yet.

## Drafting status

X-only draft saved in Typefully for @SeanOliver: https://typefully.com/?d=10770464&a=84484. Includes the live screenshot with alt text and the demo URL. Verified status: draft, no scheduled date, all other platforms disabled. Writing critic: opening sentence corrected to include a subject; revised draft passed. Publishing, scheduling, and replies remain unrequested.

## X draft

I added smart highlighting to my Sudoku game. Select a number on the board to see the empty cells where it could go. It’s optional and works in light and dark mode.

https://sudoku-three-liard.vercel.app

Would you keep this on while solving?
