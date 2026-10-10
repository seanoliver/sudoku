import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';

const game = JSON.stringify(createGame(createPuzzle('medium', 7)));
const sheet = (page: Page) => page.locator('dialog.sheet');
const settings = (page: Page) => page.getByRole('button', { name: 'Settings' });
const openSettings = async (page: Page) => { await settings(page).click(); await expect(sheet(page)).toBeVisible(); };
/** Moves the pointer in small steps about one frame apart, as a slow finger does, so the release is not read as a flick. */
const slowDrag = async (page: Page, x: number, y: number, by: number) => { for (let k = 1; k <= 8; k++) { await page.mouse.move(x, y + by * k / 8); await page.waitForTimeout(16); } };
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

const handleCenter = async (page: Page) => { const box = (await page.locator('.sheet-handle').boundingBox())!; return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; };

test('dragging the handle far enough closes the sheet', async ({ page }) => {
  await openSettings(page);
  const { x, y } = await handleCenter(page);
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, y + 200, { steps: 10 }); await page.mouse.up();
  await expect(sheet(page)).toBeHidden();
});

test('a short, slow drag springs the sheet back', async ({ page }) => {
  await openSettings(page);
  const { x, y } = await handleCenter(page);
  await page.mouse.move(x, y); await page.mouse.down();
  await slowDrag(page, x, y, 40); await page.mouse.up();
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page)).not.toHaveAttribute('data-closing', '');
  expect(await sheet(page).evaluate(element => (element as HTMLElement).style.translate)).toBe('');
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
    await expect.poll(() => sheet(page).evaluate(element => element.getAnimations().length)).toBe(0);
    const handle = (await page.locator('.sheet-handle').boundingBox())!;
    const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await slowDrag(page, x, y, 40); await page.mouse.up();
    expect(await sheet(page).evaluate(element => element.getAnimations().filter(animation => animation instanceof CSSAnimation).length)).toBe(0);
  });
});

test('dragging still works after a trip to Learn and back', async ({ page }) => {
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: /All techniques/ }).click();
  await page.locator('.lesson-back').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await openSettings(page);
  const handle = (await page.locator('.sheet-handle').boundingBox())!;
  const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, y + 200, { steps: 10 }); await page.mouse.up();
  await expect(sheet(page)).toBeHidden();
});

test('a closing sheet ignores taps', async ({ page }) => {
  await openSettings(page);
  await sheet(page).evaluate(element => { (element as HTMLElement).dataset.closing = ''; });
  expect(await sheet(page).evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
});

test.describe('with motion on, the shrunk game', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('keeps its own background over the black page', async ({ page }) => {
    await openSettings(page);
    await expect.poll(() => appScale(page)).toBe('0.93');
    const canvas = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--canvas'));
    expect(canvas.trim()).not.toBe('');
    expect(await page.locator('.app').evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test('Settings ends with How to play and Privacy rows, and each opens in the sheet', async ({ page }) => {
  await openSettings(page);
  await expect(page.getByRole('switch', { name: 'Haptics' })).toHaveCount(0);
  const about = page.getByRole('group', { name: 'About' });
  await about.getByRole('button', { name: 'Privacy' }).click();
  await expect(page.locator('#sheet-title')).toHaveText('Privacy');
  await expect(page.locator('.sheet-close')).toBeFocused();
  await expect(sheet(page).getByRole('link', { name: "the project's GitHub issues" })).toHaveAttribute('href', 'https://github.com/seanoliver/sudoku/issues');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await openSettings(page);
  await about.getByRole('button', { name: 'How to play' }).click();
  await expect(page.locator('#sheet-title')).toHaveText('Nine numbers. One rule.');
});
