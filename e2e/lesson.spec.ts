import { expect, test, type Page } from '@playwright/test';
import { gameBefore } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { LESSON_BANK } from '../src/lib/lesson-bank.ts';
import { LEARNED_KEY, lessonOf, practiceGame } from '../src/lib/lessons.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';
import { allSteps } from '../src/lib/steps.ts';

const pointingGame = gameBefore(step => lessonOf(step) === 'pointing');
/** The crossings-out that answer practice board `board` of the pointing lesson. */
const answer = (board: number) => {
  const game = practiceGame(LESSON_BANK.pointing[board], board);
  return allSteps(game.values, getPlayableCandidates(game), 'locked-candidates').find(step => lessonOf(step) === 'pointing')!.eliminations;
};
const footer = (page: Page) => page.locator('.lesson-footer');
const prompt = (page: Page) => page.locator('.lesson-prompt');
const saved = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);

async function openLesson(page: Page) {
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, pointingGame]);
  await page.goto('/');
  await page.locator('.board .cell').first().waitFor();
  const before = await saved(page, SAVE_KEY);
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await page.locator('.hint-action').click();
  await page.locator('.hint-action').click();
  while (await page.getByRole('button', { name: 'Next step' }).isEnabled()) await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Learn pointing pair ›' }).click();
  await expect(page.locator('.lesson-title strong')).toHaveText('Pointing pair');
  return before;
}
async function crossOut(page: Page, marks: { cell: number; digit: number }[]) {
  for (const { cell, digit } of marks) {
    await page.locator(`.board [data-index="${cell}"]`).click();
    await page.keyboard.press(String(digit));
  }
}

test('a lesson opens from the last hint step, and leaving it restores the untouched game', async ({ page }) => {
  const before = await openLesson(page);
  await expect(prompt(page)).toHaveText('Pointing pair');
  await expect(footer(page)).toHaveText('Start practice');
  await page.getByRole('button', { name: 'Your game' }).click();
  await expect(page.locator('.lesson-bar')).toHaveCount(0);
  await expect(page.locator('.app-bar .brand')).toBeVisible();
  expect(await saved(page, SAVE_KEY)).toBe(before);
});

test('the right move on a practice board is graded right, then Next board', async ({ page }) => {
  await openLesson(page);
  await footer(page).click();
  await expect(prompt(page)).toHaveText('Find the pointing pair');
  await expect(footer(page)).toBeDisabled();
  await crossOut(page, answer(1));
  await footer(page).click();
  await expect(prompt(page)).toHaveText('That’s the pointing pair');
  await expect(footer(page)).toHaveText('Next board');
  await footer(page).click();
  await expect(prompt(page)).toHaveText('Find the pointing pair');
  await expect(page.locator('.lesson-dots i.done')).toHaveCount(1);
});

test('a wrong move shows the walkthrough, and Try again restores the board', async ({ page }) => {
  await openLesson(page);
  await footer(page).click();
  const target = answer(1)[0];
  const board = practiceGame(LESSON_BANK.pointing[1], 1);
  const wrongCell = board.values.findIndex((v, i) => !v && i !== target.cell && getPlayableCandidates(board)[i].size > 1);
  const wrongDigit = [...getPlayableCandidates(board)[wrongCell]].find(d => d !== board.solution[wrongCell])!;
  await crossOut(page, [{ cell: wrongCell, digit: wrongDigit }]);
  await footer(page).click();
  await expect(prompt(page)).toHaveText('Not quite');
  await expect(page.locator('.walk-panel')).toBeVisible();
  await expect(page.locator(`.board [data-index="${wrongCell}"]`)).not.toHaveAttribute('aria-label', new RegExp(`ruled out.*${wrongDigit}`));
  await footer(page).click();
  await expect(prompt(page)).toHaveText('Find the pointing pair');
  await expect(page.locator('.walk-panel')).toHaveCount(0);
});

test('finishing every practice board marks the lesson learned', async ({ page }) => {
  await openLesson(page);
  await footer(page).click();
  const boards = LESSON_BANK.pointing.length - 1;
  for (let board = 1; board <= boards; board++) {
    await crossOut(page, answer(board));
    await footer(page).click();
    await expect(prompt(page)).toHaveText('That’s the pointing pair');
    await footer(page).click();
  }
  await expect(page.locator('.lesson-done h2')).toHaveText('Pointing pair learned');
  expect(JSON.parse(await saved(page, LEARNED_KEY) ?? '{}')).toHaveProperty('pointing');
  await page.getByRole('button', { name: 'Back to your game' }).click();
  await expect(page.locator('.app-bar .brand')).toBeVisible();
});

test('the game timer does not run during a lesson', async ({ page }) => {
  await openLesson(page);
  const clock = () => page.evaluate(() => JSON.parse(localStorage.getItem('sudoku.clock.v1') ?? '{}').seconds as number);
  const start = await clock();
  await page.waitForTimeout(2500);
  expect(await clock()).toBeCloseTo(start, 0);
});
