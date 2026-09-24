# Entry mode switch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Replace the Notes switch and nested Exclude chip with a one-tap Numbers | Notes | Exclude control, show the mode on the number keys, and keep the annotation mode after batches.

**Architecture:** Pure transition functions in `src/lib/entry-mode.ts` own the rules. `game.tsx` keeps one `{ mode, batchMode }` state and calls them. CSS styles the segmented control and per-mode keys.

**Tech Stack:** Next.js 16, React 19, TypeScript, plain CSS, `node:test` via `pnpm test`.

**Design:** `docs/plans/2026-09-23-entry-modes-design.md`

---

### Task 1: Entry mode transitions

**Files:** create `src/lib/entry-mode.ts`, `tests/entry-mode.test.ts`.

**Step 1: Failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeMode, beginBatch, selectMode, toggleMode, INITIAL_ENTRY_MODE } from '../src/lib/entry-mode.ts';

test('any mode is one selection away outside a batch', () => {
  for (const mode of ['value', 'note', 'exclude'] as const) {
    assert.equal(activeMode(selectMode(INITIAL_ENTRY_MODE, { mode, batch: false }), { batch: false }), mode);
  }
});

test('keyboard toggles go to the mode or back to Numbers', () => {
  const excluding = toggleMode(INITIAL_ENTRY_MODE, { mode: 'exclude', batch: false });
  assert.equal(excluding.mode, 'exclude');
  assert.equal(toggleMode(excluding, { mode: 'exclude', batch: false }).mode, 'value');
  assert.equal(toggleMode(excluding, { mode: 'note', batch: false }).mode, 'note');
});

test('a batch keeps the annotation mode after it ends', () => {
  const fromExclude = beginBatch({ mode: 'exclude', batchMode: 'note' });
  assert.equal(activeMode(fromExclude, { batch: true }), 'exclude');
  assert.equal(fromExclude.mode, 'exclude');
  const switched = selectMode(fromExclude, { mode: 'note', batch: true });
  assert.equal(activeMode(switched, { batch: true }), 'note');
  assert.equal(activeMode(switched, { batch: false }), 'note');
});

test('a batch started in Numbers annotates as Notes and returns to Numbers', () => {
  const fromValue = beginBatch(INITIAL_ENTRY_MODE);
  assert.equal(activeMode(fromValue, { batch: true }), 'note');
  const switched = selectMode(fromValue, { mode: 'exclude', batch: true });
  assert.equal(activeMode(switched, { batch: true }), 'exclude');
  assert.equal(activeMode(switched, { batch: false }), 'value');
});

test('choosing Numbers during a batch leaves annotation modes', () => {
  const batch = beginBatch({ mode: 'note', batchMode: 'note' });
  assert.equal(selectMode(batch, { mode: 'value', batch: true }).mode, 'value');
  assert.equal(toggleMode(batch, { mode: 'note', batch: true }).mode, 'value');
});
```

**Step 2:** `pnpm test` → FAIL (module missing).

**Step 3: Implement** `src/lib/entry-mode.ts`:

```ts
export type EntryMode = 'value' | 'note' | 'exclude';
export type EntryModeState = { mode: EntryMode; batchMode: 'note' | 'exclude' };
export const INITIAL_ENTRY_MODE: EntryModeState = { mode: 'value', batchMode: 'note' };

