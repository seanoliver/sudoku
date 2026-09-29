# App Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Make the whole app cohesive, modern, and effortless: one visual language, and simple spring motion that shows where things come from and go to.

**Architecture:** Step 1 renders three directions for the look and waits for Sean. Step 2 adds Motion (`motion` package) behind one provider that loads the small core first and the layout and drag features after first render, plus spring presets, design tokens, and a first-load JS measurement script. Steps 3–7 restyle one area per PR; each shared component (`ScreenHeader`, `Sheet`, `Pressable`) ships with the first screen that uses it.

**Tech Stack:** Next.js 16 (App Router, client components), React 19, Motion 13 (`motion/react`), CSS variables in `src/app/globals.css`, Node test runner, Playwright (Chromium and WebKit), `sharp` for composites.

**Design:** `docs/plans/2026-09-29-app-polish-design.md`.

**Rules that apply to every task:**
- Read `AGENTS.md`. Show, don't explain: no new visible text where an icon, color, or position works.
- This Next.js differs from training data: check `node_modules/next/dist/docs/` before using any Next API.
- Every PR: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` (the 32-size fit test in `e2e/keypad.spec.ts` must pass), screenshots light and dark compared with the approved direction, a reduced-motion check, and `node scripts/first-load-js.mjs` within budget. Then `finalize-pr-solo` before merge.

---

## Step 1: Three rendered directions (Sean picks one)

Follow `.claude/skills/rendering-design-directions/SKILL.md`. Nothing in this step merges.

### Task 1.1: Scratch worktree

**Step 1:** From the repo root:

```bash
git fetch -q && git worktree add .worktrees/polish-looks -b design/polish-looks origin/main
cd .worktrees/polish-looks && pnpm install --frozen-lockfile
```

Expected: `Done in …s`.

### Task 1.2: Look switch

**Files:**
- Modify: `src/components/game.tsx` (top of `SudokuGame`)

**Step 1:** Read `?look=a|b|c` once on mount and set it on `<html>`:

```tsx
useEffect(() => {
  const look = new URLSearchParams(location.search).get('look');
  if (look) document.documentElement.dataset.look = look;
}, []);
```

**Step 2:** `pnpm typecheck`. Expected: no output.

### Task 1.3: The three directions

Each direction differs in structure (where the controls live), not only color. All three use the agreed type scale, one compact game bar (Home left; difficulty and timer center; pause, hint, Settings right), no "Install app" on the game screen, and neutral level cards on Home.

- **A. Grouped cards:** iOS Settings. Plain canvas; the board sits in a white card; modes, tools, and keys sit together in a second grouped card below. Home: large title, the Continue card, then one grouped list of levels.
- **B. Glass dock:** the board is full width on the canvas; the bar and all controls sit in one translucent floating dock pinned to the bottom (`backdrop-filter: blur(20px)`). Home: large title, Continue as a floating glass button over the mini-board.
- **C. Quiet paper:** Things 3. No cards; hairline dividers; the board sits directly on the background with more white space; controls are plain, lighter weight. Home: large title and a plain list.

**Files:**
- Modify: `src/app/globals.css` (append one block per direction, scoped to `:root[data-look='a']` etc.)
- Modify: `src/components/game.tsx` and `src/components/home.tsx` only where a direction needs different markup (for example the game bar), switched on `document.documentElement.dataset.look`.

**Step 1:** Build A. Check at `http://localhost:3217/?look=a` with `npx next dev -p 3217`.
**Step 2:** Build B, then C, the same way.
**Step 3:** `pnpm typecheck && pnpm lint`. Expected: clean.

### Task 1.4: Render and compose

**Files:**
- Create (untracked, deleted after): `scratch/looks.ts`, `scratch/composite.mjs`

