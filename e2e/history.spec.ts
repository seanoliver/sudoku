import { expect, test, type Page } from '@playwright/test';
import { gameBefore } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { lessonOf } from '../src/lib/lessons.ts';
import { SOLVED_KEY } from '../src/lib/home.ts';
import { dayKey, SOLVES_KEY, type Solve } from '../src/lib/solves.ts';

const inProgress = gameBefore(step => lessonOf(step) === 'pointing');
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };
const givens = JSON.parse(inProgress).givens.join('');
const solve = (id: string, difficulty: Solve['difficulty'], seconds: number, ago: number): Solve => ({ id, difficulty, seconds, day: daysAgo(ago), givens });

async function seed(page: Page, solves: Solve[], extraSolved = 0) {
  const ids = [...solves.map(s => s.id), ...Array.from({ length: extraSolved }, (_, k) => `old${k}-easy`)];
  await page.addInitScript(([solvesKey, solvedKey, list, solvedIds]) => {
    localStorage.setItem(solvesKey as string, JSON.stringify({ solves: list }));
    localStorage.setItem(solvedKey as string, JSON.stringify({ ids: solvedIds }));
  }, [SOLVES_KEY, SOLVED_KEY, solves, ids] as const);
}

const almostSolved = () => {
  const game = JSON.parse(inProgress);
  const last = game.givens.findIndex((v: number) => !v);
  const values = game.solution.map((v: number, i: number) => i === last ? 0 : v);
  return { game: JSON.stringify({ ...game, id: 'solve-me-hard', difficulty: 'hard', source: undefined, values, notes: game.notes.map(() => []), exclusions: game.exclusions.map(() => []), noteOrigins: game.noteOrigins.map(() => null), history: [], redoHistory: [] }), last, digit: game.solution[last] as number };
};

test('a finished puzzle appears in History, and Home is one tap back', async ({ page }) => {
  const { game, last, digit } = almostSolved();
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, game]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator(`.board [data-index="${last}"]`).click();
  await page.keyboard.press(String(digit));
  await expect(page.locator('.completion')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await page.locator('.home-solved-count').click();
  await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('Hard');
  await expect(page.locator('.history-row')).toContainText('Today');
  await expect(page.locator('.history-row .history-time')).toHaveText(/^\d+:\d\d$/);
  await expect(page.locator('.history-streak')).toHaveCount(0);
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.locator('.home-solved-count')).toBeFocused();
});

test('History shows the streak, each level’s count and best time, and earlier solves', async ({ page }) => {
  await seed(page, [solve('a', 'easy', 300, 0), solve('b', 'hard', 905, 0), solve('c', 'easy', 250, 1), solve('d', 'medium', 500, 2), solve('e', 'expert', 2000, 5)], 3);
  await page.goto('/');
  await expect(page.locator('.home-solved-count')).toHaveText('8 solved');
  await page.locator('.home-solved-count').click();
  await expect(page.locator('.history-streak')).toContainText('3 days');
  await expect(page.locator('.history-level.level-easy')).toContainText('2');
  await expect(page.locator('.history-level.level-easy')).toContainText('Best 4:10');
  await expect(page.locator('.history-level.level-hard')).toContainText('Best 15:05');
  await expect(page.locator('.history-row')).toHaveCount(5);
  await expect(page.locator('.history-earlier')).toHaveText('+3 earlier');
});

test('tapping a day shows only its solves, and tapping it again shows all', async ({ page }) => {
  await seed(page, [solve('a', 'easy', 300, 0), solve('b', 'hard', 905, 0), solve('c', 'easy', 250, 40)]);
  await page.goto('/');
  await page.locator('.home-solved-count').click();
  const today = page.locator(`.history-day[data-day="${daysAgo(0)}"]`);
  await expect(today.locator('.history-dot')).toHaveCount(2);
  await today.click();
  await expect(today).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.history-row')).toHaveCount(2);
  await today.click();
  await expect(page.locator('.history-row')).toHaveCount(3);
});

test('the calendar pages back through earlier months but not past this one', async ({ page }) => {
  await seed(page, [solve('a', 'easy', 300, 0)]);
  await page.goto('/');
  await page.locator('.home-solved-count').click();
  const month = (offset: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return d.toLocaleDateString('en-US', { month: 'long' }); };
  await expect(page.locator('.history-month')).toContainText(month(0));
  await expect(page.getByRole('button', { name: 'Next month' })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.locator('.history-month')).toContainText(month(-1));
});

