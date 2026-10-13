import { expect, test, type Page } from '@playwright/test';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { SOLVED_KEY } from '../src/lib/home.ts';
import { CLOCK_KEY } from '../src/lib/home.ts';

const game = createGame(createPuzzle('easy', 4242));
const open = game.givens.flatMap((v, i) => v ? [] : [i]);
const last = open.at(-1)!;
const nearlySolved = { ...game, values: game.solution.map((v, i) => i === last ? 0 : v) };

async function start(page: Page, saved: object = game) {
  await page.addInitScript(([saveKey, value, solvedKey]) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem(saveKey, value); localStorage.setItem(solvedKey, JSON.stringify({ ids: ['a-easy'] })); sessionStorage.setItem('seeded', '1');
  }, [SAVE_KEY, JSON.stringify(saved), SOLVED_KEY]);
  // Count started transitions: `document.activeViewTransition` alone races, because React starts the transition after the click returns.
  await page.addInitScript(() => {
    const w = window as unknown as Watch;
    w.transitions = []; w.started = 0; w.finished = 0;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args: Parameters<typeof start>) => {
      const transition = start(...args);
      w.started++;
      transition.finished.finally(() => { w.finished++; });
      return transition;
    };
    document.addEventListener('animationstart', event => { if (event.pseudoElement.startsWith('::view-transition')) w.transitions.push(`${event.animationName} ${event.pseudoElement}`); }, true);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).waitFor();
}
type Watch = { transitions: string[]; started: number; finished: number };
const transitions = (page: Page) => page.evaluate(() => (window as unknown as Watch).transitions.splice(0));
/** Runs `act`, then waits for the view transition it starts to end; React holds focus and key listeners until then. */
async function navigate(page: Page, act: () => Promise<unknown>) {
  const before = await page.evaluate(() => (window as unknown as Watch).started);
  await act();
  await page.waitForFunction(n => { const w = window as unknown as Watch; return w.started > n && w.finished === w.started; }, before);
}

test('History pushes in from the right and slides back out, with focus on what opened it', async ({ page }) => {
  await start(page);
  await navigate(page, () => page.locator('.home-solved-count').click());
  await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
  expect(await transitions(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^screen-in /), expect.stringMatching(/^screen-under-out /)]));
  await expect(page.locator('.lesson-back')).toBeFocused();
  await navigate(page, () => page.locator('.lesson-back').click());
  expect(await transitions(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^screen-out /), expect.stringMatching(/^screen-under-in /)]));
  await expect(page.locator('.home-solved-count')).toBeFocused();
});

test('Escape pops Learn once the push has finished', async ({ page }) => {
  await start(page);
  await navigate(page, () => page.locator('.home-all').click());
  await transitions(page);
  await navigate(page, () => page.keyboard.press('Escape'));
  expect(await transitions(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^screen-out /)]));
  await expect(page.locator('.home-all')).toBeFocused();
});

test('Continue grows the mini-board into the game board, and Home shrinks it back', async ({ page }) => {
  await start(page);
  await navigate(page, () => page.getByRole('button', { name: /^Continue/ }).click());
  expect(await transitions(page)).toEqual(expect.arrayContaining([expect.stringContaining('::view-transition-group(board)')]));
  await expect(page.locator(`.board [data-index="${game.values.indexOf(0)}"]`)).toBeFocused();
  await navigate(page, () => page.getByRole('button', { name: 'Home' }).click());
  expect(await transitions(page)).toEqual(expect.arrayContaining([expect.stringContaining('::view-transition-group(board)')]));
  await expect(page.locator('.resume-row')).toBeFocused();
});

test('browser Back from the game changes the screen without a transition', async ({ page }) => {
  await start(page);
  await navigate(page, () => page.getByRole('button', { name: /^Continue/ }).click());
  const before = await page.evaluate(() => (window as unknown as Watch).started);
  await page.goBack();
  await expect(page.getByRole('button', { name: /^Continue/ })).toBeVisible();
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as unknown as Watch).started)).toBe(before);
});

