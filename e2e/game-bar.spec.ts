import { expect, test } from '@playwright/test';
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
