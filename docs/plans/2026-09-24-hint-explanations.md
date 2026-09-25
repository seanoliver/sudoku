# Hint Explanations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** After a hint names a deduction and shows where to look, a step-by-step walkthrough in the keypad area explains why the move is valid, for every technique the solver knows.

**Architecture:** The step detectors report the evidence each walkthrough needs (fish lines, XY-wing roles, the color-wrap conflict). A pure module, `src/lib/explain.ts`, turns a `Step` plus the current candidates into an ordered list of lines; each line is one sentence and a declarative description of what the board shows (shaded house, ringed cells, gold/blue fills, digit chips, links, strikes, ghost). `game.tsx` renders a panel with ‹ › in place of the keypad, an SVG overlay on the board, and shows Apply in the strip only on the last line.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, plain CSS in `src/app/globals.css`, tests with `node:test` (`pnpm test`).

**Design reference:** `docs/plans/2026-09-24-hint-explanations-design.md`. The prototype in the worktree (`src/lib/explain.ts`, `?why=a` wiring in `game.tsx`, the `/* [proto] hint explanation */` CSS block, `public/proto-*.json`, `devIndicators: false` in `next.config.ts`) is the visual reference. Task 1 removes it; later tasks rebuild it properly.

**Conventions:** Match the surrounding code: dense one-line helpers, few comments (a comment only for a landmine), object parameters for optional flags, `??` over `||`. Run the three checks before every commit: `pnpm lint && pnpm typecheck && pnpm test`.

---

### Task 1: Remove the prototype

**Files:**
- Modify: `src/components/game.tsx`, `src/app/globals.css`, `next.config.ts`
- Delete: `public/proto-coloring.json`, `public/proto-trap.json`, `src/lib/explain.ts`

**Step 1:** Save the prototype for reference, then restore the tracked files.

```bash
mkdir -p /private/tmp/claude-501/-Users-seanoliver-code-learning-sudoku/7c063e5d-6e99-40d1-863b-67c64b1b7cb8/scratchpad/why-proto
cp src/lib/explain.ts public/proto-*.json /private/tmp/claude-501/-Users-seanoliver-code-learning-sudoku/7c063e5d-6e99-40d1-863b-67c64b1b7cb8/scratchpad/why-proto/
git diff src/components/game.tsx src/app/globals.css > /private/tmp/claude-501/-Users-seanoliver-code-learning-sudoku/7c063e5d-6e99-40d1-863b-67c64b1b7cb8/scratchpad/why-proto/ui.diff
git checkout -- src/components/game.tsx src/app/globals.css next.config.ts next-env.d.ts
rm public/proto-coloring.json public/proto-trap.json src/lib/explain.ts
```

**Step 2:** `git status --short` shows a clean tree. `pnpm test` passes (137).

No commit: nothing tracked changed.

---

### Task 2: Detectors report the evidence

**Files:**
- Modify: `src/lib/steps.ts` (Step type; `fish`, `xyWing`, `coloring`)
- Test: `tests/step-evidence.test.ts` (new)

**Step 1: Write the failing test**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyStep, baseCandidates, findStep, sees, type Step } from '../src/lib/steps.ts';
import { EXPERT_BANK } from '../src/lib/expert-bank.ts';
import { COLUMNS, ROWS } from '../src/lib/deductions.ts';

/** Every step the solver takes across the first 120 bank puzzles. */
function bankSteps(): { step: Step; candidates: ReturnType<typeof baseCandidates>; values: number[] }[] {
  const out = [];
  for (const entry of EXPERT_BANK.slice(0, 120)) {
    const values = [...entry].map(Number); const candidates = baseCandidates(values);
    for (let step = findStep(values, candidates); step; step = findStep(values, candidates)) {
      out.push({ step, candidates: candidates.map(set => new Set(set)), values: [...values] });
      applyStep(values, candidates, step);
    }
  }
  return out;
}
const steps = bankSteps();

test('fish report their base and cover lines', () => {
  const fish = steps.filter(({ step }) => step.technique === 'x-wing' || step.technique === 'swordfish');
  assert.ok(fish.length);
  for (const { step, candidates } of fish) {
    const { rows, base, cover } = step.fish!;
    assert.equal(base.length, step.technique === 'x-wing' ? 2 : 3);
    assert.equal(cover.length, base.length);
    const [baseLines, crossLines] = rows ? [ROWS, COLUMNS] : [COLUMNS, ROWS];
    for (const b of base) for (const i of baseLines[b]) if (candidates[i].has(step.digits[0])) assert.ok(cover.some(c => crossLines[c].includes(i)));
    for (const { cell } of step.eliminations) assert.ok(cover.some(c => crossLines[c].includes(cell)) && !base.some(b => baseLines[b].includes(cell)));
  }
});

