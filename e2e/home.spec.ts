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
  await expect(page.locator('.home-foot')).toHaveText('1 puzzle solved');
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

test('a save that cannot be restored says so on Home', async ({ page }) => {
  await seed(page, '{"not":"a game"}');
  await page.goto('/');
  await expect(page.locator('.notice[role="alert"]')).toContainText('could not be restored');
  await expect(page.getByRole('heading', { name: 'Pick your first puzzle' })).toBeVisible();
});

const almostSolved = () => {
  const game = JSON.parse(inProgress);
  const last = game.givens.findIndex((v: number) => !v);
  const values = game.solution.map((v: number, i: number) => i === last ? 0 : v);
  return { game: JSON.stringify({ ...game, values, notes: game.notes.map(() => []), exclusions: game.exclusions.map(() => []), noteOrigins: game.noteOrigins.map(() => null), history: [], redoHistory: [] }), last, digit: game.solution[last] as number };
};

test('solving a puzzle of any difficulty adds to the solved count on Home', async ({ page }) => {
  const { game, last, digit } = almostSolved();
  await seed(page, game);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator(`.board [data-index="${last}"]`).click();
  await page.keyboard.press(String(digit));
  await expect(page.locator('.completion')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.locator('.home-foot')).toHaveText('1 puzzle solved');
});

test('restarting from Home’s settings resets the time', async ({ page }) => {
  await seed(page, inProgress);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^Restart/ }).first().click();
  await page.getByRole('button', { name: /^Restart/ }).last().click();
  await expect(page.locator('.home-continue .home-meta')).toContainText('00:00');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.clock')).toHaveText(/^00:0[01]$/);
});

test('Home is out of reach while a new puzzle is generating', async ({ page }) => {
  await page.addInitScript(() => {
    const Real = window.Worker;
    window.Worker = class extends Real {
      set onmessage(handler: ((event: MessageEvent) => void) | null) { super.onmessage = handler && (event => setTimeout(() => handler.call(this, event), 1500)); }
      get onmessage() { return super.onmessage; }
    } as typeof Worker;
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^New easy puzzle/ }).click();
  await expect(page.getByRole('button', { name: 'Home' })).toBeDisabled();
  await expect(page.locator('.board .cell').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Home' })).toBeEnabled();
});

test('continuing into a paused game puts focus on Resume', async ({ page }) => {
  await seed(page, inProgress);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.board-cover button')).toBeFocused();
});

test('a puzzle started from Home takes the keyboard at once', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^New easy puzzle/ }).click();
  await expect(page.locator('.board .cell').first()).toBeVisible();
  await expect(page.locator('.board .cell:focus')).toHaveCount(1);
  const first = await page.locator('.board .cell:focus').getAttribute('data-index');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.board .cell:focus')).not.toHaveAttribute('data-index', first ?? '');
});

test('a puzzle started from Home over a game in progress takes the keyboard too', async ({ page }) => {
  await seed(page, inProgress);
  await page.goto('/');
  await page.getByRole('button', { name: 'New easy puzzle' }).click();
  await page.getByRole('button', { name: 'Start puzzle' }).click();
  await expect(page.locator('.board .cell:focus')).toHaveCount(1);
});
