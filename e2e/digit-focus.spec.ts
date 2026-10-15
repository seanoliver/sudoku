import { expect, test, type Locator, type Page } from '@playwright/test';
import { gameBefore, openGame, stepToEnd } from './fixtures.ts';
import { nextHint } from '../src/lib/hints.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';
import { DEFAULT_PREFS, PREFS_KEY } from '../src/lib/preferences.ts';

const base = createGame(createPuzzle('medium', 7));
const candidates = getPlayableCandidates(base);
const game = { ...base, notes: base.values.map((v, i) => v ? [] : [...candidates[i]].sort()), noteOrigins: base.values.map(v => v ? null : 'manual' as const) };
const filled = game.values.findIndex(v => v);
const digit = game.values[filled];
const empty = game.values.findIndex((v, i) => !v && game.solution[i] !== digit && game.notes[i].includes(digit));
const other = game.solution[empty];
const seed = (page: Page) => page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(game)]);
const cell = (page: Page, i: number) => page.locator(`.board [data-index="${i}"]`);
const lit = (page: Page) => page.locator('.number-key.digit-focused');
const settled = async (locator: Locator, property: string) => locator.evaluate((el, p) => Promise.all(el.getAnimations().map(a => a.finished)).then(() => getComputedStyle(el).getPropertyValue(p)), property);
const resolved = (page: Page, token: string) => page.evaluate(t => { const probe = document.createElement('i'); probe.style.color = `var(${t})`; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; }, token);

test('selecting a filled cell lights its key, rings its matches, and marks its notes', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, empty).click();
  await expect(lit(page)).toHaveCount(0);
  await cell(page, filled).click();
  await expect(lit(page)).toHaveText(String(digit));
  await expect(lit(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.number-key').nth(digit % 9)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('status').filter({ hasText: 'Focused on' })).toHaveCount(0);
  await expect(page.locator('.cell.focused')).toHaveCount(game.values.filter(v => v === digit).length);
  await expect(cell(page, empty).locator(`.note-digit.note-focused[data-digit="${digit}"]`)).toHaveCount(1);
});

test('focus stays on an empty cell, moves to a placed number, and Notes leaves it alone', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, filled).click();
  const possible = await page.locator('.cell.possible').count();
  expect(possible).toBeGreaterThan(0);
  await cell(page, empty).click();
  await expect(lit(page)).toHaveText(String(digit));
  await expect(page.locator('.cell.possible')).toHaveCount(possible);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.keyboard.press(String(other));
  await expect(lit(page)).toHaveText(String(digit));
  await page.getByRole('button', { name: 'Numbers', exact: true }).click();
  await page.keyboard.press(String(other));
  await expect(lit(page)).toHaveText(String(other));
});

test('tapping the lit key clears focus', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, filled).click();
  await lit(page).click();
  await expect(lit(page)).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Focus cleared' })).toHaveCount(1);
  await expect(page.locator('.cell.focused')).toHaveCount(0);
  await expect(page.locator('.cell.matching')).toHaveCount(0);
  await expect(page.locator('.cell.possible')).toHaveCount(0);
  await page.locator('.number-key').nth(digit - 1).click();
  await expect(lit(page)).toHaveText(String(digit));
  await expect(page.getByRole('status').filter({ hasText: `Focused on ${digit}` })).toHaveCount(1);
});

test('placing a number with nothing focused focuses it, and an exclusion leaves focus alone', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, empty).click();
  await page.keyboard.press(String(other));
  await expect(lit(page)).toHaveText(String(other));
  await expect(page.locator('.cell.focused')).toHaveCount(game.values.filter(v => v === other).length + 1);
  const next = game.values.findIndex((v, i) => !v && i !== empty && game.solution[i] !== digit && game.notes[i].includes(digit));
  await cell(page, next).click();
  await page.getByRole('button', { name: 'Exclude', exact: true }).click();
  await page.keyboard.press(String(digit));
  await expect(lit(page)).toHaveText(String(other));
});

test('the lit key is solid blue and its matches are ringed', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, filled).click();
  const blue = await resolved(page, '--blue');
  await expect(lit(page)).toHaveCSS('background-color', blue);
  await expect(page.locator('.note-digit.note-focused').first()).toHaveCSS('background-color', blue);
  expect(await settled(lit(page).locator('span'), 'color')).toBe(await resolved(page, '--surface'));
  expect(await settled(page.locator('.cell.focused .cell-number').first(), 'color')).toBe(await resolved(page, '--blue-strong'));
  const ring = await page.locator('.cell.focused').first().evaluate(el => getComputedStyle(el, '::after').boxShadow);
  expect(ring).toContain('inset');
});

test('holding a digit key toggles focus once', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, filled).click();
  await page.keyboard.down(String(digit));
  await page.keyboard.down(String(digit));
  await page.keyboard.up(String(digit));
  await expect(lit(page)).toHaveCount(0);
});

