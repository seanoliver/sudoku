# Sudoku: playtest fixes sharing brief

## Source and objective

- Source: PRs #23 (rejected-entry feedback), #24 (faded red exclusions), #25 (peer exclusions cleared on entry), and #26 (unit celebrations), merged and deployed September 23. Design docs in `docs/plans/2026-09-23-*`.
- Primary objective: feedback on whether the completed-unit sweep helps players keep going or distracts them.
- Project stage: personal Sudoku PWA, live at https://sudoku.seanoliver.dev.

## Central story

Finishing a row, column, or box now plays a short green sweep. It shipped with three other changes from Sean's own play.

## Proof

- Demo: https://sudoku.seanoliver.dev
- Clip: `docs/screenshots/unit-celebration-post.mp4` (2.8s, 780 × 1688, recorded from production). It shows a cell selected, a 5 entered, and the sweep across its row, column, and box.
- Stills: `docs/screenshots/unit-celebration-light.png`, `unit-celebration-dark.png`, and `unit-celebration-final.png`.

## Audience

Sudoku players who can say whether a per-unit celebration makes a solve more satisfying or pulls attention off the board.

## Distribution sequence

| Order | Channel | Native angle | Artifact | Call to action | Timing rationale |
| ----- | ------- | ------------ | -------- | -------------- | ---------------- |
| 1 | X | A visible new effect, asked about directly | Main post with the sweep clip, reply with the other three changes | Does it help you keep going, or would you turn it off? | All four changes are live now. Post when Sean can answer replies. |

## Core learning question

Should the completed-unit sweep stay always on, become a setting, or be toned down?

## Measures

- Audience signal: replies from people who tried the app.
- Product-learning signal: stated reasons for keeping the sweep or turning it off.
- Follow-up threshold: review after five substantive replies. This is a proposed threshold. No replies exist yet.

## Feedback return path

Record attributed replies in a new `docs/investigations/` entry. Use them to decide whether the sweep needs an off switch in Settings. No feedback has been collected yet.

## Drafting status

X-only thread draft saved in Typefully for @SeanOliver. Two posts (203 and 269 characters), the clip attached to post 1, all other platforms disabled, no scheduled date. The writing critic returned the copy CLEAN after three rounds. Publishing, scheduling, and replies remain unrequested.

## X draft

Main post (203 characters, attach the sweep clip):

> My Sudoku app now plays a short green sweep when you finish a row, column, or box. Does it help you keep going, or would you turn it off?
>
> It's one of four changes I shipped today.
>
> sudoku.seanoliver.dev

Reply (269 characters):

> The other three:
>
> - With Block incorrect answers on, a rejected number shows in the cell, struck through
> - With Smart highlighting on, cells where you crossed out that number turn faded red
> - Placing a number clears it from crossed-out marks in its row, column, and box
