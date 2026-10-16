import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
import { createGame, enter, SAVE_KEY, type GameState } from '../src/lib/game.ts';
import { DEFAULT_PREFS, PREFS_KEY } from '../src/lib/preferences.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { getEntryDigits, peers } from '../src/lib/sudoku.ts';

const start = createGame(createPuzzle('medium', 7));
const entry = (i: number) => getEntryDigits({ values: start.values, index: i });
const empty = start.values.flatMap((v, i) => v ? [] : [i]);
const single = empty.find(i => entry(i).length === 1)!;
const answer = start.solution[single];
const stale = peers(single).map(p => start.values[p]).find(Boolean)!;
// Only two digits fit `pair`: its answer, and the answer of its empty peer `partner`.
const pair = empty.find(i => i !== single && !peers(i).includes(single) && entry(i).length === 2 && peers(i).some(p => !start.values[p] && entry(i).includes(start.solution[p])))!;
const partner = peers(pair).find(p => !start.values[p] && entry(pair).includes(start.solution[p]))!;
const loose = empty.find(i => ![single, pair, partner].includes(i) && ![single, pair].some(c => peers(c).includes(i)) && entry(i).length > 2)!;
const pencil = (game: GameState, index: number, value: number) => enter(game, { index, value, pencil: true });
const game = [[single, answer], [single, stale], [pair, start.solution[pair]], [loose, entry(loose)[0]]].reduce((g, [i, d]) => pencil(g, i, d), start);
const saved = { ...game, history: [], redoHistory: [] };

const seed = (page: Page, prefs: Partial<typeof DEFAULT_PREFS> = { fillLoneNotes: true }, board: GameState = saved) => page.addInitScript(([key, value, prefsKey, prefsValue]) => {
  if (sessionStorage.getItem('seeded')) return;
  localStorage.setItem(key, value); localStorage.setItem(prefsKey, prefsValue); sessionStorage.setItem('seeded', '1');
}, [SAVE_KEY, JSON.stringify(board), PREFS_KEY, JSON.stringify({ ...DEFAULT_PREFS, ...prefs })]);
const cell = (page: Page, i: number) => page.locator(`.board [data-index="${i}"]`);
const value = (page: Page, i: number) => cell(page, i).locator('.cell-number');
const key = (page: Page, n: number) => page.locator('.number-pad .number-key').nth(n - 1);
const mode = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();
const savedGame = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!), SAVE_KEY);

test('removing a stale note fills the cell its last note proves, with a ring and an announcement', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, single).click();
  await mode(page, 'Notes');
  await key(page, stale).click();
  await expect(value(page, single)).toHaveText(String(answer));
  await expect(cell(page, single).locator('.lone-fill-ring')).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: `Filled ${answer} in row ${Math.floor(single / 9) + 1}, column ${single % 9 + 1}` })).toHaveCount(1);
  await expect(cell(page, single).locator('.lone-fill-ring')).toHaveCount(0, { timeout: 3000 });
  await expect.poll(async () => (await savedGame(page)).values[single]).toBe(answer);
});

test('one Undo takes back the note edit and the fill together', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, single).click();
  await mode(page, 'Notes');
  await key(page, stale).click();
  await expect(value(page, single)).toHaveText(String(answer));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(value(page, single)).toHaveCount(0);
  await expect.poll(async () => (await savedGame(page)).notes[single]).toEqual([answer, stale].sort());
});

test('placing a number fills a peer whose lone note it proves', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, partner).click();
  await mode(page, 'Numbers');
  await key(page, start.solution[partner]).click();
  await expect(value(page, pair)).toHaveText(String(start.solution[pair]));
});

test('a lone note that other digits still fit is not filled', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await cell(page, loose).click();
  await mode(page, 'Notes');
  await key(page, entry(loose)[1]).click();
  await key(page, entry(loose)[1]).click();
  await expect.poll(async () => (await savedGame(page)).history.length).toBe(2);
  await expect(value(page, loose)).toHaveCount(0);
});

test('with the setting off, nothing fills', async ({ page }) => {
  await seed(page, {});
  await openGame(page);
  await cell(page, single).click();
  await mode(page, 'Notes');
  await key(page, stale).click();
  await expect.poll(async () => (await savedGame(page)).history.length).toBe(1);
  await expect(value(page, single)).toHaveCount(0);
  await expect(cell(page, single).locator(`.note-digit[data-digit="${answer}"]`)).toHaveAttribute('data-visible', 'true');
});

