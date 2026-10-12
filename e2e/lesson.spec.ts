import { expect, test, type Page } from '@playwright/test';
import { answer, crossOut, footer, gameBefore, openGame, prompt, stepToEnd, tapFooter } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { LESSON_BANK } from '../src/lib/lesson-bank.ts';
import { LEARNED_KEY, lessonOf, practiceGame } from '../src/lib/lessons.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';
import { allSteps } from '../src/lib/steps.ts';

const pointingGame = gameBefore(step => lessonOf(step) === 'pointing');
const saved = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);

async function openLesson(page: Page) {
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, pointingGame]);
  await openGame(page);
  const before = await saved(page, SAVE_KEY);
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await page.locator('.hint-action').click();
  await page.locator('.hint-action').click();
  await stepToEnd(page);
  await page.getByRole('button', { name: 'Learn pointing pair' }).click();
  await expect(page.locator('.lesson-title strong')).toHaveText('Pointing pair');
  return before;
}

test('a lesson opens from the last hint step, and leaving it restores the untouched game', async ({ page }) => {
  const before = await openLesson(page);
  await expect(prompt(page)).toHaveText('Watch how it works');
  await expect(page.locator('.lesson-title strong')).toHaveText('Pointing pair');
  const next = page.locator('.lesson-coach .walk-next');
  while (await next.count()) await next.click();
  await expect(footer(page)).toHaveText('Start practice');
  await page.getByRole('button', { name: 'Your game' }).click();
  await expect(page.locator('.lesson-bar')).toHaveCount(0);
  await expect(page.locator('.game-bar')).toBeVisible();
  expect(JSON.parse(await saved(page, SAVE_KEY) ?? 'null')).toEqual(JSON.parse(before ?? 'null'));
});

test('the right move on a practice board is graded right, then Next board', async ({ page }) => {
  await openLesson(page);
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Find the pointing pair');
  await expect(footer(page)).toBeDisabled();
  await crossOut(page, answer(1));
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Found it');
  await expect(page.locator('.lesson-coach.correct .lesson-coach-state svg')).toBeVisible();
  await expect(page.locator('.controls-area')).not.toHaveCSS('background-color', await page.locator('.puzzle-panel').evaluate(e => getComputedStyle(e).backgroundColor));
  await expect(footer(page)).toHaveText('Next board');
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Find the pointing pair');
  await expect(page.locator('.lesson-dots i.done')).toHaveCount(1);
});

test('a wrong move shows the walkthrough, and Try again restores the board', async ({ page }) => {
  await openLesson(page);
  await tapFooter(page);
  const target = answer(1)[0];
  const board = practiceGame(LESSON_BANK.pointing[1], 1);
  const wrongCell = board.values.findIndex((v, i) => !v && i !== target.cell && getPlayableCandidates(board)[i].size > 1);
  const wrongDigit = [...getPlayableCandidates(board)[wrongCell]].find(d => d !== board.solution[wrongCell])!;
  await crossOut(page, [{ cell: wrongCell, digit: wrongDigit }]);
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Not quite');
  await expect(page.locator('.lesson-coach-text')).toBeVisible();
  await expect(page.locator('.lesson-coach.wrong .lesson-coach-state svg')).toBeVisible();
  await expect(page.locator(`.board [data-index="${wrongCell}"]`)).not.toHaveAttribute('aria-label', new RegExp(`ruled out.*${wrongDigit}`));
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Find the pointing pair');
  await expect(page.locator('.lesson-coach-text')).toHaveCount(0);
});

test('finishing every practice board marks the lesson learned', async ({ page }) => {
  await openLesson(page);
  await tapFooter(page);
  const boards = LESSON_BANK.pointing.length - 1;
  for (let board = 1; board <= boards; board++) {
    await crossOut(page, answer(board));
    await tapFooter(page);
    await expect(prompt(page)).toHaveText('Found it');
    await tapFooter(page);
  }
  await expect(page.locator('.lesson-done h2')).toHaveText('Pointing pair learned');
  await expect(page.locator('.lesson-coach')).toHaveCount(0);
  expect(JSON.parse(await saved(page, LEARNED_KEY) ?? '{}')).toHaveProperty('pointing');
  // The done card replaces Finish under the finger, so a tap within 350 ms is ignored as a double tap.
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Back to your game' }).click();
  await expect(page.locator('.game-bar')).toBeVisible();
});

