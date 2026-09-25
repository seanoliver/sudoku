# Learn Module (First Slice) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** From the last step of a hint walkthrough, open a lesson for that technique: watch it on an example board, practice it on five boards graded by Check, and save it as learned, then return to the untouched game.

**Architecture:** The solver's detectors become generators so the engine can list every instance of a technique. A build script writes `src/lib/lesson-bank.ts` (an example plus practice boards per lesson), verified by a unit test. Pure modules own the lesson catalog, grading and learned storage (`src/lib/lessons.ts`). The game component gains a lesson mode: it holds the real game in a ref, runs practice boards through its existing `game` state (so all input, notes, exclusions and undo work unchanged), and skips saving, the clock and completion tracking while a lesson is open. Lesson chrome (header, prompt, footer, done card) lives in `src/components/lesson.tsx`.

**Tech Stack:** Next.js 16, React 19, TypeScript, `node:test` unit tests, Playwright e2e (Chromium + WebKit) against the production build.

**Design:** `docs/plans/2026-09-25-learn-module-design.md`. Visual reference: layout A renders (full-screen lesson). The layout prototype is stashed (`learn-proto-*` in `git stash list`); read its CSS for the lesson bar, prompt and dots, then drop it (Task 1).

**Conventions:** Dense one-line helpers, few comments (landmines only), object parameters for optional flags, `??`. Run `pnpm lint && pnpm typecheck && pnpm test` before every commit. UI tasks also run `pnpm build && pnpm test:e2e`.

---

### Task 1: Drop the layout prototype

The stash holds the `?learn=` mock. Save its CSS for reference, then drop it:

```bash
git stash list --format='%H %gs' | grep learn-proto
git stash show -p <sha> -- src/app/globals.css > /private/tmp/claude-501/-Users-seanoliver-code-learning-sudoku/7c063e5d-6e99-40d1-863b-67c64b1b7cb8/scratchpad/learn-proto.css.diff
git stash drop <stash@{n} matching that sha>
```

---

### Task 2: Detectors enumerate every instance

**Files:** Modify `src/lib/steps.ts`. Test: `tests/steps-all.test.ts` (new).

**Step 1: Failing test**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allSteps, applyStep, baseCandidates, findStep } from '../src/lib/steps.ts';
import { EXPERT_BANK } from '../src/lib/expert-bank.ts';