test('Escape returns Home from History', async ({ page }) => {
  await seed(page, [solve('a', 'easy', 300, 0)]);
  await page.goto('/');
  await page.locator('.home-solved-count').click();
  await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.home-solved-count')).toBeFocused();
});

test('reopening a game that was already finished does not record it again as solved today', async ({ page }) => {
  const game = JSON.parse(almostSolved().game);
  await page.addInitScript(([key, value, id]) => { localStorage.setItem(key, value); localStorage.setItem('sudoku.clock.v1', JSON.stringify({ id, seconds: 777 })); }, [SAVE_KEY, JSON.stringify({ ...game, values: game.solution }), game.id]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Nicely solved/ })).toBeVisible();
  await page.waitForTimeout(300);
  expect(await page.evaluate(k => localStorage.getItem(k), SOLVES_KEY)).toBeNull();
});

test('forward while History is open leaves Home and the browser in step', async ({ page }) => {
  await seed(page, [solve('a', 'easy', 300, 0)]);
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, inProgress]);
  await page.goto('about:blank');
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.goBack();
  await page.locator('.home-solved-count').click();
  await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('History hides times when Hide timer is on', async ({ page }) => {
  await seed(page, [solve('a', 'easy', 300, 0)]);
  await page.addInitScript(() => localStorage.setItem('sudoku.preferences.v1', JSON.stringify({ theme: 'system', blockIncorrectAnswers: true, highlightPeers: true, hideTimer: true })));
  await page.goto('/');
  await page.locator('.home-solved-count').click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-time')).toHaveCount(0);
  await expect(page.locator('.history-level.level-easy')).not.toContainText('Best');
});

test('the calendar and the solved chip name what they show', async ({ page }) => {
  await seed(page, [solve('a', 'easy', 300, 0), solve('b', 'hard', 905, 0), ...['c', 'd', 'e'].map(id => solve(id, 'medium', 400, 0))]);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'History, 5 solved' })).toBeVisible();
  await page.locator('.home-solved-count').click();
  const today = page.locator(`.history-day[data-day="${daysAgo(0)}"]`);
  await expect(today).toHaveAttribute('aria-label', /5 solves: 1 easy, 3 medium, 1 hard$/);
  await expect(today.locator('.history-more-dots')).toHaveCount(1);
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('button', { name: 'Next month' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Next month' })).toBeFocused();
});

test('Show more moves focus to the first newly shown solve', async ({ page }) => {
  await seed(page, Array.from({ length: 35 }, (_, k) => solve(`m${k}`, 'easy', 300 + k, 0)));
  await page.goto('/');
  await page.locator('.home-solved-count').click();
  await expect(page.locator('.history-row')).toHaveCount(30);
  await page.getByRole('button', { name: 'Show more' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.history-row')).toHaveCount(35);
  await expect(page.locator('.history-row').nth(30)).toBeFocused();
});

test('the header never counts fewer solves than History lists', async ({ page }) => {
  await seed(page, [solve('a', 'expert', 900, 0), solve('b', 'expert', 950, 1), solve('c', 'expert', 990, 2)]);
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ ids: ['a'] })), SOLVED_KEY);
  await page.goto('/');
  await page.locator('.home-solved-count').click();
  await expect(page.locator('.learn-count')).toHaveText('3 solved');
  await expect(page.locator('.history-earlier')).toHaveCount(0);
});

test('a day in an earlier year names its year', async ({ page }) => {
  const d = new Date(); d.setFullYear(d.getFullYear() - 1);
  await seed(page, [{ ...solve('a', 'easy', 300, 0), day: dayKey(d) }]);
  await page.goto('/');
  await page.locator('.home-solved-count').click();
  for (let k = 0; k < 12; k++) await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.locator(`.history-day[data-day="${dayKey(d)}"]`)).toHaveAttribute('aria-label', new RegExp(`${d.getFullYear()}`));
});

test('History left open past midnight moves Today to the new day', async ({ page }) => {
  const late = new Date(); late.setHours(23, 59, 30, 0);
  await page.clock.install({ time: late });
  await seed(page, [{ ...solve('a', 'easy', 300, 0), day: dayKey(late) }]);
  await page.goto('/');
  await page.locator('.home-solved-count').click();
  await expect(page.locator(`.history-day.today[data-day="${dayKey(late)}"]`)).toHaveCount(1);
  await page.clock.fastForward('01:00');
  const next = new Date(late); next.setDate(next.getDate() + 1);
  await expect(page.locator('.history-day.today')).toHaveAttribute('data-day', dayKey(next));
});
