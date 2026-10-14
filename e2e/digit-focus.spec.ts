import { expect, test, type Page } from '@playwright/test';
import { gameBefore, openGame, stepToEnd } from './fixtures.ts';
import { nextHint } from '../src/lib/hints.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';

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

test('selecting a filled cell lights its key, rings its matches, and marks its notes', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, empty).click();
  await expect(lit(page)).toHaveCount(0);
  await cell(page, filled).click();
  await expect(lit(page)).toHaveText(String(digit));
  await expect(lit(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: `Focused on ${digit}` })).toHaveCount(1);
  await expect(page.locator('.cell.focused')).toHaveCount(game.values.filter(v => v === digit).length);
  await expect(cell(page, empty).locator(`.note-digit.note-focused[data-digit="${digit}"]`)).toHaveCount(1);
});

test('focus stays on an empty cell, moves to a placed number, and Notes leaves it alone', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, filled).click();
  await cell(page, empty).click();
  await expect(lit(page)).toHaveText(String(digit));
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
  await expect(page.locator('.cell.focused')).toHaveCount(0);
  await page.locator('.number-key').nth(digit - 1).click();
  await expect(lit(page)).toHaveText(String(digit));
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
  const blue = await page.evaluate(() => { const probe = document.createElement('i'); probe.style.color = 'var(--blue)'; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; });
  await expect(lit(page)).toHaveCSS('background-color', blue);
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
});
