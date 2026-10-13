import { expect, test, type Page } from '@playwright/test';
import { answer, crossOut, footer, gameBefore, openGame, openWalkthrough, tapFooter } from './fixtures.ts';
import { createGame, paintCells, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';

const fresh = JSON.stringify(createGame(createPuzzle('medium', 7)));
const seedFresh = ({ page }: { page: Page }) => page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, fresh]);

const emptyCell = (page: Page, n = 0) => page.locator('.board .cell[data-given="false"]').nth(n);
const colorMode = (page: Page) => page.getByRole('button', { name: 'Color', exact: true });

test('Color mode colors the selected cell, toggles it off, and undo brings it back', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  const cell = emptyCell(page);
  await cell.click();
  await colorMode(page).click();
  await expect(page.getByRole('group', { name: 'Colors' })).toBeVisible();
  const gold = page.getByRole('button', { name: 'Color gold' });
  await gold.click();
  await expect(cell).toHaveClass(/paint-gold/);
  await expect(cell).toHaveAttribute('aria-label', /, gold$/);
  await expect(gold).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Color blue' }).click();
  await expect(cell).toHaveClass(/paint-blue/);
  await page.getByRole('button', { name: 'Color blue' }).click();
  await expect(cell).not.toHaveClass(/painted/);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(cell).toHaveClass(/paint-blue/);
});

test('Erase and Clear all clear colors, and dim when there is nothing to clear', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  await colorMode(page).click();
  const erase = page.getByRole('button', { name: 'Clear color' });
  const clearAll = page.getByRole('button', { name: 'Clear all' });
  await expect(clearAll).toBeDisabled();
  for (const n of [0, 1]) { await emptyCell(page, n).click(); await page.getByRole('button', { name: 'Color gold' }).click(); }
  await expect(page.locator('.cell.painted')).toHaveCount(2);
  await erase.click();
  await expect(page.locator('.cell.painted')).toHaveCount(1);
  await expect(erase).toBeDisabled();
  await clearAll.click();
  await expect(page.locator('.cell.painted')).toHaveCount(0);
  await expect(clearAll).toBeDisabled();
});

test('colors survive a reload, and a given cannot be colored', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  await emptyCell(page).click();
  await colorMode(page).click();
  await page.getByRole('button', { name: 'Color blue' }).click();
  await page.locator('.board .cell[data-given="true"]').first().click();
  await expect(page.getByRole('button', { name: 'Color gold' })).toBeDisabled();
  await page.keyboard.press('1');
  await expect(page.locator('.cell.painted')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(emptyCell(page)).toHaveClass(/paint-blue/);
});

test('switching modes leaves Color mode and brings the number pad back', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  await colorMode(page).click();
  await expect(colorMode(page)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Colors' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Enter 1 as a note/ })).toBeVisible();
});

