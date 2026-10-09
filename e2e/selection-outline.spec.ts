import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { peers } from '../src/lib/sudoku.ts';

const game = createGame(createPuzzle('medium', 7));
const empty = (i: number) => !game.values[i];
const start = game.values.findIndex((_, i) => i % 9 <= 6 && i < 72 && [i, i + 1, i + 2, i + 11].every(empty));
const shape = [start, start + 1, start + 2, start + 11];
const target = game.values.findIndex((v, i) => !v && i > 30);
const wrong = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(d => d !== game.solution[target] && !peers(target).some(p => game.values[p] === d))!;

const seed = (page: Page) => page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(game)]);
const cell = (page: Page, i: number) => page.locator(`.board [data-index="${i}"]`);
const outline = (page: Page, i: number) => cell(page, i).locator('xpath=following-sibling::*[contains(@class, "selection-outline")]');
const center = async (page: Page, i: number) => { const box = (await cell(page, i).boundingBox())!; return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; };

test.beforeEach(async ({ page }) => { await seed(page); await openGame(page); });

test('one outline follows the selected cell, without moving under reduced motion', async ({ page }) => {
  await cell(page, target).click();
  await expect(page.locator('.board .selection-outline')).toHaveCount(1);
  await expect(outline(page, target)).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(outline(page, target + 1)).toHaveCount(1);
  await expect(page.locator('.board .selection-outline')).toHaveCount(1);
  expect(await outline(page, target + 1).evaluate(element => getComputedStyle(element).transform)).toBe('none');
});

test('a drag selection draws one outline around the group', async ({ page }) => {
  const points = await Promise.all(shape.map(i => center(page, i)));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByRole('status').filter({ hasText: '4 cells selected' })).toHaveCount(1);
  const sides = await Promise.all(shape.map(i => outline(page, i).getAttribute('class')));
  const drawn = sides.map(name => ['top', 'right', 'bottom', 'left'].filter(side => name!.includes(`edge-${side}`)));
  expect(drawn).toEqual([['top', 'bottom', 'left'], ['top', 'bottom'], ['top', 'right'], ['right', 'bottom', 'left']]);
});

test('a rejected entry turns the outline red', async ({ page }) => {
  await cell(page, target).click();
  const red = await page.evaluate(() => { const probe = document.createElement('i'); probe.style.color = 'var(--red)'; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; });
  await expect(outline(page, target)).not.toHaveCSS('border-top-color', red);
  await page.keyboard.press(String(wrong));
  await expect(cell(page, target)).toHaveClass(/rejecting/);
  await expect(outline(page, target)).toHaveCSS('border-top-color', red);
});

test('number keys still enter digits, and the placed number scales in', async ({ page }) => {
  await cell(page, target).click();
  await page.getByRole('button', { name: `Enter ${game.solution[target]}`, exact: true }).click();
  await expect(cell(page, target).locator('.cell-number')).toHaveText(String(game.solution[target]));
  await expect(cell(page, target).locator('.cell-number')).toHaveClass(/placed/);
  await expect(cell(page, target).locator('.cell-number')).toHaveCSS('transform', 'none');
});
