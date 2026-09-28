import { expect, test, type Page } from '@playwright/test';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { PREFS_KEY } from '../src/lib/preferences.ts';
import { REPLAYS_KEY } from '../src/lib/replay.ts';

const game = createGame(createPuzzle('easy', 4242));
const open = game.givens.flatMap((v, i) => v ? [] : [i]);
const prefs = { theme: 'system', blockIncorrectAnswers: false, highlightPeers: true, smartHighlighting: false, filterNumberKeys: false, hideTimer: false };

async function start(page: Page, saved = JSON.stringify(game)) {
  await page.addInitScript(([saveKey, value, prefsKey, p]) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem(saveKey, value); localStorage.setItem(prefsKey, p); sessionStorage.setItem('seeded', '1');
  }, [SAVE_KEY, saved, PREFS_KEY, JSON.stringify(prefs)]);
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await expect(page.locator('.board')).toBeVisible();
}
const enter = async (page: Page, cell: number, digit: number) => { await page.locator(`.board [data-index="${cell}"]`).click(); await page.keyboard.press(String(digit)); };
/** Solves the puzzle with one note first and one wrong number erased and retyped along the way. */
async function solveWithNoteAndFix(page: Page) {
  const [first, second, ...rest] = open;
  await page.locator(`.board [data-index="${first}"]`).click();
  await page.keyboard.press('n');
  await page.keyboard.press(String(game.solution[first]));
  await page.keyboard.press('n');
  await enter(page, second, game.solution[second] % 9 + 1);
  await page.keyboard.press('Backspace');
  await page.keyboard.press(String(game.solution[second]));
  for (const cell of [first, ...rest]) await enter(page, cell, game.solution[cell]);
  await expect(page.locator('.completion')).toBeVisible();
}
// A note, a wrong number, its erase, then every open cell's number.
const stepCount = open.length + 3;

test('a finished puzzle replays from the starting board, with its numbers, notes, and fix counted', async ({ page }) => {
  await start(page);
  await solveWithNoteAndFix(page);
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByRole('heading', { name: 'Your easy solve' })).toBeVisible();
  await expect(page.locator('.replay-numbers b')).toHaveText(String(open.length + 1));
  await expect(page.locator('.replay-notes b')).toHaveText('1');
  await expect(page.locator('.replay-fixes b')).toHaveText('1');
  await expect(page.locator('.replay-count')).toHaveText(`1 of ${stepCount + 1}`);
  await expect(page.locator('.replay-board .cell-number')).toHaveCount(81 - open.length);
  await page.getByRole('button', { name: '4×' }).click();
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('.replay-count')).toHaveText(`${stepCount + 1} of ${stepCount + 1}`, { timeout: 10_000 });
  await expect(page.locator('.replay-board .cell-number')).toHaveCount(81);
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.completion')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay' })).toBeFocused();
});

test('the scrubber, Space, and Escape control the replay', async ({ page }) => {
  await start(page);
  await solveWithNoteAndFix(page);
  await page.getByRole('button', { name: 'Replay' }).click();
  const scrubber = page.getByRole('slider', { name: 'Replay position' });
  await scrubber.fill(String(2));
  await expect(page.locator('.replay-count')).toHaveText(`3 of ${stepCount + 1}`);
  await expect(page.locator('.replay-board .cell.wrong')).toHaveCount(1);
  await expect(page.locator('.replay-board .cell.wrong .conflict-dot')).toHaveCount(1);
  await scrubber.fill(String(3));
  await expect(page.locator('.replay-board .cell.wrong')).toHaveCount(0);
  await page.keyboard.press(' ');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.completion')).toBeVisible();
});

test('Home’s solved card opens the replay and returns to Home', async ({ page }) => {
  await start(page);
  await solveWithNoteAndFix(page);
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByRole('heading', { name: 'Your easy solve' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: 'Replay' })).toBeFocused();
  await expect(page.getByRole('heading', { name: /^Nicely solved/ })).toBeVisible();
});