test('an XY-wing reports its pivot, which wing pairs with which pivot digit, and the shared digit', () => {
  const wings = steps.filter(({ step }) => step.technique === 'xy-wing');
  assert.ok(wings.length);
  for (const { step, candidates } of wings) {
    const { pivot, wings: [x, y], pivotDigits: [p, q], shared } = step.xyWing!;
    assert.deepEqual([...candidates[pivot]].sort(), [p, q].sort());
    assert.deepEqual([...candidates[x]].sort(), [p, shared].sort());
    assert.deepEqual([...candidates[y]].sort(), [q, shared].sort());
    assert.ok(sees(pivot, x) && sees(pivot, y));
    assert.ok(step.eliminations.every(e => e.digit === shared && sees(e.cell, x) && sees(e.cell, y)));
  }
});

test('coloring says whether it is a wrap or a trap, and a wrap names its two clashing cells', () => {
  const coloring = steps.filter(({ step }) => step.technique === 'coloring');
  assert.ok(coloring.some(({ step }) => step.variant === 'wrap') && coloring.some(({ step }) => step.variant === 'trap'));
  for (const { step } of coloring) {
    if (step.variant === 'trap') { assert.equal(step.conflict, undefined); continue; }
    const [x, y] = step.conflict!;
    const shade = step.shades!.find(s => s.includes(x))!;
    assert.ok(shade.includes(y) && sees(x, y));
    assert.deepEqual(step.eliminations.map(e => e.cell).sort(), shade.filter(i => step.eliminations.some(e => e.cell === i)).sort());
  }
});
```

If the first 120 bank puzzles contain no wrap, raise the slice until they do and note the count.

**Step 2:** `node --experimental-strip-types --test tests/step-evidence.test.ts`. Expected: FAIL (`step.fish` is undefined).

**Step 3: Implement.** In `Step` add, below `shades`:

```ts
  /** Fish: whether the base lines are rows, and the base and cover line indices (0–8). */
  fish?: { rows: boolean; base: number[]; cover: number[] };
  /** XY-wing: `wings[k]` holds `pivotDigits[k]` and `shared`. */
  xyWing?: { pivot: number; wings: [number, number]; pivotDigits: [number, number]; shared: number };
  /** Color wrap: two cells of one shade that see each other. */
  conflict?: [number, number];
```

In `fish`, the returned object gains `fish: { rows: base === ROWS, base: lines, cover: crossing.sort((m, n) => m - n) }`.

In `xyWing`, the returned object gains `xyWing: { pivot, wings: [x, y], pivotDigits: [p, q], shared: c }`.

In `coloring`, change the wrap branch to keep the pair it found:

```ts
      for (const shade of [0, 1]) {
        const same = component.filter(i => color.get(i) === shade);
        const x = same.find((i, k) => same.slice(k + 1).some(j => sees(i, j)));
        if (x === undefined) continue;
        const y = same.find(j => j !== x && sees(x, j))!;
        const eliminations = removable(candidates, same, digit);
        if (eliminations.length) return { ...step(eliminations, 'wrap'), conflict: [x, y] };
      }
```

**Step 4:** Run the new test and `pnpm test`. Expected: all pass.

**Step 5: Commit**

```bash
git add src/lib/steps.ts tests/step-evidence.test.ts
git commit -m "feat(hints): steps report fish lines, XY-wing roles and the color-wrap conflict"
```

---

### Task 3: Explanation model and coloring walkthroughs

**Files:**
- Create: `src/lib/explain.ts`
- Test: `tests/explain.test.ts` (new)

**Step 1: Write the failing test**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainStep, EXPLAIN_TEXT_LIMIT } from '../src/lib/explain.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { createGame } from '../src/lib/game.ts';
import { applyHint, nextHint } from '../src/lib/hints.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';
import type { Step } from '../src/lib/steps.ts';

/** The board just before the first step matching `want`, from Expert seeds in order. */
export function firstStep(want: (step: Step) => boolean, seeds = 400) {
  for (let seed = 1; seed <= seeds; seed++) {
    let game = createGame(createPuzzle('expert', seed));
    for (let guard = 0; guard < 120; guard++) {
      const hint = nextHint(game);
      if (hint.kind !== 'step') break;
      if (want(hint.step)) return { step: hint.step, values: game.values, candidates: getPlayableCandidates({ values: game.values, exclusions: game.exclusions }) };
      game = applyHint(game, hint.step);
    }
  }
  throw new Error('no such step');
}

test('a color wrap builds the chain link by link, then shows the clash and the move', () => {
  const { step, values, candidates } = firstStep(s => s.variant === 'wrap');
  const lines = explainStep(step, { values, candidates });
  const d = step.digits[0];
  const linkLines = lines.filter(line => line.links?.newest);
  assert.equal(linkLines.length, step.area.length - 1, 'one line per link in a spanning chain');
  assert.match(lines[0].text, new RegExp(`^Look only at the ${d}s\\. (Row|Column|Box) \\d has just two places for ${d}`));
  linkLines.forEach((line, k) => assert.equal(line.links!.pairs.length, k + 1));
  const clash = lines.at(-2)!;
  assert.deepEqual([...clash.focus!].sort(), [...step.conflict!].sort());
  assert.match(clash.text, /has two (gold|blue) cells, but it can hold only one/);
  const last = lines.at(-1)!;
  assert.deepEqual(last.strike, step.eliminations);
  assert.match(last.text, new RegExp(`^Cross ${d} out of every (gold|blue) cell\\. That makes every (gold|blue) cell a ${d}\\.$`));
});

test('a color trap ends by ringing the trapped cell in red', () => {
  const { step, values, candidates } = firstStep(s => s.variant === 'trap');
  const lines = explainStep(step, { values, candidates });
  const trapped = lines.at(-2)!;
  assert.deepEqual(trapped.target, [step.eliminations[0].cell]);
  assert.equal(trapped.focus!.length, 2);
  assert.deepEqual(lines.at(-1)!.strike, step.eliminations);
});

test('every coloring line keeps the chain colors it has revealed so far', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'coloring');
  const lines = explainStep(step, { values, candidates });
  let seen = 0;
  for (const line of lines) { const size = line.colored?.size ?? 0; assert.ok(size >= seen); seen = size; }
  assert.equal(seen, step.area.length);
  for (const line of lines) assert.ok(line.text.length <= EXPLAIN_TEXT_LIMIT, line.text);
});
```

