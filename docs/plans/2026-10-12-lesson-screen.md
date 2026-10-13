# Lesson Screen Implementation Plan

**Goal:** R13 step 6 as approved in `2026-10-12-lesson-screen-design.md`: one coach card under the board holds the lesson's state, step text, and action; the strip above the board and the footer button go; the name shows once.

**Changes found while building (October 12):**
- Portrait phones at 640–667px tall scrolled by 6–8px in practice: the coach line and its gap are 10px taller than the strip they replace. `--lesson-coach: 10px` adds it to the lesson's board budget.
- On short screens the lesson keeps 256px for everything but the board, down from 280px: room for the longest step (Swordfish, five lines at 375 × 553).
- On short screens the controls card is only as wide as the board, about 200px, so the state wrapped beside Check. A container query on the card drops the icon and narrows the button under 260px, and the state's line height lets two lines fit the row.
- Step text is 15px on phones up to 760px tall and on short screens, so the longest Swordfish and X-Wing steps fit at 390 × 664 and 360 × 640.

**Rules:** the polish plan's rules apply (`2026-09-29-app-polish.md`, top). The prototype is on `design/lesson-screen` (`?lesson=b`).

### Task 1: LessonCoach

**Files:** `src/components/lesson.tsx`, `src/components/game.tsx`.

- Replace `LessonPrompt` and `LessonFooter` with `LessonCoach({ name, state, walk, action })`. The state line's text is `role="status"`. While a walkthrough shows (watch, or a wrong move), the card shows progress segments, the step text, Back, and Next; on the last step Next becomes the action (`.lesson-action`). Otherwise the action sits on the state line.
- Render it first in `.controls-area`; hide the rest of the controls while it is walking. Do not render `WalkthroughPanel` in a lesson.
- Next in the coach records the tap time the action's double-tap guard reads, because the action replaces Next in place.
- Focus targets: `LESSON_FOOTER_FOCUS` becomes `LESSON_ACTION_FOCUS`, `.lesson-action`; `stepWalkthrough` treats focus inside `.lesson-coach` like focus in the walkthrough panel.

### Task 2: Sizes

**Files:** `src/app/globals.css`.

- Portrait: drop `--lesson-footer`. The coach's state line replaces the strip's height, so `--around-board` is unchanged.
- Side by side: the 77px around the board counts the focus strip; lessons have none, so subtract it only outside lessons.
- Short screens: recompute the lesson's 280px from a render at 466 × 590 and 375 × 600, so the page does not scroll.
- Remove the `.lesson-prompt` and `.lesson-footer` rules; tint the controls card green when correct and red when wrong.

### Task 3: Tests

- `e2e/fixtures.ts`: `footer` becomes the coach's action, `prompt` the state line; `tapFooter` steps through the walkthrough first when the action is not shown yet.
- Update expected text: "Watch how it works", "Found it".
- New: the name appears once on the lesson screen; the keypad is hidden while watching; the board is larger than before at 375 × 667 (286px).

### Task 4: Verify

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`; first-load JS within the ceiling.
- Capture the five states at 375 × 667, light and dark, and compare with `docs/designs/lesson-approved*.png`; capture the side-by-side and short layouts.
