---
name: adding-a-solving-technique
description: Use when adding, renaming, reordering, or removing a Sudoku solving technique or deduction (W-wing, skyscraper, jellyfish, unique rectangle, a new variant of an existing one) so the solver, difficulty rating, hints, walkthroughs, and Learn lessons all know about it.
---

# Adding a solving technique

A technique touches five source files, a generated lesson bank, and most test files. The compiler catches a missing entry in `DETECTORS`, `BAND_OF`, `NAMES`, `techniqueName`, and `explainStep`. It does not catch `DETECTORS` order, `DIFFICULTY_BANDS`, or any test. Work through this list in order.

## Before code

1. **Read** `src/lib/steps.ts` top to bottom and one similar detector (`xyWings` for chains of bivalue cells, `fish` for line patterns, `sets` for subsets).
2. **Ask Sean where it goes in `TECHNIQUES`.** Order is difficulty: the solver tries detectors in order, so the position changes which step every hint shows and which boards every lesson gets.
   - Before `coloring` or earlier: hints show it in Expert games, and the lesson bank changes (other lessons' boards may be replaced). The Expert bank changes only if you rebuild it.
   - Last before `'beyond'`: no existing board changes, but it may never fire in Expert games; its lesson boards then come only from puzzles that used to rate `'beyond'`.
   Give Sean the frequency table from step 3 with the question.
3. **Measure frequency** with a throwaway detector in the scratchpad, run over `EXPERT_BANK` and hard seeds 1–3000 at each candidate position: Expert puzzles that use it, lesson boards found, and other lessons whose boards would change. `tests/lesson-bank.test.ts` needs **at least 4 boards per lesson** (only `hidden-quad` is exempt). If it cannot reach 4, stop and tell Sean.
4. **Walkthrough visuals are a feature design.** If the explanation needs a new board mark (a new kind of link, shading, or chip), use rendering-design-directions. If it reuses `house`, `focus`, `target`, `chips`, `links`, `strike`, `colored`, `ghost`, ask Sean in the same message as step 2 whether to skip the directions.

## Source changes

| File | Change |
| --- | --- |
| `src/lib/steps.ts` | Add to `TECHNIQUES`; add an evidence field on `Step` if the walkthrough needs structure (like `xyWing`, `fish`); write the `function*` detector; add to `DETECTORS` **in the same order** as `TECHNIQUES` (`findStep` relies on key order). |
| `src/lib/difficulty.ts` | Add to a band in `DIFFICULTY_BANDS`. |
| `src/lib/lessons.ts` | Add a `LessonId` to `LESSONS` and `NAMES`; update `lessonOf` / `lessonTechnique` if it has variants; add to `BAND_OF` (must mirror `DIFFICULTY_BANDS`). Check `inSentence`: it keeps capitals only for names matching its regex. A name like "W-wing" needs the regex widened, or prompts read "Find the w-wing". |
| `src/lib/hint-view.ts` | `techniqueName` case (compiler enforces). |
| `src/lib/explain.ts` | A walkthrough function and an `explainStep` case (compiler enforces). Every line ≤ `EXPLAIN_TEXT_LIMIT` (170 chars). |

## Regenerate, in this order

1. `pnpm build:expert-bank` (slow), only if Sean wants existing Expert puzzles re-rated with the new technique. The lesson bank is built from it, so run this first.
2. `pnpm build:lesson-bank`. Read the printed counts: the new lesson must show ≥ 4. Diff `src/lib/lesson-bank.ts` and report how many other lessons' boards changed.

## Tests

- `tests/difficulty.test.ts`: the exact `TECHNIQUES` array.
- `tests/step-evidence.test.ts`: the pattern's defining facts, checked on every found instance (see the XY-wing test).
- `tests/explain.test.ts`: walkthrough lines and marks. The panel-fits test walks only the first 150 Expert-bank puzzles, so add a length check over `LESSON_BANK['<id>']` too.
- `tests/hint-view.test.ts`: the display name.
- `tests/lessons.test.ts`: a new `inSentence` assertion for the name (none exists yet); the "maps back" list if an Expert seed reaches it.
- `tests/lesson-bank.test.ts`: raise the `LESSONS.filter(hasLesson).length >=` count.
- `tests/hints.test.ts`: the `seen` list, only if the Expert bank produces it.
- `e2e/learn-page.spec.ts` or `e2e/lesson.spec.ts`: open the new lesson; check title and "Find the …" prompt.

Run `pnpm lint && pnpm typecheck && pnpm test`, then `pnpm build && pnpm test:e2e`.

## Verify in the browser

At 390 × 844 (the app opens on Home; `openGame()` in `e2e/fixtures.ts` enters a saved game): the Learn page lists the lesson in the right band with its diagram; the example walkthrough fits without scrolling; a practice board grades a correct answer as correct; the hint strip names the technique. `gameBefore` searches only 400 Expert seeds; if it finds nothing, seed the save from `practiceGame(LESSON_BANK['<id>'][0], 0)`. Screenshots: capturing-share-screenshots.

## Docs

Update the technique list in `docs/ROADMAP.md` (Learn module section) and the README's difficulty description; syncing-docs covers the rest. Add an investigation entry with the frequency table from step 3.

## Out of scope

- Changing how difficulty bands or the Expert rule (`isExpert`) work.
- Lesson page layout or new lesson UI.
- Techniques that need guessing or backtracking; those stay `'beyond'`.