**Step 1:** Capture, with Playwright at `scale: 'css'`, `reducedMotion: 'reduce'`, light and dark, at 390 × 844 and 466 × 590, these states for each look: Home (new player), Home (game in progress), game mid-play with a cell selected, game in Notes mode, Settings sheet open. Seed games with `gameBefore` from `e2e/fixtures.ts` and `SAVE_KEY` via `addInitScript`, as in the tour script used on September 29.
**Step 2:** Compose each state as one labeled A | B | C image with `sharp`.
**Step 3:** Open every composite and check it. Recapture anything showing a spinner, a missing font, or the wrong state.

### Task 1.5: Present and stop

**Step 1:** Send the composites with `SendUserFile`, one line per direction on its trade-off, and a recommendation.
**Step 2:** Stop until Sean picks.

### Task 1.6: Record the choice

**Files:**
- Create: `docs/designs/polish-look-approved.png`, `docs/designs/polish-look-approved-dark.png`, `docs/designs/polish-look-approved-short.png`
- Modify: `docs/plans/2026-09-29-app-polish-design.md` (add the chosen direction and token values to the first paragraph and the Visual language section)

**Step 1:** Copy the chosen renders. Write the exact token values of the chosen direction into the design doc: type sizes, spacing steps, radii, surface colors for both themes.
**Step 2:** Commit to `docs/app-polish-design`, remove the scratch worktree and branch.

---

## Step 2: Foundation (no visible change)

Branch: `feat/polish-foundation` from `origin/main` after the design doc merges.

### Task 2.1: First-load JS measurement

**Files:**
- Create: `scripts/first-load-js.mjs`

**Step 1:** Write the script. It starts `pnpm start` on port 3410, loads `/` in Chromium, and sums the compressed size of every script response:

```js
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 3410;
const server = spawn('pnpm', ['start', '--port', String(PORT)], { stdio: 'ignore' });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://localhost:${PORT}`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  const bytes = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(entry => entry.initiatorType === 'script')
    .reduce((sum, entry) => sum + entry.encodedBodySize, 0));
  console.log(`First-load JS: ${(bytes / 1024).toFixed(1)} kB compressed`);
  await browser.close();
} finally {
  server.kill();
}
```

**Step 2:** `pnpm build && node scripts/first-load-js.mjs`. Record the number as the baseline in the PR body.
**Step 3:** Commit: `git add scripts/first-load-js.mjs && git commit -m "chore: measure first-load JS"`.

### Task 2.2: Install Motion

**Step 1:** `pnpm add motion@^13.4.6`. Expected: `package.json` and `pnpm-lock.yaml` change.
**Step 2:** Confirm the API from the installed package, not memory: `ls node_modules/motion/dist` and read the type exports for `LazyMotion`, `MotionConfig`, `domAnimation`, `domMax`, `m` in `node_modules/motion/dist/react.d.ts` (or the path the package's `exports` names).
**Step 3:** Commit: `git add package.json pnpm-lock.yaml && git commit -m "chore: add motion"`.

### Task 2.3: Spring presets

**Files:**
- Create: `src/lib/motion.ts`
- Test: `tests/motion.test.ts`

**Step 1: Write the failing test**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRINGS } from '../src/lib/motion.ts';

test('three spring presets, each a spring with stiffness and damping', () => {
  assert.deepEqual(Object.keys(SPRINGS), ['snappy', 'smooth', 'gentle']);
  for (const spring of Object.values(SPRINGS)) {
    assert.equal(spring.type, 'spring');
    assert.ok(spring.stiffness > 0 && spring.damping > 0);
  }
});

test('gentle does not overshoot', () => {
  const { stiffness, damping, mass = 1 } = SPRINGS.gentle;
  assert.ok(damping >= 2 * Math.sqrt(stiffness * mass));
});
```

**Step 2:** `node --experimental-strip-types --test tests/motion.test.ts`. Expected: FAIL, module not found.

**Step 3: Implement**

```ts
/** Named springs shared by every animation, so motion feels the same everywhere. */
export const SPRINGS = {
  snappy: { type: 'spring', stiffness: 700, damping: 40 },
  smooth: { type: 'spring', stiffness: 380, damping: 34 },
  gentle: { type: 'spring', stiffness: 160, damping: 26 },
} as const;
```