**Step 2:** Run it. Expected: FAIL (module not found).

**Step 3: Implement `src/lib/explain.ts`.** The model and the coloring explainer; later tasks add the other techniques to the `switch`.

```ts
import { peers } from './sudoku.ts';
import { BOXES, COLUMNS, HOUSES, ROWS, type Candidates } from './deductions.ts';
import { sees, type Step } from './steps.ts';

type Mark = { cell: number; digit: number };
/** One walkthrough line: a sentence and exactly what the board shows with it. */
export type ExplainLine = {
  text: string;
  /** Shaded gray: the row, column, or box the sentence names. */
  house?: readonly number[];
  /** Ringed dark: the cells the sentence is about. */
  focus?: readonly number[];
  /** Ringed red: cells that lose a candidate. */
  target?: readonly number[];
  /** Coloring fills revealed so far: 0 gold, 1 blue. */
  colored?: ReadonlyMap<number, 0 | 1>;
  /** Candidates drawn in front of everything. */
  chips?: readonly Mark[];
  /** Links between `digit` chips; `newest` draws the last pair heavier. */
  links?: { digit: number; pairs: readonly [number, number][]; newest: boolean };
  /** Candidates shown crossed out. */
  strike?: readonly Mark[];
  /** A placement shown as a ghost digit. */
  ghost?: Mark;
};
export type Board = { values: readonly number[]; candidates: Candidates };
/** Longest sentence the panel shows without scrolling at 390px. */
export const EXPLAIN_TEXT_LIMIT = 170;

const SHADE = ['gold', 'blue'] as const;
export const houseName = (house: readonly number[]) => {
  const r = ROWS.indexOf(house as number[]), c = COLUMNS.indexOf(house as number[]);
  return r >= 0 ? `row ${r + 1}` : c >= 0 ? `column ${c + 1}` : `box ${BOXES.indexOf(house as number[]) + 1}`;
};
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
/** "3", "3 and 7", "2, 5, and 8". */
export const list = (items: readonly (number | string)[]) => items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
const chipsFor = (candidates: Candidates, cells: readonly number[], digits: readonly number[]) => cells.flatMap(cell => digits.filter(d => candidates[cell].has(d)).map(digit => ({ cell, digit })));

function coloring(step: Step, { values, candidates }: Board): ExplainLine[] {
  const d = step.digits[0];
  const shade = new Map<number, 0 | 1>([...step.shades![0].map(i => [i, 0] as const), ...step.shades![1].map(i => [i, 1] as const)]);
  const every = chipsFor(candidates, [...Array(81).keys()].filter(i => !values[i]), [d]);
  const linkHouse = new Map<string, readonly number[]>();
  for (const house of HOUSES) {
    const cells = house.filter(i => candidates[i].has(d));
    if (cells.length === 2 && cells.every(i => shade.has(i)) && !linkHouse.has(cells.join())) linkHouse.set(cells.join(), house);
  }
  const start = step.conflict?.[0] ?? step.area[0];
  const colored = new Map<number, 0 | 1>([[start, shade.get(start)!]]);
  const pairs: [number, number][] = [];
  const lines: ExplainLine[] = [];
  for (const queue = [start]; queue.length;) {
    const cell = queue.shift()!;
    for (const [key, house] of linkHouse) {
      const [p, q] = key.split(',').map(Number);
      const next = p === cell ? q : q === cell ? p : -1;
      if (next < 0 || colored.has(next)) continue;
      colored.set(next, shade.get(next)!); pairs.push([cell, next]); queue.push(next);
      const text = pairs.length === 1
        ? `Look only at the ${d}s. ${capital(houseName(house))} has just two places for ${d}, so one is a ${d} and the other isn't. Color them gold and blue.`
        : `${capital(houseName(house))} also has just two places for ${d}. One is ${SHADE[shade.get(cell)!]}, so the other is ${SHADE[shade.get(next)!]}.`;
      lines.push({ text, house, focus: [cell, next], colored: new Map(colored), chips: every, links: { digit: d, pairs: [...pairs], newest: true } });
    }
  }
  const whole = { colored: new Map(colored), chips: every, links: { digit: d, pairs, newest: false } };
  if (step.variant === 'wrap') {
    const [x, y] = step.conflict!;
    const bad = shade.get(x)!, house = HOUSES.find(h => h.includes(x) && h.includes(y))!;
    const places = house.filter(i => candidates[i].has(d)).length;
    return [...lines,
      { ...whole, text: `Every link flips the color, so either all the gold cells are ${d}s or none of them are. The same goes for blue.` },
      { ...whole, house, focus: [x, y], text: `${capital(houseName(house))} has two ${SHADE[bad]} cells, but it can hold only one ${d}. So none of the ${SHADE[bad]} cells are ${d}s.${places > 2 ? ` (With ${places} places for ${d}, it was never a link.)` : ''}` },
      { ...whole, focus: step.shades![bad], strike: step.eliminations, text: `Cross ${d} out of every ${SHADE[bad]} cell. That makes every ${SHADE[1 - bad]} cell a ${d}.` },
    ];
  }
  const trapped = step.eliminations[0].cell;
  return [...lines,
    { ...whole, text: `Every link flips the color, so either all the gold cells are ${d}s or all the blue ones are.` },
    { ...whole, target: [trapped], focus: [step.shades![0].find(i => sees(i, trapped))!, step.shades![1].find(i => sees(i, trapped))!], text: `This cell sees a gold cell and a blue cell. One of them is a ${d} either way, so this cell can't be.` },
    { ...whole, target: step.eliminations.map(e => e.cell), strike: step.eliminations, text: `Cross ${d} out of ${step.eliminations.length > 1 ? 'every cell that sees both colors' : 'this cell'}.` },
  ];
}