test('a walkthrough hides focus on the board, and applying a placement focuses the placed number', async ({ page }) => {
  const saved = gameBefore(step => step.technique === 'naked-single');
  const hinted = JSON.parse(saved);
  const hint = nextHint(hinted);
  const placed = hint.kind === 'step' ? hint.step.placement!.digit : 0;
  const start = hinted.values.findIndex((v: number) => v && v !== placed);
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, saved]);
  await openGame(page);
  await cell(page, start).click();
  await expect(lit(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await page.locator('.hint-action').click();
  await page.locator('.hint-action').click();
  await page.locator('.walk-panel').waitFor();
  await expect(page.locator('.cell.focused')).toHaveCount(0);
  await stepToEnd(page);
  await page.locator('.hint-action').click();
  await expect(lit(page)).toHaveText(String(placed));
});

test('the finished puzzle announces no focus', async ({ page }) => {
  const last = base.givens.findIndex(v => !v);
  const nearly = { ...base, values: base.solution.map((v, i) => i === last ? 0 : v) };
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(nearly)]);
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await cell(page, last).click();
  await page.keyboard.press(String(base.solution[last]));
  await expect(page.locator('.completion')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Focused on' })).toHaveCount(0);
  await expect(page.locator('.cell.focused')).toHaveCount(0);
});

test('the focused number enters into an empty cell, whose key then reads as Enter with no pressed state', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, filled).click();
  const target = game.values.findIndex((v, i) => !v && game.solution[i] === digit);
  await cell(page, target).click();
  const key = page.locator('.number-key').nth(digit - 1);
  await expect(key).not.toHaveAttribute('aria-pressed');
  await key.click();
  await expect(cell(page, target).locator('.cell-number')).toHaveText(String(digit));
  await expect(lit(page)).toHaveText(String(digit));
});

test('a focused wrong answer stays red, and the lit key dims while paused', async ({ page }) => {
  const wrongAt = game.values.findIndex(v => !v);
  const wrong = game.solution[wrongAt] % 9 + 1;
  const saved = { ...game, values: game.values.map((v, i) => i === wrongAt ? wrong : v), notes: game.notes.map((n, i) => i === wrongAt ? [] : n), noteOrigins: game.noteOrigins.map((o, i) => i === wrongAt ? null : o) };
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(saved)]);
  await openGame(page);
  await cell(page, wrongAt).click();
  expect(await settled(page.locator('.cell.focused.conflict .cell-number'), 'color')).toBe(await resolved(page, '--red'));
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(lit(page)).toHaveCSS('opacity', '0.42');
});

test('applying a hint that only removes candidates leaves focus alone', async ({ page }) => {
  const saved = gameBefore(step => !step.placement);
  const start = JSON.parse(saved).values.findIndex((v: number) => v);
  const kept = JSON.parse(saved).values[start];
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, saved]);
  await openGame(page);
  await cell(page, start).click();
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await page.locator('.hint-action').click();
  await page.locator('.hint-action').click();
  await page.locator('.walk-panel').waitFor();
  await stepToEnd(page);
  await page.locator('.hint-action').click();
  await expect(page.locator('.walk-panel')).toHaveCount(0);
  await expect(lit(page)).toHaveText(String(kept));
});

test('holding a filled cell during a selection focuses its number and keeps the selection', async ({ page }) => {
  await seed(page);
  await openGame(page);
  const pair = game.values.findIndex((v, i) => !v && i % 9 < 8 && !game.values[i + 1]);
  const [from, to] = await Promise.all([cell(page, pair).boundingBox(), cell(page, pair + 1).boundingBox()]);
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 5 });
  await page.mouse.up();
  const selected = page.getByRole('status').filter({ hasText: '2 cells selected' });
  await expect(selected).toHaveCount(1);
  const box = await cell(page, filled).boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(lit(page)).toHaveText(String(digit));
  await page.mouse.up();
  await expect(selected).toHaveCount(1);
});

