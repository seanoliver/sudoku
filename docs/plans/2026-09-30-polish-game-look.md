# Polish Step 3a: Game Screen Look Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** The game screen takes the approved look (direction A, grouped cards): one compact bar, the board and the controls in two cards on the new gray background, content centered under the bar, and every key visible on short screens.

**Architecture:** A new `GameBar` component replaces the game's app bar and its separate difficulty-and-timer row, reusing the existing buttons and accessible names so behaviour and tests carry over. The polish surface colors become `--canvas` and `--surface` for the whole app, and one shared constant feeds every place that writes the browser theme color. The board and controls get card styling from the Step 2 tokens. The height budget variables are recomputed by measurement so the existing 32-size fit test keeps passing. No motion in this step (that is Step 3b).

**Tech Stack:** Next.js 16, React 19, CSS in `src/app/globals.css`, Playwright e2e (`e2e/keypad.spec.ts` holds the layout tests).

**Design:** `docs/plans/2026-09-29-app-polish-design.md`. Reference renders: `docs/designs/polish-look-approved.png`, `-dark.png`, `-short.png` (466 × 590; the render clips the last key row, the build must not).

**Stacked on:** `feat/polish-foundation` (PR #61). Rebase onto `main` once #61 merges.

**Rules:** read `AGENTS.md`; check `node_modules/next/dist/docs/` before using a Next API; keep every existing accessible name (`Home`, `Settings`, `Show a hint`, `Pause game` / `Resume game`, the difficulty button's label) so existing tests keep working; no `git stash`; commits without trailers.

**Out of scope (Step 3b):** press motion, number and selection motion, haptics, the selection outline redesign, catching a failed lazy feature load.

---

### Task 1: One theme-color constant, new canvas and surface

**Files:**
- Create: `src/lib/theme-color.ts`
- Modify: `src/app/layout.tsx:15`, `src/app/manifest.ts:7`, `src/components/game.tsx` (`syncChrome`, about line 245), `src/app/globals.css` (`:root` and both dark blocks)
- Test: `tests/theme-color.test.ts`

**Step 1: Write the failing test**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEME_COLOR } from '../src/lib/theme-color.ts';

test('the browser theme color matches the canvas color in both themes', () => {
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  const light = css.match(/:root \{[^}]*--canvas: (#[0-9a-f]+)/)?.[1];
  const dark = css.match(/:root\[data-theme='dark'\] \{[^}]*--canvas: (#[0-9a-f]+)/)?.[1];
  assert.deepEqual(THEME_COLOR, { light, dark });
});
```

**Step 2:** `node --experimental-strip-types --test tests/theme-color.test.ts`. Expected: FAIL, module not found.

**Step 3: Implement**

`src/lib/theme-color.ts`:

```ts
/** The browser and status-bar color for each theme; it must equal --canvas in globals.css. */
export const THEME_COLOR = { light: '#f2f2f7', dark: '#0b0d11' } as const;
```

- `globals.css`: set `--canvas` to `#f2f2f7` light and `#0b0d11` in both dark blocks; set `--surface` to `#fff` light and `#1b1e25` in both dark blocks; delete the `--polish-canvas` and `--polish-surface` lines (three places).
- `layout.tsx`: `themeColor: [{ media: '(prefers-color-scheme: light)', color: THEME_COLOR.light }, { media: '(prefers-color-scheme: dark)', color: THEME_COLOR.dark }]`.
- `manifest.ts`: `background_color: THEME_COLOR.light, theme_color: THEME_COLOR.light`.
- `game.tsx` `syncChrome`: `dark ? THEME_COLOR.dark : THEME_COLOR.light`.

**Step 4:** Run the test (PASS), `pnpm typecheck`, `pnpm test`. Grep: `grep -rn "f5f6f8\|181c24" src` returns nothing.

**Step 5:** Commit: `feat(polish): new canvas and surface colors, one theme-color constant`.

This recolors every screen. Screenshots of every screen come in Task 6.

---

### Task 2: GameBar

**Files:**
- Create: `src/components/game-bar.tsx`
- Modify: `src/components/game.tsx` (the play-view header, about lines 614–621, and the `.game-meta` block, about lines 624–627)

**Step 1:** Move the existing difficulty button, clock, and pause button markup out of `.game-meta` into `GameBar` unchanged (same classes, labels, handlers). `GameBar` props: `onHome`, `homeDisabled`, `onHint`, `hintDisabled`, `onSettings`, and a `meta` React node for the difficulty button, clock, and pause button (the clock needs `game.tsx` state, so `game.tsx` builds that node).

```tsx
import type { ReactNode } from 'react';
import { Icon } from './icons';

export function GameBar({ meta, onHome, homeDisabled, onHint, hintDisabled, onSettings }: { meta: ReactNode; onHome: () => void; homeDisabled: boolean; onHint: () => void; hintDisabled: boolean; onSettings: () => void }) {
  return <header className="game-bar">
    <button className="icon-button" aria-label="Home" title="Home" disabled={homeDisabled} onClick={onHome}><Icon name="home"/></button>
    <div className="game-bar-center">{meta}</div>
    <div className="game-bar-actions">
      <button className="icon-button" aria-label="Show a hint" title="Hint (H)" disabled={hintDisabled} onClick={onHint}><Icon name="bulb" size={19}/></button>
      <button className="icon-button" aria-label="Settings" onClick={onSettings}><Icon name="settings"/></button>
    </div>
  </header>;
}
```

**Step 2:** In `game.tsx`, when not in a lesson, render `GameBar` instead of the `app-bar` header and do not render `.game-meta`. Lessons keep `LessonBar` and their current markup. Remove the hint button from the focus bar (the `hint-button` in `.digit-focus-bar`'s non-hint branch); keep the hint strip's own buttons. Keep the `H` shortcut and the `focusAfterRender` behaviour for the bar's hint button (search for `HINT_STRIP_FOCUS`).

**Step 3:** Remove "Install app" from the game screen (Home keeps its install card).

**Step 4:** `pnpm typecheck && pnpm lint && pnpm test`. Expected: clean.

**Step 5:** Commit: `feat(polish): one compact game bar`.

---

### Task 3: Card styling and vertical centering

**Files:**
- Modify: `src/app/globals.css`

**Step 1:** Add, using the Step 2 tokens (values from the approved render; see the prototype notes in the design doc):
- `.game-bar`: height 56px, three columns (`auto 1fr auto`), center group centered with 14px gap, difficulty and clock at 15px, no backgrounds on its icon buttons.
- `.puzzle-panel`: `padding: 8px; border-radius: var(--radius-card-lg); background: var(--surface); box-shadow: 0 1px 2px #0000000d;` The focus strip inside has no border and a transparent background.
- `.board-wrap`: `--board-radius: var(--radius-board)`. Replace the hard-coded 11px radius in `.puzzle-panel` and `.digit-focus-bar` so the board has one radius.
- `.controls-area`: `padding: 10px; border-radius: var(--radius-card-lg); background: var(--surface);` same shadow. Keys, Erase, Undo, Redo, and the mode switch fill with `var(--canvas)`; filtered keys are transparent.
- Center the play content under the bar: `.app:has(.game-bar)` is a column flexbox; `.game.play` gets `margin-block: auto`.
- Short portrait layout (the `max-height: 629px` block): the old folded header rules for `.app-bar` on the play screen no longer apply to the game (lessons still use them); the game bar is always one row.
- Side-by-side layout (`min-aspect-ratio: 5/4` block): the bar spans the top; the board card and controls card sit side by side under it.

**Step 2:** Check it by eye at `http://localhost:3217` (`npx next dev -p 3217`) at 390 × 844, 466 × 590, 375 × 553, and 1024 × 768, light and dark, against the approved renders.

**Step 3:** Commit: `feat(polish): board and controls cards, content centered under the bar`.

---

### Task 4: Height budget

The board's width on short screens is computed from `--around-board`, `--bar-height`, and `--play-width` (search `globals.css`), which add up everything on the screen that is not the board. The bar and card padding change those totals.

**Step 1:** Write a scratch Playwright script (delete it before committing) that, for each size in the `SIZES` list in `e2e/keypad.spec.ts`, loads a saved game (use `gameBefore` from `e2e/fixtures.ts` and `openGame`), and prints `document.documentElement.scrollHeight - innerHeight`, the board width, and the bottom of `.number-pad` relative to `innerHeight`.
**Step 2:** Adjust `--bar-height`, `--around-board`, and the `--play-width` formulas per breakpoint until no size scrolls and the number pad ends inside the viewport, with the board as large as possible. Record the final numbers in the commit body.
**Step 3:** `pnpm build && pnpm exec playwright test e2e/keypad.spec.ts`. Expected: every fit test passes.
**Step 4:** Commit: `feat(polish): height budget for the game bar and cards`.

---

### Task 5: Update the layout tests

**Files:**
- Modify: `e2e/keypad.spec.ts`
- Create or modify: `e2e/game-bar.spec.ts`

**Step 1:** Tests that assert the old header change to assert the bar:
- `at ${width} × ${height} the header is one row and the grid stays`: the bar is one row at every size (keep the grid assertions).
- `on short portrait screens Home and Settings line up with the board`: Home's left edge lines up with the board card's left edge and Settings' right edge with the board card's right edge, at 375 × 553 and 466 × 590.
- `the installed app on a short phone fits with its taller app bar`: keep, with the new bar height.

**Step 2:** New `e2e/game-bar.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';
import { gameBefore, openGame } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { lessonOf } from '../src/lib/lessons.ts';

const saved = gameBefore(step => lessonOf(step) === 'pointing');
const seed = (page: Page) => page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, saved]);

test('the game bar holds Home, the difficulty and timer, hint, and Settings in order, in one row', async ({ page }) => {
  await seed(page);
  await openGame(page);
  const bar = page.locator('.game-bar');
  const boxes = await Promise.all(['Home', /^Difficulty/, 'Pause game', 'Show a hint', 'Settings'].map(name => bar.getByRole('button', { name }).boundingBox()));
  for (let k = 1; k < boxes.length; k++) expect(boxes[k]!.x).toBeGreaterThan(boxes[k - 1]!.x);
  const middle = (box: { y: number; height: number }) => box.y + box.height / 2;
  for (const box of boxes) expect(Math.abs(middle(box!) - middle(boxes[0]!))).toBeLessThan(4);
  await expect(page.getByRole('button', { name: /Install app/ })).toHaveCount(0);
});

test('the hint button in the bar opens the hint strip', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await page.locator('.game-bar').getByRole('button', { name: 'Show a hint' }).click();
  await expect(page.locator('.digit-focus-bar.hint-strip')).toBeVisible();
});

test('on a tall phone the content is centered under the bar', async ({ page }) => {
  await seed(page);
  await openGame(page);
  const bar = (await page.locator('.game-bar').boundingBox())!;
  const top = (await page.locator('.puzzle-panel').boundingBox())!;
  const bottom = (await page.locator('.controls-area').boundingBox())!;
  const above = top.y - (bar.y + bar.height), below = 844 - (bottom.y + bottom.height);
  expect(Math.abs(above - below)).toBeLessThan(24);
});
```

The centering tolerance allows for the safe-area and bottom padding; adjust it only if the measured difference in Task 4 says so, and note why.

**Step 3:** `pnpm build && pnpm test:e2e`. Expected: all pass.
**Step 4:** Commit: `test(polish): game bar and layout tests`.

---

### Task 6: Screenshots, budget, docs

**Step 1:** Capture every screen at 390 × 844 in light and dark (Home new and returning, the game, hint, walkthrough, Settings, How to play, New puzzle, pause, completion, Learn, a lesson, History, Replay), plus the game at 466 × 590, 375 × 553, and 1024 × 768. Save the game shots in `docs/screenshots/polish-game-*.png` and compare them side by side with `docs/designs/polish-look-approved*.png`. Screens other than the game only change color; check that nothing looks broken on the new background.
**Step 2:** `pnpm size:first-load` after `pnpm build`. Expected: first load at most 194.3 kB (step 3 ceiling: 166.3 + 24 + 4), deferred at most 30 kB.
**Step 3:** Update `README.md` where it describes the game screen's header, and the R13 status in `docs/ROADMAP.md`.
**Step 4:** Commit: `docs(polish): game screen screenshots and status`.

### Task 7: PR

Open the PR against `main` (after #61 merges; rebase first) or against `feat/polish-foundation` if it has not. Body: the before and after screenshots, the approved render, the budget numbers. Run `finalize-pr-solo`. Merge on Sean's go-ahead.
