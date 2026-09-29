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
const cell = (page: Page, index: number) => page.locator(`.board [data-index="${index}"]`);

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

test('Undo and Redo buttons take back and restore an action, and announce it', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await undoButton(page).click();
  await expect(cell(page, cells[0])).not.toHaveAccessibleName(/notes 5/);
  await expect(page.getByRole('status').filter({ hasText: 'Undid notes in 4 cells' })).toHaveCount(1);
  await expect(undoButton(page)).toBeDisabled();
  await redoButton(page).click();
  await expect(cell(page, cells[0])).toHaveAccessibleName(/notes 5/);
  await expect(page.getByRole('status').filter({ hasText: 'Redid notes in 4 cells' })).toHaveCount(1);
  await expect(redoButton(page)).toBeDisabled();
});

test('Settings no longer has Undo or Redo', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('.sheet .puzzle-action')).toHaveText(['New puzzle', 'Restart puzzle', 'Fill notes']);
});