test('allSteps lists every instance, starting with the one findStep returns', () => {
  let many = 0;
  for (const entry of EXPERT_BANK.slice(0, 40)) {
    const values = [...entry].map(Number); const candidates = baseCandidates(values);
    for (let step = findStep(values, candidates); step; step = findStep(values, candidates)) {
      const all = allSteps(values, candidates, step.technique);
      assert.deepEqual(all[0], step);
      assert.ok(all.every(s => s.technique === step.technique));
      if (all.length > 1) many++;
      applyStep(values, candidates, step);
    }
  }
  assert.ok(many > 50, 'boards often hold more than one instance');
});
```

**Step 2:** Run it. Expected: FAIL, `allSteps` is not exported.

**Step 3:** Turn each detector into a generator (`function* nakedSingles`, `hiddenSingles`, `lockedCandidates`, `sets`, `fish`, `xyWings`, `colorings`) that `yield`s each step where it now `return`s one. Keep their bodies otherwise identical. Then:

```ts
const DETECTORS = { 'naked-single': nakedSingles, 'hidden-single': hiddenSingles, 'locked-candidates': lockedCandidates, pair: ..., triple: ..., x-wing: ..., quad: ..., swordfish: ..., 'xy-wing': xyWings, coloring: colorings } — ordered as TECHNIQUES
const first = <T>(it: Iterable<T>) => { for (const item of it) return item; return null; };
export function findStep(values, candidates) { for (const technique of ORDER) { const step = first(DETECTORS[technique](values, candidates)); if (step) return step; } return null; }
/** Every instance of one technique on this board, in the order findStep would meet them. */
export function allSteps(values, candidates, technique) { return [...DETECTORS[technique](values, candidates)]; }
```

`sets` takes `(candidates, size, technique)`, and `fish` takes `(candidates, size)`, so wrap them in the table. A naked single cell yields once. A hidden single in a box and in a row can yield the same placement twice; that's fine for grading.

**Step 4:** Run the new test and the full suite (the solver tests pin behavior). **Step 5:** Commit `refactor(solver): detectors enumerate every instance of a technique`.

---

### Task 3: Lesson catalog, grading, and learned storage

**Files:** Create `src/lib/lessons.ts`. Test: `tests/lessons.test.ts`.

```ts
export const LESSONS = ['naked-single', 'hidden-single', 'pointing', 'claiming', 'naked-pair', 'naked-triple', 'naked-quad', 'hidden-pair', 'hidden-triple', 'hidden-quad', 'x-wing', 'swordfish', 'xy-wing', 'color-wrap', 'color-trap'] as const;
export type LessonId = typeof LESSONS[number];
export function lessonOf(step: Step): LessonId  // technique + variant → id (locked-candidates → its variant; sets → `${variant}-${technique}`; coloring → `color-${variant}`)
export function lessonName(id: LessonId): string  // "Naked single", "Pointing", "Hidden pair", "X-wing", "Color wrap", … (title case like hint names)
export function lessonTechnique(id): Technique
export type Grade = { correct: boolean; step: Step };
/** Whether the change from `start` to `attempt` is one instance of the lesson's technique. Notes are ignored. */
export function grade(id: LessonId, start: GameState, attempt: GameState): Grade
export const LEARNED_KEY = 'sudoku.learned.v1';
export function readLearned(raw: string | null): Partial<Record<LessonId, string>>  // tolerant of bad JSON and unknown ids
export function markLearned(learned, id, date: string)
```

Grading rules: build candidates with `getPlayableCandidates(start)`, then take the instances: `allSteps(start.values, candidates, lessonTechnique(id)).filter(s => lessonOf(s) === id)`.
- Placed cells are those where `attempt.values` differs from `start.values`.
- Added exclusions are those in `attempt.exclusions` but not in `start.exclusions`. A removed exclusion counts as a change.
- For a placement instance, the answer is correct when exactly one cell was placed with that digit and nothing else changed.
- For an elimination instance, the answer is correct when nothing was placed, nothing was removed, and the added exclusions equal the instance's eliminations as a set.
- `step` is the matching instance when the answer is correct, and `instances[0]` otherwise.

Tests, each built from a real bank board via the Task 4 helper, or from the same walk as `tests/explain.test.ts`: a correct placement; a correct elimination; the correct move plus an extra exclusion is wrong; the wrong digit is wrong; a notes-only change is wrong. Also test `lessonOf` for every lesson using `firstStep`, and `readLearned` against bad input.

Commit: `feat(learn): lesson catalog, grading and learned storage`.

---

### Task 4: Lesson bank

**Files:** Create `scripts/build-lesson-bank.ts`, generated `src/lib/lesson-bank.ts`, `src/lib/lessons.ts` (`practiceGame`), `package.json` script `build:lesson-bank`. Test: `tests/lesson-bank.test.ts`.

Entry format, strings for size: `{ lesson: LessonId; givens: string; values: string; solution: string; exclusions: string }`. `exclusions` is 81 groups of digits joined by `,` (for example `"47,,3,..."`).

`LESSON_BANK: Record<LessonId, Entry[]>`. Index 0 is the example board; the rest are practice boards, up to 5.

Script: walk the Expert bank, then `buildPuzzle({ difficulty: 'hard', seed, clueTarget: 0 })` for seeds 1–400. At each step:
- Solve with `findStep` / `applyStep` on `values` and `candidates`.
- `exclusions[i] = baseCandidates(values)[i] minus candidates[i]`.
- If `lessonOf(step)` still has fewer than 6 boards and this puzzle hasn't contributed one to that lesson, store the board.
- Solutions come from `solveWithTechniques(givens).values`. Skip puzzles it can't finish.

Stop when every lesson is full or the sources run out, and print each lesson's count.

`practiceGame(entry): GameState`:

```ts
const base = createGame({ id: `lesson-${entry.lesson}-${…}`, difficulty: 'expert', givens: digits(entry.givens), solution: digits(entry.solution) });
const game = fillNotes({ ...base, values: digits(entry.values), exclusions: parse(entry.exclusions) });
return { ...game, history: [], redoHistory: [] };
```

Test: for every entry, `findStep` on the entry's values and playable candidates returns a step whose `lessonOf` is the entry's lesson, and whose placement or eliminations agree with the solution. Every lesson except the quads has at least 3 boards. `practiceGame` leaves the history empty and fills notes.

Commit: `feat(learn): generated lesson bank with verified practice boards`.

---

### Task 5: Lesson screen components

**Files:** Create `src/components/lesson.tsx`; CSS in `src/app/globals.css`.

- `LessonBar({ name, index, count, phase, onExit })`: a grid with "‹ Your game" (chevron icon rotated), the name, and dots (done, current, upcoming), per the layout A render.
- `LessonPrompt({ name, state })`: the 44px bar in place of the focus bar.
  - `watch`: bulb and the name.
  - `practice`: "Find the {name}".
  - `correct`: check icon and "That’s the {name}", in the green tint.
  - `wrong`: "Not quite", in the red-soft tint.
- `LessonFooter({ label, disabled, onClick })`: a full-width primary button under the keypad.
- `LessonDone({ name, onExit })`: a card in the controls area, with "{name} learned" and a "Back to your game" button.

Port the prototype CSS with `lesson-` names. The prompt matches the strip's 44px height, so the board sits where it does in a game.

---

### Task 6: Lesson mode in the game

**Files:** Modify `src/components/game.tsx`.

**State:** `const [lesson, setLesson] = useState<{ id: LessonId; phase: 'watch' | 'practice' | 'done'; index: number; start: GameState; result: Grade | null; line: number } | null>(null)`, and `heldGame = useRef<GameState | null>(null)`.

**Behavior:**
- `openLesson(id)`: put `game` in `heldGame`, `setGame(practiceGame(LESSON_BANK[id][0]))`, clear the hint, and set phase `watch` with line 0.
- **Watch:** the walkthrough is `explainStep(findStep(start), board)`. It renders with the existing overlay and panel, stepped by `line`. The footer reads "Start practice".
- **Practice board `i`:** `setGame(practiceGame(bank[i + 1]))`. The footer reads Check, disabled while `game === start`.
  - On Check, `grade(id, start, game)`.
  - Correct: the result is correct and the footer reads "Next board", or "Finish" on the last board.
  - Wrong: the panel shows the walkthrough of `result.step` on the start board, and the footer reads "Try again", which resets `game` to `start`.
- **Done:** `markLearned` and write `LEARNED_KEY`. Show `LessonDone`.
- **Exit** (any phase): `setGame(heldGame.current)`, clear the lesson, restore selection, and focus the selected cell.

**Guards while `lesson` is set:**
- The save effect returns early. This is a landmine comment: saving here would overwrite the player's game with a practice board.
- The clock is not running.
- The completion and history effects are skipped.
- The hint button and focus bar are hidden, replaced by `LessonPrompt`.
- `game-meta` and the app bar are replaced by `LessonBar`.
- Settings and new game are unavailable.

**Entry:** on the last line of a hint walkthrough, `WalkthroughPanel` shows a text button, "Learn {lessonName}", which calls `openLesson(lessonOf(step))`.

Focus: after each phase change, move focus to the footer button. Use `focusAfterRender`, as the walkthrough does.

Commit: `feat(learn): lessons from hints with watch, practice and learned status`.

---

### Task 7: Browser tests

**Files:** `e2e/lesson.spec.ts`; reuse `e2e/fixtures.ts`.

1. Opening a lesson from a pointing-pair hint shows the lesson bar with the name. "‹ Your game" returns, and `localStorage[SAVE_KEY]` is byte-identical to its value before the lesson.
2. Watch → "Start practice" → board 1: make the correct move through the UI and Check. The test reads the answer from `grade`'s instances in Node, using `LESSON_BANK`. The prompt then reads "That’s the Pointing", and Next moves to board 2.
3. A wrong move → Check → "Not quite" and the walkthrough panel → Try again restores the board.
4. After finishing every board, the done card shows and `LEARNED_KEY` contains the lesson.
5. The timer does not advance during a lesson. Compare the clock text before and after a 2 s wait.

Run in Chromium and WebKit. Commit: `test(learn): lesson flow in the browser`.

---

### Task 8: Verify, document, PR

- Browser check at 390×844, light and dark: watch, practice, correct, wrong, done. Save `docs/screenshots/learn-practice.png`, `learn-correct.png`, and `learn-done.png`.
- `docs/ROADMAP.md`: milestone 8 status line.
- Investigation entry if anything non-obvious turned up (for example, how many boards each lesson got).
- Pre-push checklist, PR, one independent review. Merge only on Sean's word.
