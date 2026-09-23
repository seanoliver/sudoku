# Rejected-entry feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Replace the hint-text-only feedback for rejected entries with a red struck-through ghost digit that shakes and fades in the cell, plus a red outline pulse on the peer cells that caused a Filter number keys rejection.

**Architecture:** A pure `rejectEntry` helper in `src/lib/game.ts` decides whether an entry is rejected and why. `enter()` and the component's `input()` both use it, so the rules live in one place. The component stores the rejection with an incrementing id. Keyed, animated spans render the effect, and a timer clears it after 800ms. A visually hidden live region replaces the visible hint text.

**Tech Stack:** Next.js 16 (App Router, client component), React 19, TypeScript, plain CSS in `src/app/globals.css`, `node:test` unit tests run with `node --experimental-strip-types`.

**Design:** `docs/plans/2026-09-23-rejected-entry-feedback-design.md`

**Commands:** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`. CI runs all four.

---

### Task 1: `rejectEntry` helper

**Files:**
- Modify: `src/lib/game.ts` (import line 1; `enter()` near line 61)
- Test: `tests/rejected-entry.test.ts` (create)

**Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, enter, rejectEntry } from '../src/lib/game.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';

const blank = () => createGame({ ...generatePuzzle('hard', 19), givens: Array(81).fill(0) });
const wrong = (game: ReturnType<typeof blank>, index: number) => game.solution[index] % 9 + 1;

test('answer rejection only applies to wrong value entry with blocking on', () => {
  const game = blank();
  const value = wrong(game, 0);
  assert.deepEqual(rejectEntry(game, { index: 0, value, blockIncorrectAnswers: true }), { kind: 'answer', sources: [], unit: null });
  assert.equal(rejectEntry(game, { index: 0, value, blockIncorrectAnswers: false }), null);
  assert.equal(rejectEntry(game, { index: 0, value: game.solution[0], blockIncorrectAnswers: true }), null);
  assert.equal(rejectEntry(game, { index: 0, value: 0, blockIncorrectAnswers: true }), null);
  assert.equal(rejectEntry(game, { index: 0, value, pencil: true, blockIncorrectAnswers: true }), null);
  assert.equal(rejectEntry(game, { index: 0, value, exclude: true, blockIncorrectAnswers: true }), null);
});

test('constraint rejection reports every peer holding the digit and the first unit', () => {
  let game = blank();
  game = enter(game, { index: 4, value: 7 });   // same row as 0
  game = enter(game, { index: 36, value: 7 });  // same column as 0
  assert.deepEqual(rejectEntry(game, { index: 0, value: 7, filterNumberKeys: true }), { kind: 'constraint', sources: [4, 36], unit: 'row' });
  assert.equal(rejectEntry(game, { index: 0, value: 7, filterNumberKeys: false }), null);
  const columnOnly = enter(blank(), { index: 36, value: 7 });
  assert.equal(rejectEntry(columnOnly, { index: 0, value: 7, filterNumberKeys: true })?.unit, 'column');
  const boxOnly = enter(blank(), { index: 10, value: 7 });
  assert.equal(rejectEntry(boxOnly, { index: 0, value: 7, filterNumberKeys: true })?.unit, 'box');
});

test('constraint takes precedence over answer, and givens are never rejected', () => {
  const game = enter(blank(), { index: 4, value: 7 });
  const both = rejectEntry(game, { index: 0, value: 7, filterNumberKeys: true, blockIncorrectAnswers: true });
  assert.equal(both?.kind, 'constraint');
  const puzzle = generatePuzzle('hard', 19);
  const given = puzzle.givens.findIndex(Boolean);
  assert.equal(rejectEntry(createGame(puzzle), { index: given, value: puzzle.givens[given] % 9 + 1, blockIncorrectAnswers: true }), null);
});

test('enter still refuses rejected entries without touching history', () => {
  const game = blank();
  assert.equal(enter(game, { index: 0, value: wrong(game, 0), blockIncorrectAnswers: true }), game);
});
```

Note: seed 19 is used by existing tests. If `game.solution[0]` happens to be 7 the precedence test still holds, since the constraint check runs first.

**Step 2: Run to verify failure**

Run: `pnpm test`
Expected: FAIL, `rejectEntry` is not exported.

**Step 3: Implement**