test('the keyboard: C for Color mode, 1 gold, 2 blue, Backspace clears, C again for Numbers', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  const cell = emptyCell(page);
  await cell.click();
  await page.keyboard.press('c');
  await expect(colorMode(page)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('1');
  await expect(cell).toHaveClass(/paint-gold/);
  await expect(cell.locator('.cell-number')).toHaveCount(0);
  await page.keyboard.press('2');
  await expect(cell).toHaveClass(/paint-blue/);
  await page.keyboard.press('Backspace');
  await expect(cell).not.toHaveClass(/painted/);
  await page.keyboard.press('c');
  await expect(page.getByRole('button', { name: 'Numbers', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('? explains colors and opens a coloring lesson', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  await colorMode(page).click();
  await page.getByRole('button', { name: 'About colors' }).click();
  await expect(page.getByRole('heading', { name: 'Colors' })).toBeVisible();
  await page.getByRole('button', { name: 'Color trap' }).click();
  await expect(page.locator('.lesson-bar')).toContainText('Color trap');
});

for (const [width, height] of [[390, 844], [375, 667]]) {
  test(`the color pad keeps the controls' height at ${width} × ${height}`, async ({ page }) => {
    await seedFresh({ page });
    await page.setViewportSize({ width, height });
    await openGame(page);
    const controls = page.locator('.controls-area');
    const before = (await controls.boundingBox())!.height;
    await colorMode(page).click();
    await expect(page.getByRole('group', { name: 'Colors' })).toBeVisible();
    expect((await controls.boundingBox())!.height).toBeCloseTo(before, 0);
  });
}

test('a drag selection takes one color, then the selection ends', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  await colorMode(page).click();
  const [first, second] = [emptyCell(page, 0), emptyCell(page, 1)];
  await first.click();
  await page.getByRole('button', { name: 'Color blue' }).click();
  const [from, to] = await Promise.all([first.boundingBox(), second.boundingBox()]);
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('status').filter({ hasText: '2 cells selected' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Color gold' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Color blue' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Color gold' }).click();
  await expect(first).toHaveClass(/paint-gold/);
  await expect(second).toHaveClass(/paint-gold/);
  await expect(page.getByRole('status').filter({ hasText: 'cells selected' })).toHaveCount(0);
});

test('number keys other than 1 and 2 do nothing in Color mode, and a given dims the color keys', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  const cell = emptyCell(page);
  await cell.click();
  await page.keyboard.press('c');
  await page.keyboard.press('5');
  await expect(cell.locator('.cell-number')).toHaveCount(0);
  await expect(cell).not.toHaveClass(/painted/);
  await page.locator('.board .cell[data-given="true"]').first().click();
  await expect(page.getByRole('button', { name: 'Color gold' })).toBeDisabled();
});

test('Restart returns to Numbers', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  await colorMode(page).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Restart puzzle' }).click();
  await page.locator('.sheet').getByRole('button', { name: 'Restart puzzle' }).click();
  await expect(page.getByRole('button', { name: 'Numbers', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.color-pad')).toHaveCount(0);
});

test('a lesson opened from ? practices on the number pad', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  await colorMode(page).click();
  await page.getByRole('button', { name: 'About colors' }).click();
  await page.getByRole('button', { name: 'Color wrap' }).click();
  await expect(page.locator('.color-pad')).toHaveCount(0);
  await tapFooter(page);
  await expect(page.locator('.lesson-coach')).not.toHaveClass(/walking/);
  await expect(page.locator('.color-pad')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Exclude', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('a hint walkthrough hides your colors and ignores the color keys until it closes', async ({ page }) => {
  const saved = JSON.parse(gameBefore(() => true));
  const cell = saved.values.findIndex((v: number) => !v);
  await openWalkthrough(page, JSON.stringify(paintCells(saved, { indices: [cell], color: 1 })));
  await expect(page.locator('.cell.painted')).toHaveCount(0);
  await page.keyboard.press('c');
  await page.keyboard.press('2');
  await page.getByRole('button', { name: 'Close hint' }).click();
  await expect(page.locator(`.board [data-index="${cell}"]`)).toHaveClass(/paint-gold/);
  await expect(page.locator('.cell.painted')).toHaveCount(1);
});

test('mode buttons and color keys stay at least 44px tall at 320 × 568', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seedFresh({ page });
  await openGame(page);
  await colorMode(page).click();
  await expect(page.locator('.mode-option')).toHaveCount(4);
  await expect(page.locator('.color-key')).toHaveCount(5);
  for (const selector of ['.mode-option', '.color-key']) for (const box of await page.locator(selector).evaluateAll(els => els.map(el => el.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});

test('the next practice board starts outside Color mode', async ({ page }) => {
  await seedFresh({ page });
  await page.goto('/');
  await page.locator('.home-all').click();
  await page.getByRole('button', { name: /Pointing pair/ }).first().click();
  await tapFooter(page);
  await crossOut(page, answer(1));
  await colorMode(page).click();
  await expect(page.locator('.color-pad')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'About colors' })).toBeDisabled();
  await tapFooter(page);
  await expect(footer(page)).toHaveText('Next board');
  await tapFooter(page);
  await expect(page.locator('.color-pad')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Exclude', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('a lesson keeps the game’s Color mode for when you come back', async ({ page }) => {
  await seedFresh({ page });
  await openGame(page);
  await colorMode(page).click();
  await page.getByRole('button', { name: 'About colors' }).click();
  await page.getByRole('button', { name: 'Color wrap' }).click();
  await expect(page.locator('.lesson-bar')).toBeVisible();
  await page.getByRole('button', { name: 'Your game' }).click();
  await expect(page.locator('.lesson-bar')).toHaveCount(0);
  await expect(colorMode(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.color-pad')).toHaveCount(1);
});
