import { expect, test, type Page } from '@playwright/test';
import { gameBefore } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { CLOCK_KEY } from '../src/lib/home.ts';
import { SOLVES_KEY } from '../src/lib/solves.ts';
import { DAILY_KEY, DAILY_SOLVES_KEY, dailyGameKey, dailyId, dailySeed } from '../src/lib/daily.ts';
import { LEARNED_KEY, LESSON_BANDS, lessonOf } from '../src/lib/lessons.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { createGame, enter, type GameState } from '../src/lib/game.ts';

const regular = gameBefore(step => lessonOf(step) === 'pointing');
const regularId: string = JSON.parse(regular).id;
const seed = (page: Page, entries: Record<string, string>) => page.addInitScript(values => { if (!sessionStorage.getItem('seeded')) { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, entries);
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const playDaily = (page: Page) => page.locator('.daily-play').click();
/** Midday, so a test never crosses midnight. */
const midday = (page: Page) => page.clock.install({ time: new Date(2026, 9, 12, 12, 0) });
/** Enters the right digit in the open `level` daily's first open cell. */
async function fillOne(page: Page, level: string) {
  await expect.poll(() => stored(page, dailyGameKey(level as 'easy'))).toBeTruthy();
  const game: { values: number[]; solution: number[] } = await stored(page, dailyGameKey(level as 'easy'));
  const index = game.values.indexOf(0), digit = game.solution[index];
  await page.locator(`.board [data-index="${index}"]`).click();
  await page.keyboard.press(String(digit));
  await expect(page.locator(`.board [data-index="${index}"] .cell-number`)).toHaveText(String(digit));
  return { index, digit };
}

test('playing the daily leaves the regular game unchanged, and each continues where it was', async ({ page }) => {
  await midday(page);
  await seed(page, { [SAVE_KEY]: regular });
  await page.goto('/');
  await playDaily(page);
  const { index, digit } = await fillOne(page, 'expert');
  await page.getByRole('button', { name: 'Home' }).click();
  expect(await stored(page, SAVE_KEY)).toEqual(JSON.parse(regular));
  const played = await stored(page, dailyGameKey('expert'));
  expect(played.id).toMatch(/^daily-\d{4}-\d{2}-\d{2}-expert$/);
  expect(played.values[index]).toBe(digit);
  await page.locator('.resume-row').click();
  await expect(page.locator('.board .cell-number')).toHaveText(JSON.parse(regular).values.filter(Boolean).map(String));
  await page.getByRole('button', { name: 'Home' }).click();
  await playDaily(page);
  await expect(page.locator(`.board [data-index="${index}"] .cell-number`)).toHaveText(String(digit));
});

test('the daily and the regular game keep two clocks', async ({ page }) => {
  await midday(page);
  await seed(page, { [SAVE_KEY]: regular, [CLOCK_KEY]: JSON.stringify({ id: regularId, seconds: 100 }) });
  await page.goto('/');
  await playDaily(page);
  await expect(page.locator('.time-controls .clock')).toHaveText('00:00');
  await page.clock.fastForward(2200);
  await page.getByRole('button', { name: 'Home' }).click();
  expect((await stored(page, CLOCK_KEY)).seconds).toBe(100);
  const daily = await page.evaluate(() => JSON.parse(localStorage.getItem('sudoku.daily-clock.v1.expert') ?? 'null'));
  expect(daily.id).toMatch(/^daily-.*-expert$/);
  expect(daily.seconds).toBeGreaterThan(1.5);
  await page.locator('.resume-row').click();
  await expect(page.locator('.time-controls .clock')).toHaveText(/^01:4\d$/);
});

test('a new regular puzzle from a daily leaves the daily saved and asks only over an unfinished regular game', async ({ page }) => {
  await midday(page);
  await page.goto('/');
  await playDaily(page);
  await fillOne(page, 'easy');
  await expect(page.locator('.daily-label')).toHaveText('Daily · easy');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'New puzzle' }).click();
  await expect(page.locator('.replacement-note')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start puzzle' }).click();
  await expect(page.locator('.board .cell').first()).toBeVisible();
  await expect.poll(async () => (await stored(page, SAVE_KEY))?.id).not.toMatch(/^daily-/);
  expect((await stored(page, dailyGameKey('easy'))).history.length).toBe(1);
});

const TODAY = '2026-10-12';
const daysBefore = (n: number) => Array.from({ length: n }, (_, k) => `2026-10-${String(11 - k).padStart(2, '0')}`);
/** A hard game about a third filled, five minutes in. */
const unfinished = (() => {
  let game = createGame(createPuzzle('hard', 11));
  for (const i of game.givens.flatMap((v, i) => v ? [] : [i]).slice(0, 20)) game = enter(game, { index: i, value: game.solution[i] });
  return game;
})();
/** Today's Medium daily, a few numbers in. */
const dailyMedium = (() => {
  let game = createGame({ ...createPuzzle('medium', dailySeed(TODAY, 'medium')), id: dailyId(TODAY, 'medium') });
  for (const i of game.givens.flatMap((v, i) => v ? [] : [i]).slice(0, 12)) game = enter(game, { index: i, value: game.solution[i] });
  return game;
})();
/** Home at 9:39 pm on October 12 unless `at` says otherwise, with the approved design's states. */
async function homeAt(page: Page, { solved = [], regular = false, progress = false, seconds = 254, daily, at = new Date(2026, 9, 12, 21, 39) }: { solved?: string[]; regular?: boolean; progress?: boolean; seconds?: number; daily?: GameState; at?: Date }) {
  await page.clock.install({ time: at });
  await seed(page, {
    [DAILY_KEY]: JSON.stringify({ level: 'medium' }),
    ...progress ? { [dailyGameKey('medium')]: JSON.stringify(dailyMedium) } : daily ? { [dailyGameKey(daily.difficulty)]: JSON.stringify(daily) } : {},
    [DAILY_SOLVES_KEY]: JSON.stringify({ solved: solved.map(day => ({ day, level: 'medium', seconds: 400 })) }),
    ...regular ? { [SAVE_KEY]: JSON.stringify(unfinished), [CLOCK_KEY]: JSON.stringify({ id: unfinished.id, seconds: 312 }) } : {},
    ...progress ? { 'sudoku.daily-clock.v1.medium': JSON.stringify({ id: dailyMedium.id, seconds }) } : {},
  });
  await page.goto('/');
  await page.locator('.daily-hero').waitFor();
}
const hero = (page: Page) => page.locator('.daily-hero');

test('a first daily is ready to play, with no streak and an empty week', async ({ page }) => {
  await homeAt(page, {});
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is ready' })).toBeVisible();
  await expect(hero(page).locator('.daily-date')).toHaveText('Monday, October 12');
  await expect(hero(page).locator('.daily-streak')).toHaveCount(0);
  await expect(hero(page).locator('.daily-week .solved')).toHaveCount(0);
  await expect(hero(page).locator('.daily-week li').last()).toHaveClass(/today/);
  await expect(hero(page).locator('.home-board text')).not.toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Level: medium. Change' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play today’s puzzle' })).toBeVisible();
});