test('a focused number that is finished or not allowed here keeps its dim digit inside a blue outline', async ({ page }) => {
  const full = game.values.map((v, i) => game.solution[i] === digit ? digit : v);
  const saved = { ...game, values: full, notes: game.notes.map((n, i) => full[i] ? [] : n), noteOrigins: game.noteOrigins.map((o, i) => full[i] ? null : o) };
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(saved)]);
  await openGame(page);
  await cell(page, full.indexOf(digit)).click();
  await expect(lit(page)).toHaveClass(/digit-finished/);
  await expect(lit(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(lit(page)).toHaveCSS('box-shadow', new RegExp(`${(await resolved(page, '--blue')).replace(/[()]/g, '\\$&')}.*inset`));
  await expect(lit(page).locator('span')).toHaveCSS('opacity', '0.35');
  await cell(page, full.indexOf(0)).click();
  await expect(lit(page)).toHaveClass(/digit-finished.*digit-filtered/);
  expect(await settled(lit(page).locator('span'), 'opacity')).toBe('0.35');
  await lit(page).hover();
  await expect(lit(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const other = full.find(v => v && v !== digit)!;
  const blocked = full.findIndex((v, i) => !v && game.notes[i].length && !getPlayableCandidates({ values: full, exclusions: game.exclusions })[i].has(other));
  await cell(page, full.indexOf(other)).click();
  await cell(page, blocked).click();
  await expect(lit(page)).toHaveClass(/digit-filtered/);
  await expect(lit(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(lit(page).locator('span')).toHaveCSS('opacity', '0.65');
});

test('holding Enter on the lit key toggles focus once', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, filled).click();
  await lit(page).focus();
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(lit(page)).toHaveCount(0);
});

test('undo and redo leave focus alone', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, empty).click();
  await page.keyboard.press(String(other));
  await expect(lit(page)).toHaveText(String(other));
  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, empty).locator('.cell-number')).toHaveCount(0);
  await expect(lit(page)).toHaveText(String(other));
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(lit(page)).toHaveText(String(other));
});

test('a mistake hint on a focused number shows only its red ring', async ({ page }) => {
  const prefs = { ...DEFAULT_PREFS, blockIncorrectAnswers: false };
  await page.addInitScript(([saveKey, saved, prefsKey, preferences]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(saveKey, saved); localStorage.setItem(prefsKey, preferences); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(base), PREFS_KEY, JSON.stringify(prefs)]);
  await openGame(page);
  const at = base.givens.findIndex(v => !v);
  const wrong = base.solution[at] % 9 + 1;
  await cell(page, at).click();
  await page.keyboard.press(String(wrong));
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await page.locator('.hint-action').click();
  const mistake = cell(page, at);
  await expect(mistake).toHaveClass(/hint-mistake/);
  await expect(mistake).toHaveClass(/focused/);
  await expect.poll(() => mistake.evaluate(el => getComputedStyle(el, '::after').boxShadow)).toBe('none');
  await expect(mistake.locator('.cell-number')).toHaveCSS('font-weight', '430');
});

test('a key-set focus announcement does not come back on the next puzzle', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, filled).click();
  await page.keyboard.press(String(other));
  await expect(page.getByRole('status').filter({ hasText: `Focused on ${other}` })).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'New puzzle' }).click();
  await page.getByRole('button', { name: 'Start puzzle' }).click();
  await expect(page.locator('.board .cell').first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Focused on' })).toHaveCount(0);
});

test('selecting a cell silences an earlier key-set focus announcement', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, filled).click();
  await page.keyboard.press(String(other));
  await expect(page.getByRole('status').filter({ hasText: `Focused on ${other}` })).toHaveCount(1);
  await cell(page, filled).click();
  await expect(lit(page)).toHaveText(String(digit));
  await expect(page.getByRole('status').filter({ hasText: 'Focused on' })).toHaveCount(0);
});

const keySetFocusOnEmpty = async (page: Page) => {
  const peer = Array.from({ length: 81 }, (_, i) => i).find(i => i !== empty && Math.floor(i / 9) === Math.floor(empty / 9) && game.values[i])!;
  const dimmed = game.values[peer];
  await cell(page, empty).click();
  await page.getByRole('button', { name: 'Numbers', exact: true }).click();
  await page.locator('.number-key').nth(dimmed - 1).click();
  await expect(page.getByRole('status').filter({ hasText: `Focused on ${dimmed}` })).toHaveCount(1);
};

test('placing a number silences an earlier key-set focus announcement', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await keySetFocusOnEmpty(page);
  await page.keyboard.press(String(other));
  await expect(cell(page, empty).locator('.cell-number')).toHaveText(String(other));
  await expect(page.getByRole('status').filter({ hasText: 'Focused on' })).toHaveCount(0);
});

test('applying a hint silences an earlier key-set focus announcement', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await keySetFocusOnEmpty(page);
  await page.getByRole('button', { name: 'Show a hint' }).click();
  const action = page.locator('.hint-strip .hint-action');
  await expect(async () => { await page.keyboard.press('h'); await expect(action).toHaveText('Apply', { timeout: 500 }); }).toPass();
  await expect(async () => { if (await action.count()) await action.click(); await expect(action).toHaveCount(0, { timeout: 500 }); }).toPass();
  await expect(page.getByRole('status').filter({ hasText: 'Focused on' })).toHaveCount(0);
});

test('Home removes the retired focus-hold storage key', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sudoku.focus-hold-learned.v1', '1'); sessionStorage.setItem('seeded', '1'); } });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sudoku.focus-hold-learned.v1'))).toBeNull();
});