test('the game timer does not run during a lesson', async ({ page }) => {
  await openLesson(page);
  const clock = () => page.evaluate(() => JSON.parse(localStorage.getItem('sudoku.clock.v1') ?? '{}').seconds as number);
  const start = await clock();
  await page.waitForTimeout(2500);
  expect(await clock()).toBeCloseTo(start, 0);
});

test('a placement lesson grades the right digit as right, even where the cell had crossings-out', async ({ page }) => {
  const single = gameBefore(step => lessonOf(step) === 'naked-single');
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, single]);
  await openGame(page);
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await page.locator('.hint-action').click();
  await page.locator('.hint-action').click();
  await stepToEnd(page);
  await page.getByRole('button', { name: 'Learn naked single' }).click();
  await tapFooter(page);
  const board = practiceGame(LESSON_BANK['naked-single'][1], 1);
  const { cell, digit } = allSteps(board.values, getPlayableCandidates(board), 'naked-single')[0].placement!;
  await page.locator(`.board [data-index="${cell}"]`).click();
  await page.keyboard.press(String(digit));
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Found it');
});

test('the example board and feedback boards ignore the keyboard', async ({ page }) => {
  await openLesson(page);
  const empty = practiceGame(LESSON_BANK.pointing[0], 0).values.findIndex(v => !v);
  const cell = page.locator(`.board [data-index="${empty}"]`);
  const label = await cell.getAttribute('aria-label');
  await cell.click();
  for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) await page.keyboard.press(key);
  await expect(cell).toHaveAttribute('aria-label', label!);
});

test('a quick double tap on Check still shows the feedback', async ({ page }) => {
  await openLesson(page);
  await tapFooter(page);
  const board = practiceGame(LESSON_BANK.pointing[1], 1);
  const target = answer(1)[0];
  const wrongCell = board.values.findIndex((v, i) => !v && i !== target.cell && getPlayableCandidates(board)[i].size > 1);
  const wrongDigit = [...getPlayableCandidates(board)[wrongCell]].find(d => d !== board.solution[wrongCell])!;
  await crossOut(page, [{ cell: wrongCell, digit: wrongDigit }]);
  await footer(page).dblclick();
  await expect(prompt(page)).toHaveText('Not quite');
  await expect(page.locator('.lesson-coach-text')).toBeVisible();
});

test('crossing out a practice board cell’s answer is refused, and Undo locks once the board is checked', async ({ page }) => {
  await openLesson(page);
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Find the pointing pair');
  const board = practiceGame(LESSON_BANK.pointing[1], 1);
  const target = board.values.findIndex(v => !v);
  const cell = page.locator(`.board [data-index="${target}"]`);
  await cell.click();
  await page.keyboard.press(String(board.solution[target]));
  await expect(cell).toHaveClass(/rejecting/);
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeDisabled();
  await crossOut(page, answer(1));
  await expect(undo).toBeEnabled();
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Found it');
  await expect(undo).toBeDisabled();
});

test('the lesson screen names the technique once, and hides the keypad while you watch', async ({ page }) => {
  await openLesson(page);
  await expect(page.getByText('Pointing pair', { exact: true })).toHaveCount(1);
  await expect(page.locator('.number-pad')).toBeHidden();
  await tapFooter(page);
  await expect(page.locator('.number-pad')).toBeVisible();
  await expect(page.locator('.lesson-coach-state .lesson-action')).toHaveText('Check');
});

test('focus follows the coach from the keyboard: Next, then the action, then the walkthrough after a wrong move', async ({ page }) => {
  await openLesson(page);
  const next = page.locator('.lesson-coach .walk-next');
  await expect(next).toBeFocused();
  while (await next.count()) { await page.waitForTimeout(400); await page.keyboard.press('Enter'); }
  await expect(footer(page)).toHaveText('Start practice');
  await expect(footer(page)).toBeFocused();
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await expect(prompt(page)).toHaveText('Find the pointing pair');
  const board = practiceGame(LESSON_BANK.pointing[1], 1);
  const target = answer(1)[0];
  const wrongCell = board.values.findIndex((v, i) => !v && i !== target.cell && getPlayableCandidates(board)[i].size > 1);
  const wrongDigit = [...getPlayableCandidates(board)[wrongCell]].find(d => d !== board.solution[wrongCell])!;
  await crossOut(page, [{ cell: wrongCell, digit: wrongDigit }]);
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Not quite');
  await expect(page.locator('.lesson-coach .walk-next')).toBeFocused();
});

