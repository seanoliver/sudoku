import { expect, test, type Page } from '@playwright/test';
import { answer, crossOut, gameBefore, prompt, tapFooter } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { LESSON_BANK } from '../src/lib/lesson-bank.ts';
import { LEARNED_KEY, LESSON_BANDS, lessonOf } from '../src/lib/lessons.ts';

const seeded = gameBefore(step => lessonOf(step) === 'pointing');
const lessonCount = LESSON_BANDS.flatMap(b => b.lessons).length;
const saved = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);

async function openLearn(page: Page, learned: Record<string, string> = {}) {
  await page.addInitScript(([key, value, learnedKey, learnedValue]) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem(key, value); localStorage.setItem(learnedKey, learnedValue); sessionStorage.setItem('seeded', '1');
  }, [SAVE_KEY, seeded, LEARNED_KEY, JSON.stringify(learned)]);
  await page.goto('/');
  await page.locator('.board .cell').first().waitFor();
  await expect.poll(async () => JSON.parse(await saved(page, SAVE_KEY) ?? '{}').id).toBe(JSON.parse(seeded).id);
  const before = await saved(page, SAVE_KEY);
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Learn' })).toBeVisible();
  return before;
}

test('the Learn page lists every lesson with what has been learned, and leaving restores the game', async ({ page }) => {
  const before = await openLearn(page, { pointing: '2026-09-25' });
  await expect(page.locator('.learn-row')).toHaveCount(lessonCount);
  await expect(page.locator('.learn-count')).toHaveText(`1 of ${lessonCount} learned`);
  await expect(page.getByRole('button', { name: 'Pointing pair, learned' })).toBeVisible();
  await expect(page.locator('.learn-band h2')).toHaveText(['Easy', 'Medium', 'Hard', 'Expert']);
  await page.getByRole('button', { name: 'Your game' }).click();
  await expect(page.locator('.board')).toBeVisible();
  expect(JSON.parse(await saved(page, SAVE_KEY) ?? 'null')).toEqual(JSON.parse(before ?? 'null'));
});

test('a lesson opened from the list returns to the list', async ({ page }) => {
  await openLearn(page);
  await page.locator('.learn-row[data-lesson="x-wing"]').click();
  await expect(page.locator('.lesson-title strong')).toHaveText('X-wing');
  await page.getByRole('button', { name: 'Learn' }).click();
  await expect(page.locator('.learn-row')).toHaveCount(lessonCount);
  await expect(page.locator('.learn-row[data-lesson="x-wing"]')).toBeFocused();
});

test('finishing a lesson from the list returns to the list with it checked', async ({ page }) => {
  await openLearn(page);
  await page.locator('.learn-row[data-lesson="pointing"]').click();
  await tapFooter(page);
  for (let board = 1; board < LESSON_BANK.pointing.length; board++) {
    await crossOut(page, answer(board));
    await tapFooter(page);
    await expect(prompt(page)).toHaveText('That’s the pointing pair');
    await tapFooter(page);
  }
  await page.getByRole('button', { name: 'Back to Learn' }).click();
  await expect(page.getByRole('button', { name: 'Pointing pair, learned' })).toBeVisible();
  await expect(page.locator('.learn-count')).toHaveText(`1 of ${lessonCount} learned`);
});

test('a paused game stays paused, and lessons from the Learn page are still playable', async ({ page }) => {
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, seeded]);
  await page.goto('/');
  await page.locator('.board .cell').first().waitFor();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.locator('.board-cover')).toBeVisible();
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page.locator('.learn-row[data-lesson="x-wing"]').click();
  await expect(page.locator('.board-cover')).toHaveCount(0);
  await page.getByRole('button', { name: 'Learn' }).click();
  await page.getByRole('button', { name: 'Your game' }).click();
  await expect(page.getByRole('button', { name: 'Resume game' })).toBeVisible();
  await expect(page.locator('.learn-button')).toBeFocused();
});

test('Escape leaves the Learn page even when nothing on it has focus', async ({ page }) => {
  await openLearn(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Escape');
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.learn-button')).toBeFocused();
});