/** The mode number keys apply now. A batch always annotates. */
export function activeMode(state: EntryModeState, { batch }: { batch: boolean }): EntryMode {
  return batch ? state.batchMode : state.mode;
}
/** A batch annotates in Exclude when Exclude is active, otherwise in Notes. The regular mode is kept. */
export function beginBatch(state: EntryModeState): EntryModeState {
  return { mode: state.mode, batchMode: state.mode === 'exclude' ? 'exclude' : 'note' };
}
/** Numbers during a batch leaves annotation; the caller cancels the selection. */
export function selectMode(state: EntryModeState, { mode, batch }: { mode: EntryMode; batch: boolean }): EntryModeState {
  if (!batch || mode === 'value') return { mode, batchMode: mode === 'value' ? state.batchMode : mode };
  return { mode: state.mode === 'value' ? 'value' : mode, batchMode: mode };
}
export function toggleMode(state: EntryModeState, { mode, batch }: { mode: EntryMode; batch: boolean }): EntryModeState {
  return selectMode(state, { mode: activeMode(state, { batch }) === mode ? 'value' : mode, batch });
}
```

Verify each test's expectation against this code before running; fix only genuine plan mistakes and say why.

**Step 4:** `pnpm test && pnpm lint && pnpm typecheck`.

**Step 5:** commit `feat(game): add entry mode transitions`.

---

### Task 2: Wire the control into the game

**Files:** `src/components/game.tsx`, `src/app/globals.css`.

1. Replace the `noteMode` and `batchMode` states with `const [entry, setEntry] = useState<EntryModeState>(INITIAL_ENTRY_MODE)`. Derive:
   - `const mode = activeMode(entry, { batch: batchSelection })`
   - `notesActive = mode !== 'value'` (batch is always an annotation mode), `pencil = mode === 'note'`, `excluding = mode === 'exclude'`.
   Keep every existing consumer of `notesActive`, `pencil`, `excluding` working.
2. `useNoteSelection`'s `onBegin`: `setEntry(beginBatch)` instead of setting batch mode and forcing `noteMode` to `'value'`. Keep `setBlockedEntry(null)`.
3. Remove every other `setNoteMode('value')`:
   - `clearSelection` only resets the selection.
   - The new-puzzle path (~line 87) and `restartPuzzle` call `setEntry(INITIAL_ENTRY_MODE)`.
4. Replace `toggleNotes`/`toggleExclusions` with:
   ```ts
   const chooseMode = (next: EntryMode) => {
     setBlockedEntry(null);
     if (batchSelection && next === 'value') resetSelection();
     setEntry(state => selectMode(state, { mode: next, batch: batchSelection }));
     focusSelectedCell();
   };
   ```
   Keyboard: `n` → `setEntry(s => toggleMode(s, { mode: 'note', batch: batchSelection }))`, `x` → same with `'exclude'`. If a toggle during a batch lands on `'value'`, also `resetSelection()`. X works in every mode.
5. Replace the `note-controls` contents (Notes switch + Exclude chip + Erase) with:
   ```tsx
   <div className="mode-switch" role="group" aria-label="Entry mode">
     {(['value', 'note', 'exclude'] as const).map(option => <button key={option} className={`mode-option mode-${option}`} aria-pressed={mode === option} disabled={paused || busy} onClick={() => chooseMode(option)} title={{ value: 'Numbers', note: 'Notes (N)', exclude: 'Exclude (X)' }[option]}>
       <Icon name={{ value: '…', note: 'pencil', exclude: '…' }[option]} size={16}/><span>{{ value: 'Numbers', note: 'Notes', exclude: 'Exclude' }[option]}</span>
     </button>)}
   </div>
   <button className="erase-control" style={{ visibility: canErase ? 'visible' : 'hidden' }} …>
   ```
   Check `src/components/icons.tsx` for available icon names; add a numbers icon (e.g. "123" glyph) and an exclude icon (circle with slash) only if needed, matching the existing icon style. Keep Erase's existing logic, label and `title`, as an icon-only button with `aria-label="Erase"`. Hide it with `visibility` instead of unmounting so the row does not shift.
6. Number pad class: `number-pad mode-${mode}` (replace `pencil-mode`). Check what `.pencil-mode` styled, if anything, and fold it into the new classes.
7. Remove the two input-hint strings that describe Notes/Exclude being on. Leave the other hint strings.
8. CSS (next to the existing `.note-controls` rules; remove `.notes-toggle`, `.notes-switch-track` and `.exclude-chip*` rules if nothing else uses them):
   ```css
   .mode-switch { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); padding: 3px; border-radius: 10px; background: color-mix(in srgb, var(--line) 70%, var(--canvas)); }
   .mode-option { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 42px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--secondary); }
   .mode-option[aria-pressed='true'] { box-shadow: 0 1px 2px rgb(0 0 0 / .12); }
   .mode-value[aria-pressed='true'] { background: var(--surface); color: var(--blue); }
   .mode-note[aria-pressed='true'] { background: var(--surface); color: var(--note-blue); }
   .mode-exclude[aria-pressed='true'] { background: var(--red-soft); color: var(--note-red); }
   .number-pad.mode-note .number-key>span { font-size: 17px; color: var(--note-blue); }
   .number-pad.mode-exclude .number-key { background: color-mix(in srgb, var(--red-soft) 70%, var(--surface)); }
   .number-pad.mode-exclude .number-key>span { position: relative; color: var(--note-red); }
   .number-pad.mode-exclude .number-key>span::after { content: ''; position: absolute; left: 50%; top: 50%; width: 1.1em; height: 2px; margin: -1px 0 0 -.55em; background: currentColor; transform: rotate(45deg); }
   ```
   Check that filtered, finished, and focused key styles still read correctly in each mode and in dark theme. Keep `.note-controls` as the row container (flex, gap 8px) with the segmented control plus Erase.
9. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass. Commit `feat(game): one-tap Numbers, Notes and Exclude switch`.

---

### Task 3: Verify and document

- Browser at 390 × 844, light and dark: each mode's control and keys; one-tap Numbers ↔ Exclude; drag batch from Notes and from Exclude stays in that mode after finishing, Escape, and selecting a filled cell; drag from Numbers returns to Numbers; tapping Numbers during a batch cancels it; keyboard N and X; digit focus still works in Numbers mode on filled cells. Screenshots in `docs/screenshots/`.
- Help sheet: update any text that mentions the Notes switch or the Exclude chip.
- `docs/ROADMAP.md`: status under R3.
- Full gate, PR checklist, PR. Include `docs/sharing/2026-09-23-playtest-fixes.md` and `docs/screenshots/unit-celebration-post.mp4` in the PR.