/** The walkthrough for a step on this board, easiest reasoning first; the last line shows the move. */
export function explainStep(step: Step, board: Board): ExplainLine[] {
  switch (step.technique) {
    case 'coloring': return coloring(step, board);
    default: return [];
  }
}
```

`peers` is imported for Task 4. Delete it if lint flags it now and re-add it there.

**Step 4:** Run the test, then `pnpm lint && pnpm typecheck && pnpm test`. Expected: all pass.

**Step 5: Commit**

```bash
git add src/lib/explain.ts tests/explain.test.ts
git commit -m "feat(hints): coloring walkthroughs build the chain link by link"
```

---

### Task 4: Singles, locked candidates and sets

**Files:**
- Modify: `src/lib/explain.ts`
- Test: `tests/explain.test.ts`

**Step 1: Write the failing tests** (append):

```ts
test('a naked single rings one placed copy of each other digit, then places the digit', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'naked-single');
  const lines = explainStep(step, { values, candidates });
  assert.equal(lines.length, 2);
  assert.deepEqual([...lines[0].focus!].sort((a, b) => a - b), [step.placement!.cell, ...step.pattern].sort((a, b) => a - b));
  assert.match(lines[0].text, new RegExp(`^Every number but ${step.placement!.digit} is already in its row, column, or box`));
  assert.deepEqual(lines[1].ghost, step.placement);
});

test('a hidden single crosses the digit out of every other cell in the house, then places it', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'hidden-single');
  const [first, last] = explainStep(step, { values, candidates });
  const others = step.area.filter(i => !values[i] && i !== step.placement!.cell);
  assert.deepEqual(first.house, step.area);
  assert.deepEqual(first.strike!.map(m => m.cell).sort((a, b) => a - b), others.sort((a, b) => a - b));
  assert.deepEqual(last.ghost, step.placement);
});

test('pointing names the box then the line; claiming names the line then the box', () => {
  for (const variant of ['pointing', 'claiming'] as const) {
    const { step, values, candidates } = firstStep(s => s.variant === variant);
    const [first, last] = explainStep(step, { values, candidates });
    assert.match(first.text, variant === 'pointing' ? /^In box \d, \d fits only in these cells\. They're all in (row|column) \d\.$/ : /^In (row|column) \d, \d fits only in these cells\. They're all in box \d\.$/);
    assert.deepEqual(first.house, step.area);
    assert.deepEqual(last.strike, step.eliminations);
  }
});