In `src/lib/game.ts`, add below `createGame`:

```ts
export type Rejection = { kind: 'constraint' | 'answer'; sources: number[]; unit: 'row' | 'column' | 'box' | null };
const unitOf = (a: number, b: number): Rejection['unit'] => Math.floor(a / 9) === Math.floor(b / 9) ? 'row' : a % 9 === b % 9 ? 'column' : 'box';
/** Why a value entry would be refused, or null. Notes, exclusions, erasing and givens are never rejected. */
export function rejectEntry(game: GameState, { index, value, pencil = false, exclude = false, blockIncorrectAnswers = false, filterNumberKeys = false }: { index: number; value: number; pencil?: boolean; exclude?: boolean; blockIncorrectAnswers?: boolean; filterNumberKeys?: boolean }): Rejection | null {
  if (!Number.isInteger(index) || index < 0 || index >= 81 || game.givens[index] || pencil || exclude || !value) return null;
  if (filterNumberKeys) {
    const sources = peers(index).filter(peer => game.values[peer] === value);
    if (sources.length) return { kind: 'constraint', sources, unit: unitOf(index, sources[0]) };
  }
  if (blockIncorrectAnswers && value !== game.solution[index]) return { kind: 'answer', sources: [], unit: null };
  return null;
}
```

In `enter()`, replace the two lines starting `if (filterNumberKeys && ...` and `if (blockIncorrectAnswers && ...` with:

```ts
  if (rejectEntry(game, { index, value, pencil, exclude, blockIncorrectAnswers, filterNumberKeys })) return game;
```

If `getEntryDigits` is no longer used in `game.ts`, remove it from the line 1 import (lint fails on unused imports).

**Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass (80 existing tests plus the 4 new ones).

**Step 5: Commit**

```bash
git add src/lib/game.ts tests/rejected-entry.test.ts
git commit -m "feat(game): add rejectEntry helper for refused value entries"
```

---

### Task 2: Wire rejection state into the game component

**Files:**
- Modify: `src/components/game.tsx`

**Step 1: State and import**

- Import `rejectEntry` and `type Rejection` from `@/lib/game`.
- Replace the `blockedEntry` state type (line ~31) with:

```ts
const [blockedEntry, setBlockedEntry] = useState<(Rejection & { index: number; value: number; id: number }) | null>(null);
const rejectionId = useRef(0);
```

- Add `const REJECTION_MS = 800;` at module level next to the other constants.

**Step 2: `input()`**

Replace the two inline checks (the `filtering && ... 'constraint'` and `blockIncorrectAnswers && ... 'answer'` blocks) with:

```ts
    const refused = rejectEntry(game, { index: selected, value, pencil, exclude: excluding, blockIncorrectAnswers: preferences.blockIncorrectAnswers, filterNumberKeys: filtering });
    if (refused) { setBlockedEntry({ ...refused, index: selected, value, id: ++rejectionId.current }); return; }
```

These are the same conditions as before. `filtering` already includes `!pencil && !excluding && !numberFocus`. Batch behavior does not change.

**Step 3: Auto-clear and visibility**

```ts
  useEffect(() => {
    if (!blockedEntry) return;
    const timer = window.setTimeout(() => setBlockedEntry(null), REJECTION_MS);
    return () => window.clearTimeout(timer);
  }, [blockedEntry]);
  const rejection = blockedEntry && !paused && !sheet && !complete ? blockedEntry : null;
```

Existing `setBlockedEntry(null)` calls already cover selection change, undo, redo, restart, new puzzle and mode toggles. `rejection` hides the effect while paused or while a sheet is open.

**Step 4: Render**

In the cell `classes` array, add `rejection?.index === i ? 'rejecting' : ''`.

Inside the cell button, after `<CellNotes …/>`:

```tsx
{rejection?.index === i && <span key={rejection.id} className="rejected-digit" aria-hidden="true">{rejection.value}</span>}
{rejection?.sources.includes(i) && <span key={rejection.id} className="rejection-source" aria-hidden="true"/>}
```

Keying by `id` remounts the spans, so a repeated rejection restarts the animations.

**Step 5: Replace visible text with an announcement**

- In the `input-hint` ternary, delete the `blockedEntry && blockedEntry.index === selected … ? … : ` branch. The hint falls through to its normal text.
- Directly after the `input-hint` paragraph, add:

```tsx
<p className="sr-only" role="status">{rejection ? `${rejection.value} rejected, ${rejection.kind === 'constraint' ? `already in this ${rejection.unit}` : 'incorrect for this cell'}` : ''}</p>
```

**Step 6: Verify and commit**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: pass.

```bash
git add src/components/game.tsx
git commit -m "feat(game): show rejected entries on the board instead of hint text"
```

---

### Task 3: Styles

**Files:**
- Modify: `src/app/globals.css`

Add after the `.conflict-dot` rule (line ~69):

```css
.cell.rejecting { background: var(--red-soft); }.cell.rejecting.selected { box-shadow: inset 0 0 0 2px var(--red); }.cell.rejecting .notes { visibility: hidden; }
.rejected-digit { position: absolute; inset: 0; display: grid; place-items: center; font-size: clamp(23px, 6.4vw, 29px); line-height: 1; font-weight: 430; color: var(--red); text-decoration: line-through; text-decoration-thickness: 2px; pointer-events: none; animation: reject-shake 250ms ease-in-out, reject-fade 800ms ease-in forwards; }
.rejection-source { position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 2px var(--red); pointer-events: none; animation: reject-pulse 800ms ease-out forwards; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@keyframes reject-shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-4px); } 40%,80% { transform: translateX(4px); } }
@keyframes reject-fade { 0%,55% { opacity: 1; } 100% { opacity: 0; } }
@keyframes reject-pulse { 0% { opacity: 0; } 20%,60% { opacity: 1; } 100% { opacity: 0; } }
```

Add **after** the existing global `@media (prefers-reduced-motion: reduce)` rule (line ~111). That rule shortens every animation to 0.01ms, which would make the fade finish instantly and hide the digit:

```css
@media (prefers-reduced-motion: reduce) { .rejected-digit,.rejection-source { animation: none !important; } }
```

Check that `.sr-only` does not already exist under another name (`grep -n 'clip' src/app/globals.css`).

Run: `pnpm lint && pnpm build`
Expected: pass.

```bash
git add src/app/globals.css
git commit -m "style(game): animate rejected digits and their source cells"
```

---

### Task 4: Browser verification

Use the Playwright MCP browser against `pnpm dev`. Follow the screenshot rules in `AGENTS.md` (390 × 844, `fullPage: false`, `scale: 'css'`, equal 17px board margins).

To get a wrong digit, read the solution from `localStorage['sudoku.game.v1']` with `browser_evaluate`, select an empty cell, and tap any other digit.

Check:
1. Block incorrect answers ON: tapping a wrong digit shows the red struck digit and a shake, then clears within 1s. Values, notes and Undo availability are unchanged. The hint line shows its normal text.
2. Tapping the same wrong digit quickly twice restarts the effect.
3. Selecting another cell during the effect clears it immediately.
4. Filter number keys ON, keyboard: pressing a digit already in the row shows the ghost digit plus a red outline pulse on the source cell.
5. Notes in the rejected cell are hidden during the effect and return afterwards.
6. The live region text is `N rejected, incorrect for this cell` or `N rejected, already in this row|column|box` (read via `browser_evaluate` on `.sr-only[role=status]`).
7. Dark theme is readable.
8. `browser_emulate_media` with `reducedMotion: 'reduce'`: no shake or fade, the static digit shows, then clears after 800ms.
9. Block incorrect answers OFF: a wrong digit is accepted with no marking (unchanged behavior).

Save `docs/screenshots/rejected-entry-light.png`, `rejected-entry-dark.png` and `rejected-entry-source.png` (captured mid-effect; set a longer `REJECTION_MS` temporarily only if capture timing requires it, and revert).

---

### Task 5: Docs and PR

- `docs/ROADMAP.md`: under "More obvious incorrect-entry feedback", add a **Status:** line naming this PR, and record that wrong entries stay unmarked when blocking is off (Sean's September 23 decision).
- Create `docs/investigations/2026-09-23-rejected-entry-feedback.md` from `docs/investigations/TEMPLATE.md` only if verification finds something non-obvious (for example, the reduced-motion override).
- Run the full gate: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Follow the PR pre-push checklist in the global instructions, then open the PR against `main` with the screenshots.
