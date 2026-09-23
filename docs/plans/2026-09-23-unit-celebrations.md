# Unit celebrations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Sweep a pale green flash across each row, column or box that a player's entry completes, and across the whole board on the final entry.

**Architecture:** A pure `completedUnits` helper compares the board before and after an entry. `input()` in `game.tsx` stores a short-lived celebration `{ id, origin, cells, label }`; keyed overlay spans animate with per-cell delays; a timer clears it; a hidden live region announces it.

**Tech Stack:** Next.js 16, React 19, TypeScript, plain CSS, `node:test` via `pnpm test`.

**Design:** `docs/plans/2026-09-23-unit-celebrations-design.md`

---

### Task 1: `completedUnits` helper

**Files:** Modify `src/lib/sudoku.ts`; create `tests/unit-celebrations.test.ts`.

**Step 1: Failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completedUnits, generatePuzzle } from '../src/lib/sudoku.ts';

const solution = generatePuzzle('hard', 19).solution;
const without = (cells: number[]) => solution.map((v, i) => cells.includes(i) ? 0 : v);
const summary = (units: ReturnType<typeof completedUnits>) => units.map(u => `${u.kind} ${u.number}`);

test('completing the last cell of a row reports only that row', () => {
  const before = without([0, 9]); // row 1 missing cell 0; column 1 also missing cell 9
  const after = before.map((v, i) => i === 0 ? solution[0] : v);
  assert.deepEqual(summary(completedUnits({ before, after, index: 0 })), ['row 1']);
});

test('one entry can complete a row, a column and a box together, with their cells', () => {
  const before = without([40]);
  const after = solution;
  const units = completedUnits({ before, after, index: 40 });
  assert.deepEqual(summary(units), ['row 5', 'column 5', 'box 5']);
  assert.deepEqual(units[0].cells, [36, 37, 38, 39, 40, 41, 42, 43, 44]);
  assert.deepEqual(units[2].cells, [30, 31, 32, 39, 40, 41, 48, 49, 50]);
});

test('duplicates, already complete units and erasing never count', () => {
  const before = without([0, 1]);
  const duplicate = before.map((v, i) => i === 0 ? solution[1] : v); // row 1 filled except cell 1
  const filledDup = duplicate.map((v, i) => i === 1 ? solution[1] : v); // nine cells, one digit twice
  assert.deepEqual(summary(completedUnits({ before: duplicate, after: filledDup, index: 1 })).includes('row 1'), false);
  assert.deepEqual(completedUnits({ before: solution, after: solution, index: 0 }), []);
  assert.deepEqual(completedUnits({ before: solution, after: without([0]), index: 0 }), []);
});
```

**Step 2:** `pnpm test` → FAIL (`completedUnits` not exported).

**Step 3: Implement** in `src/lib/sudoku.ts` (uses the file's existing `row` and `box` helpers):

```ts
export type Unit = { kind: 'row' | 'column' | 'box'; number: number; cells: number[] };
const unitsOf = (index: number): Unit[] => [
  { kind: 'row', number: row(index) + 1, cells: indexes.filter(i => row(i) === row(index)) },
  { kind: 'column', number: index % 9 + 1, cells: indexes.filter(i => i % 9 === index % 9) },
  { kind: 'box', number: box(index) + 1, cells: indexes.filter(i => box(i) === box(index)) },
];
const isUnitComplete = (values: readonly number[], cells: number[]) => new Set(cells.map(i => values[i]).filter(Boolean)).size === 9;
/** Rows, columns and boxes containing `index` that `after` completes with 1–9 exactly once and `before` did not. */
export function completedUnits({ before, after, index }: { before: readonly number[]; after: readonly number[]; index: number }): Unit[] {
  if (!Number.isInteger(index) || index < 0 || index >= 81) return [];
  return unitsOf(index).filter(unit => isUnitComplete(after, unit.cells) && !isUnitComplete(before, unit.cells));
}
```

Check that values are always 0–9 so "9 distinct non-zero values" means 1–9 exactly once.

**Step 4:** `pnpm test && pnpm lint && pnpm typecheck` pass.

**Step 5:** `git commit -m "feat(game): detect rows, columns and boxes completed by an entry"`

---

### Task 2: Celebration state, rendering and styles

**Files:** `src/components/game.tsx`, `src/app/globals.css`.

1. Imports: add `completedUnits` from `@/lib/sudoku`.
2. Module constants beside `REJECTION_MS`: `const CELEBRATION_STEP_MS = 45; const CELEBRATION_MS = 520;`
3. State beside `blockedEntry`:
```ts
const [celebration, setCelebration] = useState<{ id: number; origin: number; cells: number[]; label: string } | null>(null);
const celebrationId = useRef(0);
```
4. In `input()`, replace the final `else setGame(current => current ? enter(current, {...}) : current);` with:
```ts
    } else {
      const next = enter(game, { index: selected, value, pencil, exclude: excluding, blockIncorrectAnswers: preferences.blockIncorrectAnswers, filterNumberKeys: preferences.filterNumberKeys });
      if (next === game) return;
      setGame(next);
      if (!pencil && !excluding && value) {
        const units = completedUnits({ before: game.values, after: next.values, index: selected });
        const finished = isComplete(next);
        if (finished || units.length) {
          const label = finished ? 'Puzzle complete' : units.map(({ kind, number }, i) => `${i ? kind : kind[0].toUpperCase() + kind.slice(1)} ${number}`).join(' and ') + ' complete';
          const cells = finished ? [...Array(81).keys()] : [...new Set(units.flatMap(unit => unit.cells))];
          setCelebration({ id: ++celebrationId.current, origin: selected, cells, label });
        }
      }
    }