test('Settings turns Fill lone notes on and keeps it', async ({ page }) => {
  await seed(page, {});
  await openGame(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const toggle = page.getByRole('switch', { name: 'Fill lone notes' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).fillLoneNotes, PREFS_KEY)).toBe(true);
});

test('a batch of notes fills a cell its edit proves', async ({ page }) => {
  const neighbor = single % 9 > 0 && !start.values[single - 1] ? single - 1 : single + 1;
  await seed(page, { fillLoneNotes: true, filterNumberKeys: false }, { ...pencil(saved, neighbor, stale), history: [] });
  await openGame(page);
  await mode(page, 'Notes');
  const [from, to] = await Promise.all([cell(page, neighbor).boundingBox(), cell(page, single).boundingBox()]);
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('status').filter({ hasText: '2 cells selected' })).toHaveCount(1);
  await page.keyboard.press(String(stale));
  await expect(value(page, single)).toHaveText(String(answer));
  await expect(value(page, neighbor)).toHaveCount(0);
});

test('a fill that finishes the puzzle shows the finish card', async ({ page }) => {
  const last = { ...createGame({ ...start, givens: start.solution.map((d, i) => i === single ? 0 : d) }), id: start.id };
  await seed(page, { fillLoneNotes: true }, last);
  await openGame(page);
  await cell(page, single).click();
  await mode(page, 'Notes');
  await key(page, answer).click();
  await expect(page.locator('.completion')).toBeVisible();
  await expect(value(page, single)).toHaveText(String(answer));
  await expect(page.locator('.unit-celebration').first()).toBeAttached();
});

test('a batch fill that finishes the puzzle plays the finish celebration', async ({ page }) => {
  const last = { ...createGame({ ...start, givens: start.solution.map((d, i) => i === single ? 0 : d) }), id: start.id };
  await seed(page, { fillLoneNotes: true }, last);
  await openGame(page);
  await mode(page, 'Notes');
  const filled = single % 9 < 8 ? single + 1 : single - 1;
  const [from, to] = await Promise.all([cell(page, single).boundingBox(), cell(page, filled).boundingBox()]);
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('status').filter({ hasText: '1 cell selected' })).toHaveCount(1);
  await key(page, answer).click();
  await expect(page.locator('.completion')).toBeVisible();
  await expect(page.locator('.unit-celebration').first()).toBeAttached();
});

test('a fill that completes a row does not sweep it', async ({ page }) => {
  const sol = start.solution;
  const below = sol.findIndex((d, i) => i % 9 === 1 && i > 1 && d === sol[0]);
  const last = { ...createGame({ ...start, givens: sol.map((d, i) => [0, 1, below, 72].includes(i) ? 0 : d) }), id: start.id };
  await seed(page, { fillLoneNotes: true }, pencil(last, 1, sol[1]));
  await openGame(page);
  await page.evaluate(() => new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {
    if (n instanceof Element && n.matches('.unit-celebration')) document.body.dataset.sweeps = String(Number(document.body.dataset.sweeps ?? 0) + 1);
  }))).observe(document.querySelector('.board')!, { childList: true, subtree: true }));
  await cell(page, 0).click();
  await mode(page, 'Numbers');
  await key(page, sol[0]).click();
  await expect(value(page, 1)).toHaveText(String(sol[1]));
  expect(await page.evaluate(() => document.body.dataset.sweeps)).toBeUndefined();
});

test('with Block incorrect answers on, a wrong lone note is not filled', async ({ page }) => {
  // A wrong number at `wrong` takes `c`'s answer away, so placing `q` leaves only the wrong note `x`.
  const allowed = (values: number[], i: number) => getEntryDigits({ values, index: i });
  const setup = empty.flatMap(c => peers(c).filter(w => !start.values[w]).flatMap(wrong => {
    const values = start.values.map((v, i) => i === wrong ? start.solution[c] : v);
    return peers(c).filter(q => !values[q] && q !== wrong && allowed(values, q).includes(start.solution[q])).flatMap(q => {
      const left = allowed(values, c).filter(d => d !== start.solution[q]);
      return allowed(values, c).length === 2 && left.length === 1 ? [{ c, wrong, q, x: left[0], values }] : [];
    });
  }))[0];
  const odd = pencil({ ...start, values: setup.values }, setup.c, setup.x);
  await seed(page, { fillLoneNotes: true, blockIncorrectAnswers: true }, { ...odd, history: [] });
  await openGame(page);
  await cell(page, setup.q).click();
  await mode(page, 'Numbers');
  await key(page, start.solution[setup.q]).click();
  await expect(value(page, setup.q)).toHaveText(String(start.solution[setup.q]));
  await expect(value(page, setup.c)).toHaveCount(0);
});