**Step 4:** Run the test. Expected: PASS (gentle: 26 ≥ 2·√160 ≈ 25.3).
**Step 5:** Commit: `git add src/lib/motion.ts tests/motion.test.ts && git commit -m "feat(motion): spring presets"`.

### Task 2.4: Motion provider

**Files:**
- Create: `src/components/motion-provider.tsx`, `src/components/motion-features.ts`
- Modify: `src/components/game.tsx` (wrap the returned tree of `SudokuGame`, including the early returns for Replay, History, and Learn)

**Step 1:** `motion-features.ts` re-exports the large feature pack so it can load after first render:

```ts
import { domMax } from 'motion/react';
export default domMax;
```

**Step 2:** `motion-provider.tsx`:

```tsx
'use client';
import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

const features = () => import('./motion-features').then(module => module.default);

/** Loads Motion's layout and drag features after first render, and turns movement into fades for reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={features} strict><MotionConfig reducedMotion="user">{children}</MotionConfig></LazyMotion>;
}
```

Check the `LazyMotion` `features` prop type in the installed package before writing this; if it does not accept an async loader, stop and report.

**Step 3:** In `game.tsx`, wrap each `return` of `SudokuGame` in `<MotionProvider>`. `strict` makes any accidental `motion.div` throw, so every later component uses `m.div`.
**Step 4:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e`. Expected: all pass, no visible change.
**Step 5:** `node scripts/first-load-js.mjs`. Expected: within 10 kB of the baseline. If not, stop and report.
**Step 6:** Commit: `git commit -am "feat(motion): provider with lazily loaded features"` (add the new files first).

### Task 2.5: Design tokens

**Files:**
- Modify: `src/app/globals.css` (`:root`, both dark-theme blocks)

**Step 1:** Add the approved direction's tokens as variables, unused so far: `--text-title` (32px), `--text-card` (20px), `--text-body` (17px), `--text-secondary` (15px), `--text-caption` (13px); `--space-1` … `--space-8` in 4px steps; `--radius-card` (12px), `--radius-sheet` (20px); surface colors from Task 1.6, with dark values in both dark blocks.
**Step 2:** `pnpm build && pnpm test:e2e`. Expected: all pass; screenshots unchanged.
**Step 3:** Commit: `git commit -am "feat(tokens): type, spacing, radius, and surface variables"`.

### Task 2.6: PR

**Step 1:** Push and open the PR. The body gives the baseline and new first-load JS numbers, and states there is no visible change.
**Step 2:** Run `finalize-pr-solo`. Merge on Sean's go-ahead.

---

## Steps 3–7: one PR each, detailed after Step 1

Each is planned in full, with tests, once the direction is chosen, because the markup depends on it. Outline:

- **Step 3, game screen:** the one compact bar; remove the empty bands; `Pressable` (new, `m.button` with `whileTap={{ scale: 0.96 }}` and `SPRINGS.snappy`) on keys and tools; selection glides with a shared `layoutId` on the selection outline; placed numbers scale in from 0.9. Tests: the fit test, bar button order and names, reduced motion shows no transform.
- **Step 4, sheets:** new `Sheet` around the existing `<dialog>` (focus, Escape, and screen readers stay native); the panel springs in, drags down to dismiss, and the background scales to 0.96. Remove the Settings hint line. Rewrite How to play as short rows with small illustrations. Tests: open, close by Escape, by drag, and by backdrop; focus returns.
- **Step 5, finish moment:** three rendered directions first, then the build. Remove the blank focus strip on pause and completion.
- **Step 6, Learn and lessons:** new `ScreenHeader`; one technique name; walkthrough card sized to its text.
- **Step 7, Home, History, Replay:** `ScreenHeader` large titles; neutral level cards; Replay timeline visible for short replays; Continue grows the mini-board into the game board through a shared `layoutId`; pushes from the right for Learn, History, Replay.
