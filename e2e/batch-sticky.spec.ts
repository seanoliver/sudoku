import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { peers } from '../src/lib/sudoku.ts';

const game = createGame(createPuzzle('medium', 7));
const spare = (a: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== game.solution[a] && d !== game.solution[a + 1] && [a, a + 1].every(i => !peers(i).some(p => game.values[p] === d)));
const a = game.values.findIndex((v, i) => !v && i % 9 < 8 && !game.values[i + 1] && spare(i).length >= 2);
const b = a + 1;
const [first, second] = spare(a);
const filled = game.values.findIndex(v => v);
const seed = (page: Page) => page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(game)]);
const cell = (page: Page, i: number) => page.locator(`.board [data-index="${i}"]`);
const marks = (page: Page, kind: 'exclusions' | 'notes') => page.evaluate(({ key, k, cells }) => { const g = JSON.parse(localStorage.getItem(key)!); return cells.map(i => [...g[k][i]].sort()); }, { key: SAVE_KEY, k: kind, cells: [a, b] });
const selected = (page: Page) => page.getByRole('status').filter({ hasText: '2 cells selected' });
const mode = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

const c = game.values.findIndex((v, i) => i !== a && i !== b && i + 1 !== a && !v && i % 9 < 8 && !game.values[i + 1] && spare(i).some(d => d !== first && spare(a).includes(d)));
const later = spare(c).find(d => d !== first && spare(a).includes(d))!;

async function drag(page: Page, start: number, end: number) {
  const [from, to] = await Promise.all([cell(page, start).boundingBox(), cell(page, end).boundingBox()]);
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 5 });
  await page.mouse.up();
}
async function selectBoth(page: Page) {
  await drag(page, a, b);
  await expect(selected(page)).toHaveCount(1);
}

test('a selection stays in Exclude after each digit, so several digits are crossed out in a row', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await selectBoth(page);
  await mode(page, 'Exclude').click();
  await page.keyboard.press(String(first));
  await page.keyboard.press(String(second));
  await expect.poll(() => marks(page, 'exclusions')).toEqual([[first, second].sort(), [first, second].sort()]);
  await expect(selected(page)).toHaveCount(1);
  await expect(mode(page, 'Exclude')).toHaveAttribute('aria-pressed', 'true');
});

test('a selection stays in Notes after each digit', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await selectBoth(page);
  await page.keyboard.press(String(first));
  await page.keyboard.press(String(second));
  await expect.poll(() => marks(page, 'notes')).toEqual([[first, second].sort(), [first, second].sort()]);
  await expect(selected(page)).toHaveCount(1);
});

test('each digit on a selection is its own undo step', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await selectBoth(page);
  await mode(page, 'Exclude').click();
  await page.keyboard.press(String(first));
  await page.keyboard.press(String(second));
  await expect.poll(() => marks(page, 'exclusions')).toEqual([[first, second].sort(), [first, second].sort()]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => marks(page, 'exclusions')).toEqual([[first], [first]]);
});

test('Numbers ends the selection', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await selectBoth(page);
  await mode(page, 'Exclude').click();
  await page.keyboard.press(String(first));
  await mode(page, 'Numbers').click();
  await expect(selected(page)).toHaveCount(0);
  await expect(mode(page, 'Numbers')).toHaveAttribute('aria-pressed', 'true');
});

test('tapping a filled cell ends the selection', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await selectBoth(page);
  await page.keyboard.press(String(first));
  await cell(page, filled).click();
  await expect(selected(page)).toHaveCount(0);
});

test('after a number, a new drag starts a new selection in the same mode', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await selectBoth(page);
  await mode(page, 'Exclude').click();
  await page.keyboard.press(String(first));
  await drag(page, c, c + 1);
  await expect(selected(page)).toHaveCount(1);
  await page.keyboard.press(String(later));
  await expect.poll(() => marks(page, 'exclusions')).toEqual([[first], [first]]);
  await expect.poll(() => page.evaluate(({ key, cells }) => { const g = JSON.parse(localStorage.getItem(key)!); return cells.map(i => g.exclusions[i]); }, { key: SAVE_KEY, cells: [c, c + 1] })).toEqual([[later], [later]]);
  await expect(mode(page, 'Exclude')).toHaveAttribute('aria-pressed', 'true');
});

for (const [name, key] of [['Escape', 'Escape'], ['Erase', 'Backspace'], ['pressing X again', 'x']] as const) {
  test(`${name} ends the selection and keeps what was applied`, async ({ page }) => {
    await seed(page);
    await openGame(page);
    await selectBoth(page);
    await mode(page, 'Exclude').click();
    await page.keyboard.press(String(first));
    await page.keyboard.press(key);
    await expect(selected(page)).toHaveCount(0);
    await expect.poll(() => marks(page, 'exclusions')).toEqual([[first], [first]]);
  });
}

const count = (page: Page, n: number) => page.getByRole('status').filter({ hasText: new RegExp(`^${n} cells? selected$`) });
const exclusionsOf = (page: Page, cells: number[]) => page.evaluate(({ key, cells }) => { const g = JSON.parse(localStorage.getItem(key)!); return cells.map(i => [...g.exclusions[i]].sort()); }, { key: SAVE_KEY, cells });

test('after a number, holding an empty cell starts a new selection', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await selectBoth(page);
  await mode(page, 'Exclude').click();
  await page.keyboard.press(String(first));
  const box = await cell(page, c).boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(count(page, 1)).toHaveCount(1);
  await page.mouse.up();
  await page.keyboard.press(String(later));
  await expect.poll(() => exclusionsOf(page, [a, b, c])).toEqual([[first], [first], [later]]);
});

test('after a number, a tapped cell joins the selection and a drag then adds to it', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await selectBoth(page);
  await mode(page, 'Exclude').click();
  await page.keyboard.press(String(first));
  await cell(page, c).click();
  await expect(count(page, 3)).toHaveCount(1);
  await drag(page, c, c + 1);
  await expect(count(page, 4)).toHaveCount(1);
});

test('a second drag before any number adds to the new selection', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await selectBoth(page);
  await mode(page, 'Exclude').click();
  await page.keyboard.press(String(first));
  await drag(page, c, c + 1);
  await expect(count(page, 2)).toHaveCount(1);
  await drag(page, a, b);
  await expect(count(page, 4)).toHaveCount(1);
  await page.keyboard.press(String(later));
  await expect.poll(() => exclusionsOf(page, [a, b, c, c + 1])).toEqual([[first, later].sort(), [first, later].sort(), [later], [later]]);
});