test('a streak shows its days and the week checks each solved day', async ({ page }) => {
  await homeAt(page, { solved: daysBefore(6) });
  await expect(hero(page).locator('.daily-streak')).toHaveText('6 days in a row');
  await expect(hero(page).locator('.daily-week .solved')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'This month. 6 of the last 7 days solved' })).toBeVisible();
});

test('a solved daily shows the solved board, a check, and the time to the next one', async ({ page }) => {
  await homeAt(page, { solved: [TODAY, ...daysBefore(6)] });
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is solved' })).toBeVisible();
  await expect(hero(page).locator('.daily-streak')).toHaveText('7 days in a row');
  await expect(hero(page).locator('.daily-check')).toBeVisible();
  await expect(hero(page).locator('.home-board text')).toHaveCount(81);
  await expect(hero(page).locator('.daily-next')).toHaveText('Next in 2h 21m');
  await expect(page.locator('.daily-play')).toHaveCount(0);
});

for (const solved of [false, true]) test(`an unfinished game shows as a Continue row under the ${solved ? 'solved' : 'unsolved'} daily`, async ({ page }) => {
  await homeAt(page, { solved: solved ? [TODAY, ...daysBefore(6)] : daysBefore(6), regular: true });
  await expect(page.getByRole('heading', { name: `Today’s puzzle is ${solved ? 'solved' : 'ready'}` })).toBeVisible();
  const row = page.locator('.resume-row');
  await expect(row.locator('strong')).toHaveText('Hard');
  await expect(row.locator('.resume-meta')).toHaveText(/^\d+% · 05:12$/);
  await expect(row).toHaveAccessibleName(/^Continue your hard puzzle, \d+% filled$/);
  await row.click();
  await expect(page.locator('.difficulty-button .capitalize')).toHaveText('hard');
});

