import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';

const game = JSON.stringify(createGame(createPuzzle('medium', 7)));
const sheet = (page: Page) => page.locator('dialog.sheet');
const settings = (page: Page) => page.getByRole('button', { name: 'Settings' });
const openSettings = async (page: Page) => { await settings(page).click(); await expect(sheet(page)).toBeVisible(); };
const appScale = (page: Page) => page.locator('.app').evaluate(element => getComputedStyle(element).scale);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, game]);
  await openGame(page);
});

test('the close button closes Settings and returns focus to the gear that opened it', async ({ page }) => {
  await settings(page).focus();
  await page.keyboard.press('Enter');
  await expect(sheet(page)).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(settings(page)).toBeFocused();
});

test('Escape plays the exit, and a second Escape closes at once', async ({ page }) => {
  await openSettings(page);
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toHaveAttribute('data-closing', '');
  await expect(sheet(page)).toBeHidden();
  await openSettings(page);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  expect(await sheet(page).evaluate(element => (element as HTMLDialogElement).open)).toBe(false);
});

test('a tap on the dimmed background closes the sheet', async ({ page }) => {
  await openSettings(page);
  await page.mouse.click(195, 20);
  await expect(sheet(page)).toBeHidden();
});

test('dragging the handle far enough closes the sheet, and a short drag springs back', async ({ page }) => {
  await openSettings(page);
  const handle = (await page.locator('.sheet-handle').boundingBox())!;
  const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, y + 40, { steps: 8 }); await page.mouse.up();
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page)).not.toHaveAttribute('data-closing', '');
  expect(await sheet(page).evaluate(element => (element as HTMLElement).style.translate)).toBe('');
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, y + 200, { steps: 10 }); await page.mouse.up();
  await expect(sheet(page)).toBeHidden();
});

test('Restart from Settings becomes a centered alert', async ({ page }) => {
  await openSettings(page);
  await expect(page.getByText('Choose a new puzzle or start this one over.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Restart puzzle' }).click();
  await expect(sheet(page)).toHaveAttribute('data-kind', 'restart');
  const box = (await sheet(page).boundingBox())!, view = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - view.width / 2)).toBeLessThan(2);
  expect(Math.abs(box.y + box.height / 2 - view.height / 2)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect(sheet(page)).toBeHidden();
});

test('with reduced motion the game behind a sheet keeps its size', async ({ page }) => {
  await openSettings(page);
  expect(await appScale(page)).toBe('none');
});

test.describe('with motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the game shrinks behind a card sheet and returns after it closes; it stays full size behind the alert', async ({ page }) => {
    await openSettings(page);
    await expect.poll(() => appScale(page)).toBe('0.93');
    await page.getByRole('button', { name: 'Restart puzzle' }).click();
    await expect.poll(() => appScale(page)).toBe('none');
    await page.getByRole('button', { name: 'Keep playing' }).click();
    await expect(sheet(page)).toBeHidden();
    await openSettings(page);
    await page.keyboard.press('Escape');
    await expect(sheet(page)).toBeHidden();
    await expect.poll(() => appScale(page)).toBe('none');
  });
});

test.describe('with motion on, a short drag', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('springs the sheet back without replaying its rise', async ({ page }) => {
    await openSettings(page);
    await page.waitForTimeout(500);
    const handle = (await page.locator('.sheet-handle').boundingBox())!;
    const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x, y + 40, { steps: 8 }); await page.mouse.up();
    expect(await sheet(page).evaluate(element => element.getAnimations().filter(animation => animation instanceof CSSAnimation).length)).toBe(0);
  });
});
