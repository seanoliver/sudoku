import { expect, test, type Page } from '@playwright/test';
import { gameBefore } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { lessonOf } from '../src/lib/lessons.ts';

const inProgress = gameBefore(step => lessonOf(step) === 'pointing');
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
const seed = (page: Page) => page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, inProgress]);
const onHome = (page: Page) => expect(page.getByRole('heading', { name: /^Your \w+ puzzle/ })).toBeVisible();
const inGame = (page: Page) => expect(page.locator('.board')).toBeVisible();

test('back from the game returns to Home with the game untouched, and forward returns to it', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await inGame(page);
  const before = await saved(page);
  await page.goBack();
  await onHome(page);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  expect(JSON.parse(await saved(page) ?? 'null')).toEqual(JSON.parse(before ?? 'null'));
  await page.goForward();
  await inGame(page);
});

test('the Home button and the back button share one history entry', async ({ page }) => {
  await seed(page);
  await page.goto('about:blank');
  await page.goto('/');
  for (let round = 0; round < 2; round++) {
    await page.getByRole('button', { name: 'Continue' }).click();
    await inGame(page);
    await page.getByRole('button', { name: 'Home' }).click();
    await onHome(page);
  }
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('back from a puzzle started on Home returns to Home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^New easy puzzle/ }).click();
  await expect(page.locator('.board .cell:focus')).toHaveCount(1);
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});

test('back with Settings open in the game closes it and returns to Home', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.goBack();
  await onHome(page);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('back from a lesson opened by a hint returns to the game, then to Home', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await page.locator('.hint-action').click();
  await page.locator('.hint-action').click();
  while (await page.getByRole('button', { name: 'Next step' }).isEnabled()) await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Learn pointing pair ›' }).click();
  await expect(page.locator('.lesson-bar')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.lesson-bar')).toHaveCount(0);
  await inGame(page);
  await page.goBack();
  await onHome(page);
});

test('after a reload in the game, Continue and back still move between Home and the game', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await inGame(page);
  await page.reload();
  await onHome(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await inGame(page);
  await page.getByRole('button', { name: 'Home' }).click();
  await onHome(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.goBack();
  await onHome(page);
});

for (const from of ['home', 'learn'] as const) {
  test(`forward during a lesson opened from ${from === 'home' ? 'Home' : 'the Learn page'} keeps the lesson open`, async ({ page }) => {
    await seed(page);
    await page.goto('about:blank');
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue' }).click();
    await inGame(page);
    await page.goBack();
    await onHome(page);
    if (from === 'home') await page.locator('.home-lesson').click();
    else {
      await page.getByRole('button', { name: 'All techniques' }).click();
      await page.locator('.learn-row').first().click();
    }
    await expect(page.locator('.lesson-bar .lesson-title')).toBeVisible();
    await page.goForward();
    await page.waitForTimeout(300);
    await expect(page.locator('.lesson-footer')).toBeVisible();
    await page.locator('.lesson-back').click();
    if (from === 'learn') await page.locator('.lesson-back').click();
    await onHome(page);
    await page.goBack();
    await expect(page).toHaveURL('about:blank');
  });
}