test('a replay pushes over the finished game, and two quick Escapes close it once', async ({ page }) => {
  await start(page, nearlySolved);
  await navigate(page, () => page.getByRole('button', { name: /^Continue/ }).click());
  await page.locator(`.board [data-index="${last}"]`).click();
  await page.keyboard.press(String(game.solution[last]));
  await transitions(page);
  await navigate(page, () => page.getByRole('button', { name: 'Replay' }).click());
  expect(await transitions(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^screen-in /)]));
  await expect(page.getByRole('button', { name: 'Play' })).toBeFocused();
  await expect(page.locator('.screen-compact-title')).toHaveCSS('opacity', '1');
  await navigate(page, () => page.evaluate(() => { for (let k = 0; k < 2; k++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }));
  await expect(page.locator('.completion')).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.locator('.completion')).toBeVisible();
  await expect(page.locator('.replay-button')).toBeFocused();
});

test('the board travels above both screens on the way back to Home', async ({ page }) => {
  await start(page);
  await navigate(page, () => page.getByRole('button', { name: /^Continue/ }).click());
  const zIndex = page.evaluate(() => new Promise<string>(resolve => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args: Parameters<typeof start>) => {
      const transition = start(...args);
      document.startViewTransition = start;
      transition.ready.then(() => resolve(getComputedStyle(document.documentElement, '::view-transition-group(board)').zIndex));
      return transition;
    };
  }));
  await page.getByRole('button', { name: 'Home' }).click();
  expect(await zIndex).toBe('2');
});

test('the game bar shows the saved time from the first frame of Continue', async ({ page }) => {
  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key, value);
    const w = window as unknown as { firstClock?: string };
    new MutationObserver((_, observer) => {
      const clock = document.querySelector('.time-controls .clock');
      if (clock) { w.firstClock = clock.textContent ?? ''; observer.disconnect(); }
    }).observe(document, { childList: true, subtree: true, characterData: true });
  }, [CLOCK_KEY, JSON.stringify({ id: game.id, seconds: 754 })]);
  await start(page);
  await navigate(page, () => page.getByRole('button', { name: /^Continue/ }).click());
  expect(await page.evaluate(() => (window as unknown as { firstClock?: string }).firstClock)).toBe('12:34');
});

test('after the Home button, browser Back and Forward still change screens without a transition', async ({ page }) => {
  await start(page);
  await navigate(page, () => page.getByRole('button', { name: /^Continue/ }).click());
  await navigate(page, () => page.getByRole('button', { name: 'Home' }).click());
  const before = await page.evaluate(() => (window as unknown as Watch).started);
  await page.goForward();
  await expect(page.locator('.board')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: /^Continue/ })).toBeVisible();
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as unknown as Watch).started)).toBe(before);
});

test('a back control pressed by a finished iOS swipe changes the screen without a transition', async ({ page }) => {
  await start(page);
  await navigate(page, () => page.locator('.home-solved-count').click());
  const before = await page.evaluate(() => (window as unknown as Watch).started);
  await page.evaluate(() => { document.querySelector('.app')!.classList.add('swiping'); (document.querySelector('.lesson-back') as HTMLButtonElement).click(); });
  await expect(page.locator('.home-solved-count')).toBeVisible();
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as unknown as Watch).started)).toBe(before);
});

test('browser Back pressed during the grow into the game returns Home', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.locator('.board').waitFor({ state: 'attached' });
  expect(await page.evaluate(() => (window as unknown as Watch).finished < (window as unknown as Watch).started)).toBe(true);
  await page.goBack();
  await expect(page.getByRole('button', { name: /^Continue/ })).toBeVisible();
  await expect(page.locator('.board')).toHaveCount(0);
});