test('at 375 × 667 the lesson board is larger than the 286px it had with a strip and a footer button', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.locator('.home-lesson').click();
  await expect(page.locator('.lesson-coach')).toBeVisible();
  expect((await page.locator('.board-wrap').boundingBox())!.width).toBeGreaterThan(310);
});

test('a lesson shows no cells-filled line, through to the end', async ({ page }) => {
  await openLesson(page);
  await expect(page.locator('.progress-line')).toBeHidden();
  await tapFooter(page);
  for (let board = 1; board < LESSON_BANK.pointing.length; board++) {
    await crossOut(page, answer(board));
    await tapFooter(page);
    await tapFooter(page);
  }
  await expect(page.locator('.lesson-done')).toBeVisible();
  await expect(page.locator('.progress-line')).toBeHidden();
});

test('a quick double tap on Next before the last step still shows the last step', async ({ page }) => {
  await openLesson(page);
  const steps = await page.locator('.lesson-coach .walk-progress i').count();
  const next = page.locator('.lesson-coach .walk-next');
  for (let step = 1; step < steps - 1; step++) await next.click();
  await next.dblclick();
  await expect(page.locator('.lesson-coach .walk-progress i.done')).toHaveCount(steps);
  await expect(prompt(page)).toHaveText('Watch how it works');
  await expect(footer(page)).toHaveText('Start practice');
});

test('stepping back to the first step from the keyboard keeps focus in the card', async ({ page }) => {
  await openLesson(page);
  await expect(page.locator('.lesson-coach .walk-next')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.locator('.lesson-coach .walk-back').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.lesson-coach .walk-progress i.done')).toHaveCount(1);
  await expect(page.locator('.lesson-coach .walk-next')).toBeFocused();
});

test('a wrong move in a placement lesson puts focus on Next in the walkthrough', async ({ page }) => {
  await page.goto('/');
  await page.locator('.home-all').click();
  await page.locator('.learn-row[data-lesson="naked-single"]').click();
  await tapFooter(page);
  const board = practiceGame(LESSON_BANK['naked-single'][1], 1);
  const { cell } = allSteps(board.values, getPlayableCandidates(board), 'naked-single')[0].placement!;
  const other = board.values.findIndex((v, i) => !v && i !== cell && getPlayableCandidates(board)[i].size > 1);
  await page.locator(`.board [data-index="${other}"]`).click();
  await page.keyboard.press(String(board.solution[other]));
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Not quite');
  await expect(page.locator('.lesson-coach .walk-next')).toBeFocused();
});

test('the practice action takes taps just outside its pill', async ({ page }) => {
  await openLesson(page);
  await tapFooter(page);
  const b = (await footer(page).boundingBox())!;
  expect(b.height).toBeLessThan(40);
  for (const y of [b.y - 3, b.y + b.height + 3]) expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.lesson-action') !== null, [b.x + b.width / 2, y])).toBe(true);
});

test('quick taps on Next and Back in the middle of a walkthrough all count', async ({ page }) => {
  await page.goto('/');
  await page.locator('.home-all').click();
  await page.locator('.learn-row[data-lesson="swordfish"]').click();
  const steps = await page.locator('.lesson-coach .walk-progress i').count();
  expect(steps).toBeGreaterThanOrEqual(4);
  const next = page.locator('.lesson-coach .walk-next');
  await next.click(); await next.click();
  await expect(page.locator('.lesson-coach .walk-progress i.done')).toHaveCount(3);
  await page.locator('.lesson-coach .walk-back').click();
  await expect(page.locator('.lesson-coach .walk-progress i.done')).toHaveCount(2);
});

test('a keypad tap after the double-tap window counts', async ({ page }) => {
  await openLesson(page);
  await tapFooter(page);
  const target = answer(1)[0];
  await page.locator(`.board [data-index="${target.cell}"]`).click();
  await page.waitForTimeout(400);
  await page.locator('.number-pad .number-key').nth(target.digit - 1).click();
  await expect(footer(page)).toBeEnabled();
});

test('practice, wrong, and right each show their own icon and color', async ({ page }) => {
  await openLesson(page);
  await tapFooter(page);
  // Colors ease in, so read them once the transition has ended.
  const icon = async () => { await page.waitForTimeout(400); return page.locator('.lesson-coach-state svg').evaluate(svg => ({ shape: svg.innerHTML, color: getComputedStyle(svg).color })); };
  const practice = await icon();
  const board = practiceGame(LESSON_BANK.pointing[1], 1);
  const target = answer(1)[0];
  const wrongCell = board.values.findIndex((v, i) => !v && i !== target.cell && getPlayableCandidates(board)[i].size > 1);
  const wrongDigit = [...getPlayableCandidates(board)[wrongCell]].find(d => d !== board.solution[wrongCell])!;
  await crossOut(page, [{ cell: wrongCell, digit: wrongDigit }]);
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Not quite');
  const wrong = await icon();
  await tapFooter(page);
  await crossOut(page, answer(1));
  await tapFooter(page);
  await expect(prompt(page)).toHaveText('Found it');
  const right = await icon();
  expect(new Set([practice.shape, wrong.shape, right.shape]).size).toBe(3);
  expect(new Set([practice.color, wrong.color, right.color]).size).toBe(3);
});

/** Taps the lesson action, then taps whatever replaced it after `later` ms, with fixed event times so the result does not depend on the machine's speed. */
async function doubleTap(page: Page, { later, target }: { later: number; target?: string }) {
  return page.evaluate(async ({ later, target }) => {
    const fire = (element: Element, type: string, at: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'timeStamp', { value: at });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const action = document.querySelector('.lesson-action')!, box = action.getBoundingClientRect(), at = performance.now();
    fire(action, 'mousedown', at); fire(action, 'click', at);
    await new Promise(resolve => setTimeout(resolve, 0));
    const second = target ? document.querySelector(target)! : document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)!;
    return { inControls: Boolean(second.closest('.controls-area')), down: fire(second, 'mousedown', at + later), click: fire(second, 'click', at + later) };
  }, { later, target });
}

