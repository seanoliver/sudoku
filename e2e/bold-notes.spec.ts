import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { peers } from '../src/lib/sudoku.ts';

const game = createGame(createPuzzle('medium', 7));
const spare = (a: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== game.solution[a] && d !== game.solution[a + 1] && [a, a + 1].every(i => !peers(i).some(p => game.values[p] === d)));
const a = game.values.findIndex((v, i) => !v && i % 9 < 8 && !game.values[i + 1] && spare(i).length >= 2);
const b = a + 1;
const [digit] = spare(a);
const seed = async (page: Page) => { await page.clock.install(); await seedSave(page); };
const seedSave = (page: Page) => page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(game)]);
const cell = (page: Page, i: number) => page.locator(`.board [data-index="${i}"]`);
const note = (page: Page, i: number) => cell(page, i).locator(`.note-digit[data-digit="${digit}"]`);
const key = (page: Page, n = digit) => page.locator('.number-pad .number-key').nth(n - 1);
const notesMode = (page: Page) => page.getByRole('button', { name: 'Notes', exact: true }).click();
async function hold(page: Page, n = digit) {
  const box = (await key(page, n).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(700);
  await page.mouse.up();
}

test('holding a number key in Notes adds the note bold, and holding it again makes it plain', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await notesMode(page);
  await hold(page);
  await expect(note(page, a)).toHaveClass(/note-bold/);
  await expect(cell(page, a)).toHaveAttribute('aria-label', new RegExp(`notes ${digit} bold`));
  await expect(page.getByRole('status').filter({ hasText: `Note ${digit} bold` })).toHaveCount(1);
  await hold(page);
  await expect(note(page, a)).not.toHaveClass(/note-bold/);
  await expect(note(page, a)).toHaveAttribute('data-visible', 'true');
  await expect(page.getByRole('status').filter({ hasText: `Note ${digit} plain` })).toHaveCount(1);
});

test('sliding off the key before the hold fires cancels it', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await notesMode(page);
  const box = (await key(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 200, { steps: 3 });
  await page.clock.runFor(700);
  await page.mouse.up();
  await expect(note(page, a)).toHaveAttribute('data-visible', 'false');
  await expect(page.locator('.note-bold')).toHaveCount(0);
});

test('a tap still adds and removes a note, and removing a bold note drops its bold', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await notesMode(page);
  await key(page).click();
  await expect(note(page, a)).toHaveAttribute('data-visible', 'true');
  await expect(note(page, a)).not.toHaveClass(/note-bold/);
  await hold(page);
  await key(page).click();
  await expect(note(page, a)).toHaveAttribute('data-visible', 'false');
  await key(page).click();
  await expect(note(page, a)).not.toHaveClass(/note-bold/);
});

test('Shift with a number bolds from the keyboard, undo takes it back, and bold survives a reload', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await page.keyboard.press('n');
  await page.keyboard.press(`Shift+Digit${digit}`);
  await expect(note(page, a)).toHaveClass(/note-bold/);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(note(page, a)).toHaveAttribute('data-visible', 'false');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(note(page, a)).toHaveClass(/note-bold/);
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(note(page, a)).toHaveClass(/note-bold/);
});

async function drag(page: Page, start: number, end: number) {
  const [from, to] = await Promise.all([cell(page, start).boundingBox(), cell(page, end).boundingBox()]);
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 5 });
  await page.mouse.up();
}

test('a hold bolds the note in every selected cell, and the next drag starts a new selection', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await drag(page, a, b);
  await hold(page);
  await expect(note(page, a)).toHaveClass(/note-bold/);
  await expect(note(page, b)).toHaveClass(/note-bold/);
  const c = game.values.findIndex((v, i) => !v && i % 9 < 8 && !game.values[i + 1] && i !== a && i !== b && i + 1 !== a);
  await drag(page, c, c + 1);
  await expect(page.locator(`.board .cell-slot:has([data-index="${a}"])`)).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator(`.board .cell-slot:has([data-index="${c}"])`)).toHaveAttribute('aria-selected', 'true');
});

test('in Numbers, a long press enters the number once, like a tap', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await hold(page, game.solution[a]);
  await expect(cell(page, a).locator('.cell-number')).toHaveText(String(game.solution[a]));
  await expect(page.locator('.note-bold')).toHaveCount(0);
});

test('a hold that ends off the key does not swallow the next tap', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await notesMode(page);
  const box = (await key(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(700);
  await page.mouse.move(box.x + box.width / 2, box.y - 200, { steps: 5 });
  await page.mouse.up();
  await expect(note(page, a)).toHaveClass(/note-bold/);
  await page.getByRole('button', { name: 'Numbers', exact: true }).click();
  await key(page, game.solution[a]).click();
  await expect(cell(page, a).locator('.cell-number')).toHaveText(String(game.solution[a]));
});

test('Shift with a digit that Shift types, as on AZERTY, adds a plain note', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await page.keyboard.press('n');
  await cell(page, a).dispatchEvent('keydown', { key: String(digit), code: `Digit${digit}`, shiftKey: true, bubbles: true });
  await expect(note(page, a)).toHaveAttribute('data-visible', 'true');
  await expect(note(page, a)).not.toHaveClass(/note-bold/);
});

test('Enter on a key after a hold that ended off the key still toggles the note', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await notesMode(page);
  const box = (await key(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(700);
  await page.mouse.move(box.x + box.width / 2, box.y - 200, { steps: 3 });
  await page.mouse.up();
  await expect(note(page, a)).toHaveClass(/note-bold/);
  await key(page).focus();
  await page.keyboard.press('Enter');
  await expect(note(page, a)).toHaveAttribute('data-visible', 'false');
});

test('a hold or Shift with a number does nothing while paused, in Color, or on a repeated keydown', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, a).click();
  await page.keyboard.press('n');
  await page.keyboard.press('c');
  await page.keyboard.press(`Shift+Digit${digit}`);
  await expect(note(page, a)).toHaveAttribute('data-visible', 'false');
  await page.keyboard.press('n');
  await cell(page, a).dispatchEvent('keydown', { key: '!', code: `Digit${digit}`, shiftKey: true, repeat: true, bubbles: true });
  await expect(note(page, a)).toHaveAttribute('data-visible', 'false');
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.keyboard.press(`Shift+Digit${digit}`);
  await page.getByRole('button', { name: 'Resume game' }).click();
  await expect(note(page, a)).toHaveAttribute('data-visible', 'false');
});

test('a hold on a dimmed key focuses its number, like a tap', async ({ page }) => {
  await seed(page);
  await openGame(page);
  const taken = peers(a).map(p => game.values[p]).find(Boolean)!;
  await cell(page, a).click();
  await notesMode(page);
  await hold(page, taken);
  await expect(key(page, taken)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.note-bold')).toHaveCount(0);
});

test.describe('touch', () => {
  test.use({ hasTouch: true });
  test('a long press on a touchscreen bolds the note once', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP touch events');
    await seed(page);
    await openGame(page);
    await cell(page, a).click();
    await notesMode(page);
    const box = (await key(page).boundingBox())!;
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await page.clock.runFor(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(note(page, a)).toHaveClass(/note-bold/);
    await expect(note(page, a)).toHaveAttribute('data-visible', 'true');
  });
});