test('two quick taps on Replay open it once, and its back control still closes it', async ({ page }) => {
  await start(page, nearlySolved);
  await navigate(page, () => page.getByRole('button', { name: /^Continue/ }).click());
  await page.locator(`.board [data-index="${last}"]`).click();
  await page.keyboard.press(String(game.solution[last]));
  await expect(page.locator('.replay-button')).toBeVisible();
  const before = await page.evaluate(() => history.length);
  await navigate(page, () => page.evaluate(() => { const replay = document.querySelector<HTMLButtonElement>('.replay-button')!; replay.click(); replay.click(); }));
  expect(await page.evaluate(() => history.length)).toBe(before + 1);
  await navigate(page, () => page.getByRole('button', { name: 'Your game' }).click());
  await expect(page.locator('.completion')).toBeVisible();
});

for (const [name, leave] of [['browser Back', (page: Page) => page.goBack()], ['Escape', (page: Page) => page.keyboard.press('Escape')]] as const) {
  test(`${name} pressed while Replay pushes in returns to the finished game`, async ({ page }) => {
    await start(page, nearlySolved);
    await navigate(page, () => page.getByRole('button', { name: /^Continue/ }).click());
    await page.locator(`.board [data-index="${last}"]`).click();
    await page.keyboard.press(String(game.solution[last]));
    await page.getByRole('button', { name: 'Replay' }).click();
    await page.locator('.replay').waitFor({ state: 'attached' });
    await leave(page);
    await expect(page.locator('.completion')).toBeVisible();
    await expect(page.locator('.replay')).toHaveCount(0);
  });
}

test('a pushed screen opens at its top, and Home comes back where it was left', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await start(page);
  await page.evaluate(() => scrollTo(0, document.scrollingElement!.scrollHeight));
  const homeScroll = await page.evaluate(() => scrollY);
  expect(homeScroll).toBeGreaterThan(100);
  await navigate(page, () => page.locator('.home-solved-count').click());
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('.screen-nav')).toHaveAttribute('data-collapsed', 'false');
  await navigate(page, () => page.locator('.lesson-back').click());
  expect(await page.evaluate(() => scrollY)).toBe(homeScroll);
});

test('the screen on top of a push or pop is opaque, so the screen under it does not show through', async ({ page }) => {
  await start(page);
  const topBackground = (animationName: 'screen-in' | 'screen-out', control: string) => page.evaluate(([animationName, control]) => new Promise<string>(resolve => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args: Parameters<typeof start>) => {
      const transition = start(...args);
      document.startViewTransition = start;
      transition.ready.then(() => {
        const top = document.getAnimations().find(animation => (animation as CSSAnimation).animationName === animationName)!;
        resolve(getComputedStyle(document.documentElement, (top.effect as KeyframeEffect).pseudoElement).backgroundColor);
      });
      return transition;
    };
    document.querySelector<HTMLElement>(control)!.click();
  }), [animationName, control] as const);
  expect(await topBackground('screen-in', '.home-solved-count')).not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
  await page.waitForFunction(() => { const w = window as unknown as Watch; return w.finished === w.started; });
  expect(await topBackground('screen-out', '.lesson-back')).not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
});

test('the board shrinks into the daily card only when it shows the open daily', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) localStorage.setItem('sudoku.daily.v1', JSON.stringify({ level: 'medium' })); });
  await start(page);
  await page.locator('.daily-hero .home-board text').first().waitFor();
  await navigate(page, () => page.locator('.daily-play').click());
  await expect(page.locator('.daily-label')).toBeVisible();
  await navigate(page, () => page.getByRole('button', { name: 'Home' }).click());
  expect(await transitions(page)).toEqual(expect.arrayContaining([expect.stringContaining('::view-transition-group(board)')]));
  await page.getByRole('button', { name: 'Daily level: medium. Change' }).click();
  await page.getByRole('button', { name: /^hard:/ }).click();
  await expect(page.getByRole('button', { name: 'Daily level: hard. Change' })).toBeVisible();
  await page.goForward();
  await expect(page.locator('.daily-label')).toHaveText('Daily · medium');
  await transitions(page);
  await navigate(page, () => page.getByRole('button', { name: 'Home' }).click());
  expect(await transitions(page)).not.toEqual(expect.arrayContaining([expect.stringContaining('::view-transition-group(board)')]));
});
