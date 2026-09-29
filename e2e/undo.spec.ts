import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
import { createGame, toggleNotes, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';

const fresh = createGame(createPuzzle('medium', 7));
const cells = fresh.values.flatMap((v, i) => v ? [] : [i]).slice(0, 4);
const noted = toggleNotes(fresh, { indices: cells, value: 5 });
const seed = (page: Page, game = noted) => page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(game)]);
const undoButton = (page: Page) => page.getByRole('button', { name: 'Undo', exact: true });
const redoButton = (page: Page) => page.getByRole('button', { name: 'Redo', exact: true });
const flashed = (page: Page) => page.locator('.board .cell .undo-flash').evaluateAll(els => els.map(el => Number(el.closest('.cell')!.getAttribute('data-index'))));

test('Undo, Erase, and Redo sit in one row under the modes, and start disabled without history', async ({ page }) => {
  await seed(page, fresh);
  await openGame(page);
  const [undo, erase, redo, exclude] = await Promise.all([undoButton(page), page.getByRole('button', { name: 'Erase' }), redoButton(page), page.locator('.mode-option.mode-exclude')].map(l => l.boundingBox()));
  expect(Math.abs(undo!.y - erase!.y)).toBeLessThan(1);
  expect(Math.abs(erase!.y - redo!.y)).toBeLessThan(1);
  expect(undo!.x).toBeLessThan(erase!.x);
  expect(erase!.x).toBeLessThan(redo!.x);
  expect(undo!.y).toBeGreaterThan(exclude!.y);
  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeDisabled();
});

test('Undo outlines the cells and describes the action in the focus bar, then the bar returns', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await undoButton(page).click();
  expect(await flashed(page)).toEqual(cells);
  await expect(page.locator('.board .cell .undo-flash.undo-notes')).toHaveCount(4);
  const summary = page.locator('.digit-focus-bar .undo-summary.undo-notes');
  await expect(summary).toBeVisible();
  await expect(summary.locator('.undo-kind')).toHaveText('4');
  await expect(summary.locator('.undo-mini .on')).toHaveCount(4);
  await expect(page.getByRole('status').filter({ hasText: 'Undid notes in 4 cells' })).toHaveCount(1);
  await expect(redoButton(page)).toBeEnabled();
  await expect(page.locator('.board .cell .undo-flash')).toHaveCount(0, { timeout: 2500 });
  await expect(summary).toHaveCount(0, { timeout: 2500 });
  await expect(page.locator('.focus-button')).toBeVisible();
});

test('Redo describes the same action with the redo arrow and restores the notes', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(page.getByRole('status').filter({ hasText: 'Redid notes in 4 cells' })).toHaveCount(1);
  expect(await flashed(page)).toEqual(cells);
  await expect(page.locator(`.board [data-index="${cells[0]}"]`)).toHaveAccessibleName(/notes 5/);
  await expect(redoButton(page)).toBeDisabled();
});

test('a second undo on the same cells restarts the outline', async ({ page }) => {
  await seed(page, toggleNotes(noted, { indices: cells, value: 6 }));
  await openGame(page);
  await undoButton(page).click();
  const first = await page.locator('.board .cell .undo-flash').first().elementHandle();
  await undoButton(page).click();
  await expect(page.locator('.board .cell .undo-flash')).toHaveCount(4);
  expect(await first!.evaluate(el => el.isConnected)).toBe(false);
});

test('the next edit clears the description right away', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await undoButton(page).click();
  await expect(page.locator('.undo-summary')).toBeVisible();
  await page.locator(`.board [data-index="${cells[0]}"]`).click();
  await page.keyboard.press('3');
  await expect(page.locator('.undo-summary')).toHaveCount(0);
  await expect(page.locator('.board .cell .undo-flash')).toHaveCount(0);
});

test('Settings no longer has Undo or Redo', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('.sheet .puzzle-action')).toHaveText(['New puzzle', 'Restart puzzle', 'Fill notes']);
});

test('the mini-board is hidden on short screens, where the bar is 36px tall', async ({ page }) => {
  await page.setViewportSize({ width: 466, height: 590 });
  await seed(page);
  await openGame(page);
  await undoButton(page).click();
  await expect(page.locator('.undo-summary .undo-kind')).toBeVisible();
  await expect(page.locator('.undo-summary .undo-mini')).toBeHidden();
});