test('naked and hidden sets say which numbers are locked into which cells', () => {
  for (const variant of ['naked', 'hidden'] as const) {
    const { step, values, candidates } = firstStep(s => s.technique === 'pair' && s.variant === variant);
    const [first, last] = explainStep(step, { values, candidates });
    assert.deepEqual(first.focus, step.pattern);
    assert.ok(first.chips!.every(m => step.pattern.includes(m.cell) && step.digits.includes(m.digit)));
    assert.deepEqual(last.strike, step.eliminations);
  }
});
```

**Step 2:** Run. Expected: FAIL (`explainStep` returns `[]`).

**Step 3: Implement** (add above `explainStep`, add the cases):

```ts
const boxOf = (i: number) => BOXES.find(box => box.includes(i))!;
const lineOf = (cells: readonly number[]) => [...ROWS, ...COLUMNS].find(line => cells.every(i => line.includes(i)))!;

function nakedSingle(step: Step, { values }: Board): ExplainLine[] {
  const { cell, digit } = step.placement!;
  const ruled = step.relies.map(m => m.digit);
  return [
    { focus: [cell, ...step.pattern], strike: step.relies, text: `Every number but ${digit} is already in its row, column, or box${ruled.length ? `, or ruled out here (${list(ruled)})` : ''}.` },
    { focus: [cell], ghost: step.placement, text: `So this cell has to be ${digit}.` },
  ];
}

function hiddenSingle(step: Step, { values }: Board): ExplainLine[] {
  const { cell, digit } = step.placement!;
  const others = step.area.filter(i => !values[i] && i !== cell);
  return [
    { house: step.area, focus: step.pattern, strike: others.map(i => ({ cell: i, digit })), text: `${capital(houseName(step.area))} needs a ${digit}. The ${digit}s already placed nearby rule out every other open cell in it.` },
    { house: step.area, focus: [cell], ghost: step.placement, text: `Only this cell is left, so it's the ${digit}.` },
  ];
}

function locked(step: Step, { candidates }: Board): ExplainLine[] {
  const d = step.digits[0];
  const chips = chipsFor(candidates, step.pattern, [d]);
  const [from, to] = step.variant === 'pointing' ? [step.area, lineOf(step.pattern)] : [step.area, boxOf(step.pattern[0])];
  return [
    { house: from, focus: step.pattern, chips, text: `In ${houseName(from)}, ${d} fits only in these cells. They're all in ${houseName(to)}.` },
    { house: to, focus: step.pattern, chips, strike: step.eliminations, target: step.eliminations.map(e => e.cell), text: `So ${houseName(from)}'s ${d} is in ${houseName(to)}, and the rest of ${houseName(to)} can't hold ${d}.` },
  ];
}

function set(step: Step, { candidates }: Board): ExplainLine[] {
  const n = step.pattern.length, where = houseName(step.area), digits = list(step.digits);
  const chips = chipsFor(candidates, step.pattern, step.digits);
  const target = [...new Set(step.eliminations.map(e => e.cell))];
  return step.variant === 'naked' ? [
    { house: step.area, focus: step.pattern, chips, text: `These ${n} cells in ${where} can only hold ${digits}.` },
    { house: step.area, focus: step.pattern, chips, target, strike: step.eliminations, text: `Those ${n} numbers must fill these ${n} cells, so no other cell in ${where} can hold them.` },
  ] : [
    { house: step.area, focus: step.pattern, chips, text: `In ${where}, ${digits} fit only in these ${n} cells.` },
    { house: step.area, focus: step.pattern, chips, strike: step.eliminations, text: `So these cells hold ${digits}, and nothing else.` },
  ];
}
```

Cases: `'naked-single' → nakedSingle`, `'hidden-single' → hiddenSingle`, `'locked-candidates' → locked`, `'pair' | 'triple' | 'quad' → set`. Delete the unused `peers` import and the unused `values` destructure in `nakedSingle`.

**Step 4:** Run the test, then all three checks. Expected: pass.

**Step 5: Commit**

```bash
git add src/lib/explain.ts tests/explain.test.ts
git commit -m "feat(hints): walkthroughs for singles, locked candidates and sets"
```

---

### Task 5: Fish and XY-wing

**Files:**
- Modify: `src/lib/explain.ts`
- Test: `tests/explain.test.ts`

**Step 1: Write the failing tests** (append):

```ts
test('a fish shows one base line at a time, then the covered lines, then the move', () => {
  for (const technique of ['x-wing', 'swordfish'] as const) {
    const { step, values, candidates } = firstStep(s => s.technique === technique, 2000);
    const lines = explainStep(step, { values, candidates });
    const size = step.fish!.base.length;
    assert.equal(lines.length, size + 2);
    for (let k = 0; k < size; k++) assert.match(lines[k].text, new RegExp(`^(Row|Column) \\d has ${step.digits[0]} only in (rows|columns) `));
    assert.deepEqual(lines.at(-1)!.strike, step.eliminations);
  }
});