```
   Keep the existing batch branch unchanged. `isComplete` is already imported.
5. Timer and visibility (beside the rejection effect):
```ts
  useEffect(() => {
    if (!celebration) return;
    const reach = Math.max(...celebration.cells.map(i => Math.abs(Math.floor(i / 9) - Math.floor(celebration.origin / 9)) + Math.abs(i % 9 - celebration.origin % 9)));
    const timer = window.setTimeout(() => setCelebration(null), reach * CELEBRATION_STEP_MS + CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [celebration]);
  const celebrating = celebration && !paused && !sheet ? celebration : null;
```
   Extract the distance calculation into a small module-level `distance(a, b)` helper and reuse it in render.
6. Clear with `setCelebration(null)` in: `openSheet`, the pause toggle, `restartPuzzle`, `requestPuzzle`, `doUndo`, `doRedo`. Not in `selectCell`.
7. Render inside the cell button, before `{value ? <span className="cell-number">…` so the overlay sits under the digit in DOM order:
```tsx
{celebrating?.cells.includes(i) && <span key={`celebrate-${celebrating.id}`} className="unit-celebration" style={{ animationDelay: `${distance(i, celebrating.origin) * CELEBRATION_STEP_MS}ms` }} aria-hidden="true"/>}
```
   For performance, derive `const celebratedCells = useMemo(() => new Set(celebrating?.cells), [celebrating])` and use `.has(i)`.
8. Announcement: after the existing rejection `sr-only` paragraph, add `<p className="sr-only" role="status">{celebrating?.label ?? ''}</p>`. It must render when the puzzle is complete too; place it outside any `!complete` branch (check where the keypad/completion panel conditional is) — e.g. next to the board.
9. CSS in `globals.css` after the rejection rules:
```css
.cell-number { position: relative; z-index: 1; }
.unit-celebration { position: absolute; inset: 0; border-radius: inherit; background: var(--possible); opacity: 0; pointer-events: none; animation: unit-sweep 520ms ease-out both; }
@keyframes unit-sweep { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
```
   Merge the `.cell-number` addition into the existing `.cell-number` rule (line ~65) instead of a second rule. After the reduced-motion override for rejection, extend it: `@media (prefers-reduced-motion: reduce) { .unit-celebration { animation: none !important; opacity: 1; } }` (the global reduced-motion rule would otherwise end the animation instantly at opacity 0).
10. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass. Commit `feat(game): celebrate completed rows, columns and boxes`.

---

### Task 3: Verify and document

- Browser (Playwright, 390 × 844, per `AGENTS.md`): set up a board one cell short of completing a row and a column; enter the digit; confirm overlays on the 17 cells with increasing delays, label "Row N and column M complete", clears after about 1.2s. Final-cell case sweeps 81 cells and shows the completion panel. Undo then no celebration. Pause mid-sweep clears. Reduced motion: static tint, no animation. Dark theme readable. Save a recording and screenshots in `docs/screenshots/`.
- `docs/ROADMAP.md`: status line under "Small celebrations for completed units".
- Full gate, PR checklist, PR.
