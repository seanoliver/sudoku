import { expect, test, type Page } from '@playwright/test';
import { gameBefore, openGame } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { lessonOf } from '../src/lib/lessons.ts';

const game = gameBefore(step => lessonOf(step) === 'pointing');

test('the game bar hint button is disabled while the game is paused', async ({ page }) => {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, game]);
  await openGame(page);
  const hint = page.locator('.game-bar').getByRole('button', { name: 'Show a hint' });
  await expect(hint).toBeEnabled();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(hint).toBeDisabled();
  await page.getByRole('button', { name: 'Resume game' }).click();
  await expect(hint).toBeEnabled();
});

const seed = (page: Page) => page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, game]);

test('the game bar holds Home, the difficulty and timer, hint, and Settings in order, in one row', async ({ page }) => {
  await seed(page);
  await openGame(page);
  const bar = page.locator('.game-bar');
  const boxes = await Promise.all(['Home', /^Difficulty/, 'Pause game', 'Show a hint', 'Settings'].map(name => bar.getByRole('button', { name }).boundingBox()));
  for (let k = 1; k < boxes.length; k++) expect(boxes[k]!.x).toBeGreaterThan(boxes[k - 1]!.x);
  const middle = (b: { y: number; height: number }) => b.y + b.height / 2;
  for (const b of boxes) expect(Math.abs(middle(b!) - middle(boxes[0]!))).toBeLessThan(4);
  await expect(page.getByRole('button', { name: /Install app/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Sudoku', exact: true })).toHaveCount(1);
});

test('the hint button in the bar opens the hint strip', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await page.locator('.game-bar').getByRole('button', { name: 'Show a hint' }).click();
  await expect(page.locator('.digit-focus-bar.hint-strip')).toBeVisible();
});

test('on a tall phone the content is centered under the bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await openGame(page);
  const [bar, top, bottom] = await Promise.all(['.game-bar', '.puzzle-panel', '.controls-area'].map(async s => (await page.locator(s).boundingBox())!));
  const above = top.y - (bar.y + bar.height), below = 844 - (bottom.y + bottom.height);
  expect(Math.abs(above - below)).toBeLessThan(24);
});
