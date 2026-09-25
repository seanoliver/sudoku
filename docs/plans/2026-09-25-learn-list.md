# Learn Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** A Learn page, opened from a book button in the top bar, that lists every lesson by difficulty band with a mini diagram and learned status, and opens lessons that return to the list.

**Architecture:** Pure helpers in `src/lib/lessons.ts` (`LESSON_BANDS`, `lessonDiagram`). A presentational `src/components/learn-page.tsx`. In `game.tsx`, the held game moves out of `LessonState` into its own `held` state, shared by the Learn page and lessons; `lesson.from` decides where a lesson returns.

**Design:** `docs/plans/2026-09-25-learn-list-design.md`. Prototype component and CSS are saved in the session scratchpad (`learn-list-proto.tsx`, `learn-list-proto.css.diff`).

### Task 1: Bands and diagrams (TDD)
`tests/lessons.test.ts`:
- Every lesson with boards appears in exactly one band.
- The bands follow `DIFFICULTY_BANDS` order.
- `lessonDiagram(id)` returns 81 roles, with the pattern cells marked `pattern` and the move's cells marked `move`, and coloring lessons carrying both `gold` and `blue`.

Implement the helpers in `lessons.ts`, then commit.

### Task 2: Learn page component and CSS
`LearnPage({ learned, onOpen, onExit })` with the rows and the `Diagram`. Port the prototype CSS as `learn-*`. Commit.

### Task 3: Held game shared by the page and lessons
- `held: { game, selected, focus, entry } | null` replaces the `held*` fields on `LessonState`, and `LessonState` gains `from: 'hint' | 'list'`.
- `openLearn` holds the game and shows the page. `exitLearn` restores the game. `openLesson(id, from)` holds the game only if nothing is held yet.
- `exitLesson` returns to the list when `from` is `'list'`, and restores the game otherwise.
- The lesson bar's back label follows `from`. The done card reads "Back to Learn" from the list.
- The save effect and the clock treat `held !== null` as away.

Commit.

### Task 4: Browser tests
`e2e/learn-page.spec.ts`:
- The book button opens the page with 14 rows and the right learned count.
- A row opens its lesson. "‹ Learn" returns to the list. "‹ Your game" returns to the game with an unchanged save.
- Finishing a lesson from the list returns to the list with its check shown.

Commit.

### Task 5: Verify, docs, PR
Screenshots in light and dark, roadmap status, then the PR and an independent review.