test('an XY-wing walks the pivot, each case, then the shared digit', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'xy-wing');
  const lines = explainStep(step, { values, candidates });
  const { pivot, wings, pivotDigits: [p, q], shared } = step.xyWing!;
  assert.equal(lines.length, 4);
  assert.equal(lines[0].text, `This cell can only be ${Math.min(p, q)} or ${Math.max(p, q)}.`);
  assert.equal(lines[1].text, `If it's ${p}, this cell can't be ${p}, so it's ${shared}.`);
  assert.deepEqual(lines[1].focus, [pivot, wings[0]]);
  assert.equal(lines[2].text, `If it's ${q}, this cell can't be ${q}, so it's ${shared}.`);
  assert.deepEqual(lines[3].strike, step.eliminations);
});
```

If `firstStep` finds no swordfish within 2000 seeds, raise the limit. The Expert bank has 300 puzzles and `createPuzzle` cycles through them.

**Step 2:** Run. Expected: FAIL.

**Step 3: Implement:**

```ts
function fish(step: Step, { candidates }: Board): ExplainLine[] {
  const d = step.digits[0], { rows, base, cover } = step.fish!;
  const [baseLines, crossLines] = rows ? [ROWS, COLUMNS] : [COLUMNS, ROWS];
  const [baseWord, crossWord] = rows ? ['row', 'column'] : ['column', 'row'];
  const crossNames = `${crossWord}s ${list(cover.map(c => c + 1))}`;
  const chipsIn = (lines: readonly number[]) => chipsFor(candidates, lines.flatMap(b => baseLines[b]), [d]);
  return [
    ...base.map((b, k) => {
      const at = baseLines[b].filter(i => candidates[i].has(d)).map(i => (rows ? i % 9 : Math.floor(i / 9)) + 1);
      return { house: baseLines[b], chips: chipsIn(base.slice(0, k + 1)), focus: baseLines[b].filter(i => candidates[i].has(d)), text: `${capital(baseWord)} ${b + 1} has ${d} only in ${crossWord}s ${list(at)}.` };
    }),
    { house: cover.flatMap(c => crossLines[c]), chips: chipsIn(base), focus: step.pattern, text: `Each of these ${base.length} ${baseWord}s needs a ${d}, and together they use only ${crossNames}. So their ${d}s fill ${crossNames}, one each.` },
    { house: cover.flatMap(c => crossLines[c]), chips: chipsIn(base), focus: step.pattern, target: step.eliminations.map(e => e.cell), strike: step.eliminations, text: `No other cell in ${crossNames} can hold ${d}.` },
  ];
}

function xyWing(step: Step, { candidates }: Board): ExplainLine[] {
  const { pivot, wings: [x, y], pivotDigits: [p, q], shared } = step.xyWing!;
  const chips = chipsFor(candidates, [pivot, x, y], [p, q, shared]);
  return [
    { focus: [pivot], chips, text: `This cell can only be ${Math.min(p, q)} or ${Math.max(p, q)}.` },
    { focus: [pivot, x], chips, text: `If it's ${p}, this cell can't be ${p}, so it's ${shared}.` },
    { focus: [pivot, y], chips, text: `If it's ${q}, this cell can't be ${q}, so it's ${shared}.` },
    { focus: [x, y], chips, target: step.eliminations.map(e => e.cell), strike: step.eliminations, text: `Either way one of these two is ${shared}. A cell that sees both can't be ${shared}.` },
  ];
}
```

Cases: `'x-wing' | 'swordfish' → fish`, `'xy-wing' → xyWing`. Remove the `default` branch so TypeScript checks the switch covers every technique.

**Step 4:** Run, then all three checks. Expected: pass.

**Step 5: Commit**

```bash
git add src/lib/explain.ts tests/explain.test.ts
git commit -m "feat(hints): walkthroughs for fish and XY-wing"
```

---

### Task 6: Every step in the bank explains itself

**Files:**
- Test: `tests/explain.test.ts`

**Step 1: Write the test** (append). It should pass without new code. If it fails, fix `explain.ts`.

```ts
import { applyStep, baseCandidates, findStep } from '../src/lib/steps.ts';
import { EXPERT_BANK } from '../src/lib/expert-bank.ts';

test('every step across 150 bank puzzles has a walkthrough that ends on its move and fits the panel', () => {
  for (const entry of EXPERT_BANK.slice(0, 150)) {
    const values = [...entry].map(Number); const candidates = baseCandidates(values);
    for (let step = findStep(values, candidates); step; step = findStep(values, candidates)) {
      const lines = explainStep(step, { values, candidates });
      assert.ok(lines.length >= 2, step.technique);
      for (const line of lines) {
        assert.ok(line.text.length && line.text.length <= EXPLAIN_TEXT_LIMIT, `${step.technique}: ${line.text}`);
        for (const cell of [...(line.focus ?? []), ...(line.target ?? []), ...(line.house ?? [])]) assert.ok(cell >= 0 && cell < 81);
      }
      const last = lines.at(-1)!;
      if (step.placement) assert.deepEqual(last.ghost, step.placement);
      else assert.deepEqual(last.strike, step.eliminations);
      applyStep(values, candidates, step);
    }
  }
});
```

Move the new imports to the top of the file.

**Step 2:** Run. Expected: PASS. Any line over the limit: shorten its template.

**Step 3: Commit**

```bash
git add tests/explain.test.ts
git commit -m "test(hints): every bank step has a walkthrough that ends on its move"
```

---

### Task 7: The strip shows the name at the move level; no dots

**Files:**
- Modify: `src/lib/hint-view.ts:61-83`, `src/components/game.tsx` (dots markup), `src/app/globals.css` (`.hint-dots` rules)
- Test: `tests/hint-view.test.ts`

**Step 1: Update the tests.** In `each level reveals more…`, replace the level-3 block with:

```ts
  const three = hintView({ kind: 'step', step: hidden }, 3);
  assert.equal(three.text, 'Hidden single');
  assert.equal(three.action, 'apply');
  assert.equal(three.cells.size, 0, 'the walkthrough draws the board at level 3');