test('a daily in progress offers Continue with its time', async ({ page }) => {
  await homeAt(page, { solved: daysBefore(6), progress: true });
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is waiting' })).toBeVisible();
  await expect(page.locator('.daily-play')).toHaveText('Continue · 04:14');
  await expect(hero(page).locator('.home-board text.entered')).toHaveCount(12);
  await page.locator('.daily-play').click();
  await expect(page.locator('.daily-label')).toHaveText('Daily · medium');
  await expect(page.locator('.time-controls .clock')).toHaveText(/^04:1[45]$/);
});

test('a new daily level shows that level’s daily for today, and is kept', async ({ page }) => {
  await homeAt(page, {});
  const board = () => hero(page).locator('.home-board').textContent();
  await expect(hero(page).locator('.home-board text')).not.toHaveCount(0);
  const medium = await board();
  await page.getByRole('button', { name: 'Level: medium. Change' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^medium:/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^hard:/ }).click();
  await expect(page.getByRole('button', { name: 'Level: hard. Change' })).toBeFocused();
  await expect.poll(board).not.toBe(medium);
  await expect(hero(page).locator('.home-board text')).not.toHaveCount(0);
  expect((await stored(page, DAILY_KEY)).level).toBe('hard');
  await page.locator('.daily-play').click();
  await expect(page.locator('.daily-label')).toHaveText('Daily · hard');
});

