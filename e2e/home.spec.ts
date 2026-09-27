import { expect, test, type Page } from '@playwright/test';
import { gameBefore } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { lessonOf } from '../src/lib/lessons.ts';

const inProgress = gameBefore(step => lessonOf(step) === 'pointing');
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
const seed = (page: Page, game: string) => page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, game]);

test('a first visit offers the four difficulties and the first lesson, and starts a puzzle on request', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pick your first puzzle' })).toBeVisible();
  await expect(page.locator('.board')).toHaveCount(0);
  await expect(page.locator('.home-lesson strong')).toHaveText('Start with: Naked single');
  await page.getByRole('button', { name: /^New easy puzzle/ }).click();
  await expect(page.locator('.board .cell').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
});

test('the app opens on Home with the game waiting, and Home is one tap away from the game', async ({ page }) => {
  await seed(page, inProgress);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Expert puzzle' })).toBeVisible();
  const before = await saved(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.board')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  expect(JSON.parse(await saved(page) ?? 'null')).toEqual(JSON.parse(before ?? 'null'));
});

test('a new puzzle from Home asks before replacing the game in progress', async ({ page }) => {
  await seed(page, inProgress);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  const before = await saved(page);
  await page.getByRole('button', { name: 'New hard puzzle' }).click();
  await expect(page.locator('.replacement-note')).toBeVisible();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  expect(JSON.parse(await saved(page) ?? 'null')).toEqual(JSON.parse(before ?? 'null'));
});

test('the next lesson opens from Home and returns there', async ({ page }) => {
  await seed(page, inProgress);
  await page.goto('/');
  await page.locator('.home-lesson').click();
  await expect(page.locator('.lesson-title strong')).toHaveText('Naked single');
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.locator('.home-lesson')).toBeFocused();
});

test('a finished game shows as solved with Play another', async ({ page }) => {
  const game = JSON.parse(inProgress);
  await seed(page, JSON.stringify({ ...game, values: game.solution }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Play another' })).toBeVisible();
  await expect(page.locator('.home-eyebrow.solved')).toHaveText('Solved');
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
});

test('the game timer does not run on Home', async ({ page }) => {
  await seed(page, inProgress);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Home' }).click();
  const seconds = () => page.evaluate(() => JSON.parse(localStorage.getItem('sudoku.clock.v1') ?? '{}').seconds as number);
  const start = await seconds();
  await page.waitForTimeout(2500);
  expect(await seconds()).toBeCloseTo(start, 0);
});
