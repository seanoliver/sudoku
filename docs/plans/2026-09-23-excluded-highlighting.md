# Faded red exclusions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** With Smart highlighting on, give empty cells a pale red background when the rules allow the active digit there but the player has excluded it.

**Architecture:** A pure `excludedCells` helper in `src/lib/candidates.ts` derives the set from values and exclusions. `game.tsx` memoizes it next to `possible` with the same gating and adds a cell class. One CSS rule styles it.

**Tech Stack:** Next.js 16, React 19, TypeScript, plain CSS, `node:test` via `pnpm test`.

**Design:** `docs/plans/2026-09-23-excluded-highlighting-design.md`

---

### Task 1: `excludedCells` helper

**Files:** Modify `src/lib/candidates.ts`; Test `tests/excluded-highlighting.test.ts` (create).

**Step 1: Failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excludedCells } from '../src/lib/candidates.ts';
import { createGame, enter } from '../src/lib/game.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';

const blank = () => createGame({ ...generatePuzzle('hard', 19), givens: Array(81).fill(0) });

test('excluded legal cells are reported for the active digit only', () => {
  let game = enter(blank(), { index: 0, value: 5, exclude: true });
  assert.deepEqual([...excludedCells({ values: game.values, exclusions: game.exclusions, digit: 5 })], [0]);
  assert.equal(excludedCells({ values: game.values, exclusions: game.exclusions, digit: 4 }).size, 0);
  game = enter(game, { index: 0, value: 5, exclude: true });
  assert.equal(excludedCells({ values: game.values, exclusions: game.exclusions, digit: 5 }).size, 0);
});

test('cells blocked by placed numbers or filled themselves are not reported', () => {
  let game = enter(blank(), { index: 0, value: 5, exclude: true });
  game = enter(game, { index: 8, value: 5 });
  assert.equal(excludedCells({ values: game.values, exclusions: game.exclusions, digit: 5 }).size, 0);
  let filled = enter(blank(), { index: 40, value: 3, exclude: true });
  filled = enter(filled, { index: 40, value: 7 });
  assert.equal(excludedCells({ values: filled.values, exclusions: filled.exclusions, digit: 3 }).size, 0);
});

test('invalid digits return an empty set', () => {
  const game = enter(blank(), { index: 0, value: 5, exclude: true });
  for (const digit of [0, -1, 10, NaN, 1.5]) assert.equal(excludedCells({ values: game.values, exclusions: game.exclusions, digit }).size, 0);
});
```

Check first how `enter()` treats `exclude: true` on a cell (it toggles the exclusion) and whether entering a value clears the cell's exclusions. If entering 7 at 40 clears exclusion 3, the filled-cell assertion still holds, but add an explicit exclusion to the filled cell's array in the test (construct `exclusions` manually) so the test proves the filled check rather than relying on clearing.

**Step 2:** `pnpm test`. Expected: FAIL, `excludedCells` not exported.

**Step 3: Implement** in `src/lib/candidates.ts` (`possibleCells` is already imported from `./sudoku.ts` and validates the digit):

```ts
/** Cells the rules allow for a digit that the player has excluded. */
export function excludedCells({ values, exclusions, digit }: { values: number[]; exclusions: number[][]; digit: number }): Set<number> {
  return new Set([...possibleCells(values, digit)].filter(i => exclusions[i]?.includes(digit)));
}
```

**Step 4:** `pnpm test && pnpm lint && pnpm typecheck` pass (90 tests).

**Step 5:** `git add src/lib/candidates.ts tests/excluded-highlighting.test.ts && git commit -m "feat(notes): derive excluded cells for smart highlighting"`

---

### Task 2: Render the faded red state

**Files:** Modify `src/components/game.tsx`, `src/app/globals.css`.

1. Import `excludedCells` alongside `candidateCells` from `@/lib/candidates`.
2. After the `possible` memo (~line 225) add:

```ts
  const excluded = useMemo(() => values && exclusions && preferences.smartHighlighting && !complete
    ? excludedCells({ values, exclusions, digit: selectedValue }) : new Set<number>(), [values, exclusions, preferences.smartHighlighting, complete, selectedValue]);
```

3. In the cell `classes` array, directly after the `possible.has(i) ? 'possible' : ''` entry, add `excluded.has(i) ? 'excluded-possible' : ''`.
4. In `globals.css` line ~66, directly after `.cell.possible { background: var(--possible); }` and before `.cell.selected`, add `.cell.excluded-possible { background: var(--red-soft); }`. Selection must still win on the selected cell (same specificity, later rule).
5. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
6. `git add src/components/game.tsx src/app/globals.css && git commit -m "feat(notes): show excluded smart-highlighting cells in faded red"`

---

### Task 3: Verify and document

- Browser (Playwright MCP, 390 × 844, per `AGENTS.md`): Smart highlighting on, focus a digit with exclusions in legal cells → those cells are pale red and others green. Toggling an exclusion switches a cell between green and red. Changing digit updates. Smart highlighting off → no red. Dark theme readable. Save `docs/screenshots/excluded-highlighting-light.png` and `-dark.png` (hide the Next.js dev badge: `nextjs-portal { display: none }`).
- `docs/ROADMAP.md`: add a **Status:** line under "Faded red exclusions" linking the PR.
- Full gate, PR pre-push checklist, open PR.