test('solving the daily at any level marks the day, at every level', async ({ page }) => {
  const easy = createGame({ ...createPuzzle('easy', dailySeed(TODAY, 'easy')), id: dailyId(TODAY, 'easy') });
  const last = easy.givens.indexOf(0);
  await homeAt(page, { solved: daysBefore(2), daily: { ...easy, values: easy.solution.map((v, i) => i === last ? 0 : v) } });
  await page.getByRole('button', { name: 'Level: medium. Change' }).click();
  await page.getByRole('button', { name: /^easy:/ }).click();
  await page.locator('.daily-play').click();
  await page.locator(`.board [data-index="${last}"]`).click();
  await page.keyboard.press(String(easy.solution[last]));
  await expect(page.locator('.completion')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is solved' })).toBeVisible();
  await expect(hero(page).locator('.daily-streak')).toHaveText('3 days in a row');
  await expect(hero(page).locator('.daily-week .today.solved')).toHaveCount(1);
  expect((await stored(page, DAILY_SOLVES_KEY)).solved).toContainEqual(expect.objectContaining({ day: TODAY, level: 'easy' }));
  expect((await stored(page, SOLVES_KEY)).solves).toContainEqual(expect.objectContaining({ id: dailyId(TODAY, 'easy'), difficulty: 'easy' }));
  await page.getByRole('button', { name: 'Level: easy. Change' }).click();
  await page.getByRole('button', { name: /^hard:/ }).click();
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is ready' })).toBeVisible();
  await expect(hero(page).locator('.daily-week .today.solved')).toHaveCount(1);
  await expect(hero(page).locator('.daily-streak')).toHaveText('3 days in a row');
});

test('after solving Medium, Hard’s daily shows its own unsolved board with Play, and the day stays checked', async ({ page }) => {
  const medium = createGame({ ...createPuzzle('medium', dailySeed(TODAY, 'medium')), id: dailyId(TODAY, 'medium') });
  const last = medium.givens.indexOf(0);
  await homeAt(page, { solved: daysBefore(1), daily: { ...medium, values: medium.solution.map((v, i) => i === last ? 0 : v) } });
  await page.locator('.daily-play').click();
  await page.locator(`.board [data-index="${last}"]`).click();
  await page.keyboard.press(String(medium.solution[last]));
  await expect(page.locator('.completion')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is solved' })).toBeVisible();
  await page.getByRole('button', { name: 'Level: medium. Change' }).click();
  await page.getByRole('button', { name: /^hard:/ }).click();
  await expect(page.getByRole('button', { name: 'Level: hard. Change' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is ready' })).toBeVisible();
  await expect(hero(page).locator('.home-board text')).not.toHaveCount(0);
  const hard = createPuzzle('hard', dailySeed(TODAY, 'hard'));
  await expect(hero(page).locator('.home-board text')).toHaveCount(hard.givens.filter(Boolean).length);
  await expect(hero(page).locator('.home-board text.entered, .daily-check, .daily-next')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Play today’s puzzle' })).toBeVisible();
  await expect(hero(page).locator('.daily-week .today.solved')).toHaveCount(1);
  await expect(hero(page).locator('.daily-streak')).toHaveText('2 days in a row');
});

test('the week row opens the month, with a check on each day solved, and the month closes back to it', async ({ page }) => {
  await homeAt(page, { solved: [TODAY, ...daysBefore(3), '2026-09-30'] });
  await page.locator('.daily-week-link').click();
  await expect(page.getByRole('heading', { name: 'Daily', level: 1 })).toBeVisible();
  await expect(page.locator('.history-streak')).toHaveText('4 days in a row');
  await expect(page.locator('#history-month')).toHaveText('October');
  await expect(page.locator('.daily-day.solved')).toHaveCount(4);
  await expect(page.locator(`.daily-day[data-day="${TODAY}"]`)).toHaveClass(/today/);
  await expect(page.locator('.daily-day[data-day="2026-10-05"]')).toHaveClass(/missed/);
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.locator('#history-month')).toHaveText('September');
  await expect(page.locator('.daily-day.solved')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.daily-week-link')).toBeFocused();
  await page.locator('.daily-week-link').click();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.locator('.daily-hero')).toBeVisible();
});

test('at midnight a solved daily gives way to the new day’s, and the streak carries over', async ({ page }) => {
  await homeAt(page, { solved: [TODAY, ...daysBefore(2)], at: new Date(2026, 9, 12, 23, 59) });
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is solved' })).toBeVisible();
  await expect(hero(page).locator('.daily-next')).toHaveText('Next in 1m');
  await page.clock.runFor(61_000);
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is ready' })).toBeVisible();
  await expect(hero(page).locator('.daily-date')).toHaveText('Tuesday, October 13');
  await expect(hero(page).locator('.daily-streak')).toHaveText('3 days in a row');
  await expect(hero(page).locator('.daily-week .solved')).toHaveCount(3);
  await expect(hero(page).locator('.home-board text')).not.toHaveCount(0);
});

test('a daily finished after midnight counts for the day it was', async ({ page }) => {
  const medium = createGame({ ...createPuzzle('medium', dailySeed(TODAY, 'medium')), id: dailyId(TODAY, 'medium') });
  const last = medium.givens.indexOf(0);
  await homeAt(page, { daily: { ...medium, values: medium.solution.map((v, i) => i === last ? 0 : v) }, at: new Date(2026, 9, 12, 23, 59, 30) });
  await page.locator('.daily-play').click();
  await page.locator(`.board [data-index="${last}"]`).click();
  await page.clock.runFor(60_000);
  await page.keyboard.press(String(medium.solution[last]));
  await expect(page.locator('.completion')).toBeVisible();
  expect((await stored(page, DAILY_SOLVES_KEY)).solved).toEqual([expect.objectContaining({ day: TODAY, level: 'medium' })]);
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is ready' })).toBeVisible();
  await expect(hero(page).locator('.daily-streak')).toHaveText('1 day in a row');
  await expect(hero(page).locator('.daily-week li').nth(5)).toHaveClass(/solved/);
});

test('coming back to Home on a new day shows the new day’s daily', async ({ page }) => {
  await homeAt(page, { solved: [TODAY, ...daysBefore(2)] });
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is solved' })).toBeVisible();
  await page.clock.setSystemTime(new Date(2026, 9, 13, 8, 0));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is ready' })).toBeVisible();
  await expect(hero(page).locator('.daily-date')).toHaveText('Tuesday, October 13');
  await expect(hero(page).locator('.daily-next')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Play today’s puzzle' })).toBeVisible();
});

test('Play on a Home left open past midnight opens the new day’s daily, not the cached one', async ({ page }) => {
  await homeAt(page, { solved: daysBefore(2), progress: true });
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is waiting' })).toBeVisible();
  await page.clock.setSystemTime(new Date(2026, 9, 13, 8, 0));
  await page.locator('.daily-play').click();
  await expect(page.locator('.daily-label')).toHaveText('Daily · medium');
  await expect.poll(async () => (await stored(page, dailyGameKey('medium')))?.id).toBe(dailyId('2026-10-13', 'medium'));
  await expect(page.locator('.board .cell.entered .cell-number')).toHaveCount(0);
});

test('yesterday’s unfinished daily gives way to today’s', async ({ page }) => {
  await homeAt(page, { solved: daysBefore(2), progress: true, at: new Date(2026, 9, 13, 9, 0) });
  await expect(page.getByRole('heading', { name: 'Today’s puzzle is ready' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play today’s puzzle' })).toBeVisible();
  await expect(hero(page).locator('.home-board text')).not.toHaveCount(0);
  await expect(hero(page).locator('.home-board text.entered')).toHaveCount(0);
  await expect.poll(async () => (await stored(page, dailyGameKey('medium')))?.id).toBe(dailyId('2026-10-13', 'medium'));
});

test('with site data blocked, Home offers the daily, and playing it keeps the regular game to continue', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }));
  await page.goto('/');
  await expect(page.locator('.daily-hero .home-board text')).not.toHaveCount(0);
  await page.getByRole('button', { name: /^New easy puzzle/ }).click();
  await expect(page.locator('.board .cell').first()).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.locator('.resume-row')).toBeVisible();
  await playDaily(page);
  await expect(page.locator('.daily-label')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.locator('.resume-row strong')).toHaveText('Easy');
  await page.locator('.resume-row').click();
  await expect(page.locator('.difficulty-button .capitalize')).toHaveText('easy');
});

test('Continue with the longest time fits on one line on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await homeAt(page, { solved: daysBefore(6), progress: true, seconds: 3599 });
  const play = page.locator('.daily-play');
  await expect(play).toHaveText('Continue · 59:59');
  const fit = await play.evaluate(button => {
    const box = button.getBoundingClientRect(), card = button.closest('.daily-hero')!.getBoundingClientRect();
    return { height: box.height, left: box.left - card.left, right: card.right - box.right, wraps: button.scrollWidth > button.clientWidth };
  });
  expect(fit.height).toBeLessThanOrEqual(44);
  expect(fit.left).toBeGreaterThanOrEqual(12);
  expect(fit.right).toBeGreaterThanOrEqual(12);
  expect(fit.wraps).toBe(false);
});

// The installed iPhone app pads the page by the notch and home-bar areas; the variables stand in for env(safe-area-inset-*).
for (const [width, height, top, bottom] of [[375, 667, 20, 0], [375, 812, 50, 34], [390, 844, 47, 34]] as const) {
  test(`Home fits in the installed app at ${width} × ${height} with ${top}px and ${bottom}px safe areas`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(([t, b]) => document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.setProperty('--safe-top', `${t}px`);
      document.documentElement.style.setProperty('--safe-bottom', `${b}px`);
    }), [top, bottom]);
    await homeAt(page, { solved: daysBefore(6), progress: true, regular: true });
    await expect(page.locator('.resume-row')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  });
}

// Android's text size setting scales text in px, so `large` stands in for it at 130%.
for (const [width, height, large] of [[375, 667, false], [360, 640, false], [320, 568, false], [300, 600, false], [280, 653, false], [360, 640, true], [320, 568, true]] as const) {
  test(`Home's bar fits across ${width} px with four-digit counts and Install${large ? ', with large text' : ''}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    if (large) await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => document.head.append(Object.assign(document.createElement('style'), { textContent: '.level-picker { font-size: 130% !important; }' }))));
    await page.addInitScript(([key, learned]) => {
      localStorage.setItem('sudoku.solved.v1', JSON.stringify({ ids: Array.from({ length: 1000 }, (_, k) => `p${k}-hard`) }));
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(learned.map(id => [id, '2026-10-01']))));
    }, [LEARNED_KEY, LESSON_BANDS.flatMap(band => band.lessons)] as const);
    await homeAt(page, {});
    await expect(page.locator('.home-install')).toBeVisible();
    await expect(page.locator('.home-solved-count')).toHaveAccessibleName('History, 1000 solved');
    const sizes = await page.evaluate(() => {
      const picker = document.querySelector('.level-picker')!;
      return { page: document.documentElement.scrollWidth, view: innerWidth, settings: document.querySelector('.home-bar .settings-button')!.getBoundingClientRect().right,
        pickerOverflow: picker.scrollWidth - picker.clientWidth, pickerRight: picker.getBoundingClientRect().right, actionsLeft: document.querySelector('.home-bar .app-actions')!.getBoundingClientRect().left };
    });
    expect(sizes.page).toBeLessThanOrEqual(sizes.view);
    expect(sizes.settings).toBeLessThanOrEqual(sizes.view);
    expect(sizes.pickerOverflow).toBeLessThanOrEqual(0);
    expect(sizes.pickerRight).toBeLessThanOrEqual(sizes.actionsLeft);
  });
}

for (const [width, height] of [[390, 844], [375, 667], [360, 640], [430, 932], [1440, 790]] as const) for (const regular of [true, false]) {
  test(`Home fits without scrolling at ${width} × ${height}, ${regular ? 'with' : 'without'} a game to continue`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await homeAt(page, { solved: daysBefore(6), progress: true, regular });
    await expect(page.locator('.resume-row')).toHaveCount(regular ? 1 : 0);
    const sizes = await page.evaluate(() => ({ page: document.documentElement.scrollHeight, view: innerHeight, rows: document.querySelector('.home-rows')!.getBoundingClientRect().bottom }));
    expect(sizes.page).toBeLessThanOrEqual(sizes.view);
    expect(sizes.rows).toBeLessThanOrEqual(sizes.view);
  });
}

test('a new puzzle from a daily names the regular game it would replace', async ({ page }) => {
  await seed(page, { [SAVE_KEY]: regular });
  await page.goto('/');
  await playDaily(page);
  await expect(page.locator('.daily-label')).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'New puzzle' }).click();
  await expect(page.locator('.replacement-note')).toHaveText('This will replace your expert puzzle in progress.');
});

test('the daily that reaches a 7-day streak shows the flame, and the share image carries the date', async ({ page }) => {
  const medium = createGame({ ...createPuzzle('medium', dailySeed(TODAY, 'medium')), id: dailyId(TODAY, 'medium') });
  const last = medium.givens.indexOf(0);
  await page.addInitScript(() => { navigator.canShare = () => true; navigator.share = async data => { Object.assign(window, { sharedName: data?.files?.[0]?.name }); }; });
  await homeAt(page, { solved: daysBefore(6), daily: { ...medium, values: medium.solution.map((v, i) => i === last ? 0 : v) } });
  await playDaily(page);
  await page.locator(`.board [data-index="${last}"]`).click();
  await page.keyboard.press(String(medium.solution[last]));
  await expect(page.locator('.finish-chip.earned')).toHaveText('7 days7-day streak');
  expect(Object.keys((await stored(page, 'sudoku.accomplishments.v1')).earned)).toContain('streak-7');
  await page.locator('.completion').getByRole('button', { name: 'Share' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { sharedName?: string }).sharedName)).toBe(`sudoclue-${TODAY}-medium.png`);
});