test('a game finished before recording existed offers no replay', async ({ page }) => {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, JSON.stringify({ ...game, values: game.solution })]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Nicely solved/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay' })).toHaveCount(0);
});

test('restarting a puzzle starts a new recording', async ({ page }) => {
  await start(page);
  await enter(page, open[0], game.solution[open[0]]);
  await enter(page, open[1], game.solution[open[1]]);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^Restart/ }).first().click();
  await page.getByRole('button', { name: /^Restart/ }).last().click();
  await enter(page, open[2], game.solution[open[2]]);
  await expect.poll(() => page.evaluate(([key, id]) => JSON.parse(localStorage.getItem(key) ?? '{"games":[]}').games.find((g: { id: string }) => g.id === id)?.steps.length, [REPLAYS_KEY, game.id])).toBe(1);
});

test('lesson boards are not recorded', async ({ page }) => {
  await page.goto('/');
  await page.locator('.home-lesson').click();
  await page.locator('.lesson-footer').click();
  await page.locator('.board .cell:not(.given)').first().click();
  await page.keyboard.press('5');
  await page.waitForTimeout(300);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"games":[]}').games.length, REPLAYS_KEY)).toBe(0);
});

test('opening a replay puts focus on Play, so Space plays it', async ({ page }) => {
  await start(page);
  await solveWithNoteAndFix(page);
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeFocused();
  await page.keyboard.press(' ');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your easy solve' })).toBeVisible();
  await page.keyboard.press(' ');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Your easy solve' })).toBeVisible();
});

test('back from a replay opened on the completion card returns to the card', async ({ page }) => {
  await start(page);
  await solveWithNoteAndFix(page);
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByRole('heading', { name: 'Your easy solve' })).toBeVisible();
  await page.goBack();
  await expect(page.locator('.completion')).toBeVisible();
});

test('a long replay keeps its whole timeline on screen', async ({ page }) => {
  const solved = { ...game, values: game.solution };
  const steps = Array.from({ length: 700 }, (_, k) => [[open[0], 0, 1 << (k % 9 + 1), 0]]);
  steps.push(open.map(i => [i, game.solution[i], 0, 0]));
  await page.addInitScript(([saveKey, value, replaysKey, replays]) => { localStorage.setItem(saveKey, value); localStorage.setItem(replaysKey, replays); },
    [SAVE_KEY, JSON.stringify(solved), REPLAYS_KEY, JSON.stringify({ games: [{ id: game.id, start: game.givens.flatMap((v, i) => v ? [[i, v, 0, 0]] : []), steps }] })]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Replay' }).click();
  const layout = await page.locator('.replay-ticks').evaluate(el => {
    const box = el.getBoundingClientRect();
    const marks = [...el.querySelectorAll('i, rect')].map(mark => mark.getBoundingClientRect());
    return { width: box.width, overflow: Math.max(...marks.map(mark => mark.right)) - box.right, visible: marks.filter(mark => mark.width > 0).length, count: marks.length };
  });
  expect(layout.width).toBeGreaterThan(200);
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.visible).toBe(layout.count);
});

test('numbers entered before recording began are not shown as starting numbers', async ({ page }) => {
  const wrongCell = open[0];
  const wrong = game.solution[wrongCell] % 9 + 1;
  const inProgress = { ...game, values: game.values.map((v, i) => i === wrongCell ? wrong : i === open[1] ? game.solution[i] : v) };
  await start(page, JSON.stringify(inProgress));
  await page.locator(`.board [data-index="${wrongCell}"]`).click();
  await page.keyboard.press('Backspace');
  for (const cell of open.filter(i => i !== open[1])) await enter(page, cell, game.solution[cell]);
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.locator(`.replay-board .cell.given`)).toHaveCount(81 - open.length);
  await expect(page.locator('.replay-board .cell.wrong')).toHaveCount(1);
});