```

Delete `eliminations are shown as struck candidates at level 3` and any other level-3 assertions about `ghost`, `struck` or roles for steps. Mistake assertions stay.

**Step 2:** Run. Expected: FAIL (text is "The 6 goes here").

**Step 3: Implement.** In `hintView`, after the level-2 block, replace everything from `for (const cell of step.pattern)` to the end with:

```ts
  return view(name, name, 'apply');
```

Remove the now-unused `'pattern' | 'target' | 'relies' | 'struck' | 'shade-a' | 'shade-b'` roles from `HintRole` along with their CSS rules (`.cell.hint-pattern`, `.cell.hint-target`, `.cell.hint-relies`, `.cell.hint-shade-a`, `.cell.hint-shade-b`, `.hint-ghost`, `.hint-struck-grid`, `.hint-struck-digit`) and the matching JSX in `game.tsx` (the ghost span and struck grid). Keep `area` and `mistake`.

Delete the `.hint-dots` span in `game.tsx` and its CSS.

**Step 4:** All three checks. Expected: pass.

**Step 5: Commit**

```bash
git add -A src tests
git commit -m "feat(hints): the move level names the deduction; the walkthrough draws the board"
```

---

### Task 8: Walkthrough panel and board overlay

**Files:**
- Create: `src/components/hint-walkthrough.tsx`
- Modify: `src/components/game.tsx`, `src/app/globals.css`

**Step 1: Component.** `hint-walkthrough.tsx` exports two components.

- `WalkthroughOverlay({ line, values }: { line: ExplainLine; values: readonly number[] })`: an absolutely positioned `<svg className="walk-overlay" viewBox="0 0 9 9" preserveAspectRatio="none" aria-hidden="true">` inside `.board-wrap`. It draws, in this order:
  1. Link lines between the chip positions of `line.links.digit`, with the last pair getting class `current` when `newest`.
  2. A chip (`<g class="walk-chip">` with a `rect` and a `text`) for every mark in `line.chips`, plus every mark in `line.strike` that isn't already in `chips`. Chips in `strike` get class `struck` and a diagonal `line.walk-strike`.
  3. The ghost digit, if any, as large text at the cell center.

  Chip center for digit `d` in cell `i`: `x = i % 9 + .08 + .84 * ((d - 1) % 3 + .5) / 3`, `y = ⌊i / 9⌋ + .08 + .84 * (⌊(d - 1) / 3⌋ + .5) / 3` (the notes grid is 84% of the cell, inset 8%). Chip: 0.3 × 0.3, `rx .08`, text `font-size: .21px`.
- `WalkthroughPanel({ index, count, text, onStep }: { index: number; count: number; text: string; onStep: (index: number) => void })`: the "Why this works" header, ‹ and › buttons (`aria-label` "Previous step" / "Next step", disabled at the ends), `{index + 1} of {count}`, and the sentence.

**Step 2: Wire into `game.tsx`.**

- `hintState` gains `line: number` (0 when a hint opens or its level changes).
- Compute `walkthrough = activeHint?.level === 3 && activeHint.hint.kind === 'step' ? explainStep(activeHint.hint.step, { values: game.values, candidates: getPlayableCandidates({ values: game.values, exclusions: game.exclusions }) }) : null` with `useMemo` keyed on `activeHint` and `game`, and `walkLine = walkthrough?.[Math.min(activeHint.line, walkthrough.length - 1)]`.
- `.board-wrap` gets class `walkthrough` when `walkLine` is set.
- Cell classes while `walkLine` is set: `walk-house`, `walk-focus`, `walk-target`, and `walk-gold` or `walk-blue` from `colored`. They replace the `hint-*` role classes.
- `CellNotes` gets `focusedDigit={null}` during the walkthrough. The overlay's chips replace note focus.
- Render `<WalkthroughOverlay>` after `.board` inside `.board-wrap`.
- Wrap the keypad's `<div>` in `<div className="controls-area">` and render `<WalkthroughPanel>` inside it, absolutely filling it, when `walkLine` is set.
- Show the strip's action button only when `hintDisplay.action !== 'apply' || !walkthrough || activeHint.line >= walkthrough.length - 1`.
- `H` at level 3 advances `line` until the last one. Escape still closes.
- The status region reads `${techniqueName(step)}. Step ${n} of ${count}. ${walkLine.text}` during the walkthrough.

**Step 3: CSS** (after the existing hint rules). Port the prototype's rules with `walk-` names:

```css
.board-wrap.walkthrough .cell:is(.selected, .related, .matching, .possible, .excluded-possible) { background: var(--surface); box-shadow: none; }
.board-wrap.walkthrough .cell:focus-visible { box-shadow: none; }
.board-wrap.walkthrough .notes .note-digit { opacity: .18; }
.cell.walk-house { background: color-mix(in srgb, var(--ink) 11%, var(--surface)); }
.cell.walk-gold.walk-gold { background: color-mix(in srgb, var(--hint) 42%, var(--surface)); }
.cell.walk-blue.walk-blue { background: color-mix(in srgb, var(--blue) 30%, var(--surface)); }
.cell.walk-focus.walk-focus.walk-focus { box-shadow: inset 0 0 0 3px var(--ink); z-index: 2; }
.cell.walk-target.walk-target.walk-target { box-shadow: inset 0 0 0 3px var(--red); z-index: 2; }
.walk-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3; }
.walk-overlay > line { stroke: var(--ink); stroke-width: 1.5px; vector-effect: non-scaling-stroke; stroke-linecap: round; opacity: .45; }
.walk-overlay > line.current { stroke-width: 3px; opacity: .9; }
.walk-chip rect { fill: var(--surface); stroke: var(--ink); stroke-width: 1px; vector-effect: non-scaling-stroke; }
.walk-chip text { font-size: .21px; font-weight: 800; fill: var(--ink); text-anchor: middle; dominant-baseline: central; }
.walk-chip.struck rect { fill: var(--red-soft); stroke: var(--red); }
.walk-chip.struck text { fill: var(--red); }
.walk-strike { stroke: var(--red); stroke-width: 2px; vector-effect: non-scaling-stroke; stroke-linecap: round; }
.walk-ghost { font-size: .62px; fill: var(--hint-strong); text-anchor: middle; dominant-baseline: central; }
.controls-area { position: relative; }
.walk-panel { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; overflow: auto; border-radius: 16px; background: var(--hint-soft); border: 1px solid color-mix(in srgb, var(--hint) 35%, transparent); }
.walk-panel-head { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--hint-strong); text-transform: uppercase; letter-spacing: .04em; }
.walk-panel p { margin: 0; font-size: 16px; line-height: 1.4; color: var(--ink); }
.walk-stepper { display: flex; align-items: center; gap: 6px; font-weight: 600; font-variant-numeric: tabular-nums; }
.walk-stepper button { width: 32px; height: 32px; border-radius: 16px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 20px; display: grid; place-items: center; }
.walk-stepper button:disabled { opacity: .35; }
@media (max-width: 360px) { .walk-panel p { font-size: 15px; } }
```

**Step 4:** `pnpm lint && pnpm typecheck && pnpm test`.

**Step 5: Commit**

```bash
git add src/components/hint-walkthrough.tsx src/components/game.tsx src/app/globals.css
git commit -m "feat(hints): step-by-step walkthrough panel and board overlay"
```

---

### Task 9: Verify in the browser

Run `pnpm dev --port 3341`. To reach each technique, inject a saved game with `localStorage.setItem('sudoku.game.v1', …)`. Build the game with the `firstStep` search from `tests/explain.test.ts`, and use `fillNotes` so notes show.

Check at 390×844, light and dark, for a hidden single, a pointing pair, a naked pair, an X-wing, an XY-wing, a color wrap, and a color trap:

1. The board and number row don't move when the walkthrough opens. `.board-wrap` and `.controls-area` keep the same `getBoundingClientRect()`.
2. Every chip is readable where a line crosses it. No selection, peer, or matching highlight shows.
3. The strip shows only the name until the last line, then Apply. Apply makes the move as one undo step.
4. ‹ › step both ways, and H advances. Escape closes and focus returns to the selected cell.
5. At 320px wide, the longest line either fits the panel or scrolls within it.
6. Undo while a walkthrough is open closes it.

Fix anything that fails, rerun the three checks, and commit the fixes.

Save one light and one dark capture of the color-wrap clash step to `docs/screenshots/hint-walkthrough-wrap.png` and `docs/screenshots/hint-walkthrough-wrap-dark.png`. Save a light capture of an XY-wing case line to `docs/screenshots/hint-walkthrough-xy-wing.png`.

---

### Task 10: Docs and PR

- `docs/ROADMAP.md`: add a status line under milestone 6 linking the design doc. Note that color wrap and color trap are separate Learn skills in milestone 8.
- Run `pnpm lint && pnpm typecheck && pnpm test` and the pre-push checklist in `~/.claude/CLAUDE.md`.
- Push `feat/hint-why` and open a PR with the screenshots, then run `finalize-pr-solo`. Merge only on Sean's "merge".