for (const action of ['Start practice', 'Try again'] as const) test(`a second tap within 350 ms of ${action} does not reach the controls that replace it`, async ({ page }) => {
  await openLesson(page);
  if (action === 'Try again') {
    await tapFooter(page);
    const board = practiceGame(LESSON_BANK.pointing[1], 1);
    const target = answer(1)[0];
    const wrongCell = board.values.findIndex((v, i) => !v && i !== target.cell && getPlayableCandidates(board)[i].size > 1);
    const wrongDigit = [...getPlayableCandidates(board)[wrongCell]].find(d => d !== board.solution[wrongCell])!;
    await crossOut(page, [{ cell: wrongCell, digit: wrongDigit }]);
    await tapFooter(page);
    await expect(prompt(page)).toHaveText('Not quite');
  }
  const next = page.locator('.lesson-coach .walk-next');
  while (await next.count()) await next.click();
  await page.waitForTimeout(400);
  expect(await doubleTap(page, { later: 100 })).toEqual({ inControls: true, down: true, click: true });
  await expect(prompt(page)).toHaveText('Find the pointing pair');
  await expect(footer(page)).toBeDisabled();
  // A pointing lesson practices in Exclude.
  await expect(page.locator('.mode-option[aria-pressed="true"]')).toHaveClass(/mode-exclude/);
});

test('a key pressed within 350 ms of Start practice is ignored, and one pressed after it counts', async ({ page }) => {
  for (const [later, counts] of [[100, false], [300, false], [400, true]] as const) {
    await openLesson(page);
    const next = page.locator('.lesson-coach .walk-next');
    while (await next.count()) await next.click();
    await page.waitForTimeout(400);
    // Key 1 is not a candidate in practice board 1's selected cell, so a tap that counts focuses 1.
    const { click } = await doubleTap(page, { later, target: '.number-pad .number-key' });
    expect(click).toBe(!counts);
    await expect(page.locator('.digit-focus-bar .focus-indicator')).toHaveCount(counts ? 1 : 0);
    await page.goto('about:blank');
  }
});
