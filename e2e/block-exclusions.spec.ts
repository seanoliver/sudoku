import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { peers } from '../src/lib/sudoku.ts';
import { PREFS_KEY, DEFAULT_PREFS } from '../src/lib/preferences.ts';

const game = createGame(createPuzzle('medium', 7));
const a = game.values.findIndex((v, i) => !v && i % 9 < 8 && !game.values[i + 1]);
const b = a + 1;
const answer = game.solution[a];
const wrong = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(d => d !== answer && !peers(a).some(p => game.values[p] === d))!;
const seed = (page: Page, prefs = DEFAULT_PREFS) => page.addInitScript(([key, value, prefsKey, prefsValue]) => { localStorage.setItem(key, value); localStorage.setItem(prefsKey, prefsValue); }, [SAVE_KEY, JSON.stringify(game), PREFS_KEY, JSON.stringify(prefs)]);
const cell = (page: Page, i: number) => page.locator(`.board [data-index="${i}"]`);
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).exclusions as number[][], SAVE_KEY);

test('crossing out a cell’s answer is rejected like a wrong number', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await page.keyboard.press('x');
  await page.keyboard.press(String(answer));
  await expect(cell(page, a)).toHaveClass(/rejecting/);
  await expect(page.getByRole('status').filter({ hasText: `${answer} rejected, it is the answer for this cell` })).toHaveCount(1);
  expect((await saved(page))[a]).toEqual([]);
  await page.keyboard.press(String(wrong));
  await expect(cell(page, a)).toHaveAccessibleName(new RegExp(`ruled out ${wrong}`));
});

test('with Block incorrect answers off, the answer can be crossed out', async ({ page }) => {
  await seed(page, { ...DEFAULT_PREFS, blockIncorrectAnswers: false });
  await openGame(page);
  await cell(page, a).click();
  await page.keyboard.press('x');
  await page.keyboard.press(String(answer));
  await expect(cell(page, a)).toHaveAccessibleName(new RegExp(`ruled out ${answer}`));
});

test('a batch that would cross out an answer is refused whole, and marks that cell', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await page.getByRole('button', { name: 'Exclude', exact: true }).click();
  const [from, to] = await Promise.all([cell(page, a).boundingBox(), cell(page, b).boundingBox()]);
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('status').filter({ hasText: '2 cells selected' })).toHaveCount(1);
  await page.keyboard.press(String(answer));
  await expect(cell(page, a)).toHaveClass(/rejecting/);
  await expect(cell(page, b)).not.toHaveClass(/rejecting/);
  const exclusions = await saved(page);
  expect([exclusions[a], exclusions[b]]).toEqual([[], []]);
});
