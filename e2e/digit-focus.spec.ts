import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
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
