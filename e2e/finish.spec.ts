import { expect, test, type Page } from '@playwright/test';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { PREFS_KEY } from '../src/lib/preferences.ts';
import { CLOCK_KEY } from '../src/lib/home.ts';
import { SOLVES_KEY, type Solve } from '../src/lib/solves.ts';

const game = createGame(createPuzzle('medium', 4242));
const last = game.givens.findIndex(v => !v);
const nearly = JSON.stringify({ ...game, values: game.solution.map((v, i) => i === last ? 0 : v) });
const prefs = { theme: 'system', blockIncorrectAnswers: false, highlightPeers: true, smartHighlighting: false, filterNumberKeys: false, hideTimer: false };
const earlier = (seconds: number): Solve => ({ id: `earlier-${seconds}`, difficulty: 'medium', seconds, day: '2026-10-01', givens: game.givens.join('') });

async function finish(page: Page, { solves = [] as Solve[], hideTimer = false } = {}) {
  await page.addInitScript(([saveKey, saved, prefsKey, p, clockKey, clock, solvesKey, list]) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem(saveKey, saved); localStorage.setItem(prefsKey, p); localStorage.setItem(clockKey, clock); localStorage.setItem(solvesKey, list);
    sessionStorage.setItem('seeded', '1');
  }, [SAVE_KEY, nearly, PREFS_KEY, JSON.stringify({ ...prefs, hideTimer }), CLOCK_KEY, JSON.stringify({ id: game.id, seconds: 754 }), SOLVES_KEY, JSON.stringify({ solves })]);
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.locator(`.board [data-index="${last}"]`).click();
  await page.keyboard.press(String(game.solution[last]));
  await expect(page.locator('.completion')).toBeVisible();
}
// The clock runs from Continue to the last key press, so the seeded 12:34 can read a second later.
const solveTime = /^12:3[45]$/;
const status = (page: Page) => page.locator('.finish-summary');
const chips = (page: Page) => page.locator('.finish-chip');

test('the result card shows the time, the earlier best, and the solve counts, with no focus strip', async ({ page }) => {
  await finish(page, { solves: [earlier(690), earlier(900)] });
  const card = page.locator('.completion');
  await expect(card.locator('.finish-time')).toHaveText(solveTime);
  await expect(chips(page)).toHaveText(['Best 11:30Best time: 11 minutes 30 seconds', '00 notes', '00 fixes']);
  await expect(status(page)).toHaveText(/^Solved in 12 minutes 3[45] seconds, medium\.$/);
  await expect(page.locator('.digit-focus-bar')).toBeHidden();
  await expect(card.getByRole('button', { name: 'Replay' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Play again' })).toBeVisible();
});

test('beating the earlier best shows the badge, and a first solve shows no best', async ({ page, context }) => {
  await finish(page, { solves: [earlier(900)] });
  await expect(page.locator('.finish-chip.best')).toHaveText('Best timeNew best time');
  await expect(status(page)).toHaveText(/^Solved in 12 minutes 3[45] seconds, medium\. New best time\.$/);
  await page.close();
  const first = await context.newPage();
  await finish(first);
  await expect(first.locator('.finish-time')).toHaveText(solveTime);
  await expect(chips(first)).toHaveText(['First solveFirst medium solve', '00 notes', '00 fixes']);
});

test('a note and a fixed number are counted on the card', async ({ page }) => {
  await page.addInitScript(([saveKey, saved, prefsKey, p]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(saveKey, saved); localStorage.setItem(prefsKey, p); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(game), PREFS_KEY, JSON.stringify(prefs)]);
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
  const [first, second, third, ...rest] = game.givens.flatMap((v, i) => v ? [] : [i]);
  const enter = async (cell: number, digit: number) => { await page.locator(`.board [data-index="${cell}"]`).click(); await page.keyboard.press(String(digit)); };
  await page.locator(`.board [data-index="${first}"]`).click();
  await page.keyboard.press('n');
  await page.keyboard.press(String(game.solution[first]));
  await enter(third, game.solution[third]);
  await page.keyboard.press('n');
  await enter(second, game.solution[second] % 9 + 1);
  await page.keyboard.press('Backspace');
  await page.keyboard.press(String(game.solution[second]));
  for (const cell of [first, third, ...rest]) await enter(cell, game.solution[cell]);
  await expect(chips(page)).toHaveText(['First solveFirst medium solve', '22 notes', '11 fix']);
});

test('solving again after Restart is never a new best, since History keeps the first solve', async ({ page }) => {
  await finish(page, { solves: [earlier(900)] });
  await expect(page.locator('.finish-chip.best')).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Restart puzzle' }).click();
  await page.locator('.sheet').getByRole('button', { name: 'Restart puzzle' }).click();
  for (const cell of game.givens.flatMap((v, i) => v ? [] : [i])) {
    await page.locator(`.board [data-index="${cell}"]`).click();
    await page.keyboard.press(String(game.solution[cell]));
  }
  await expect(page.locator('.completion')).toBeVisible();
  await expect(page.locator('.finish-chip.best')).toHaveCount(0);
  await expect(chips(page).first()).toContainText(/^Best 12:3[45]/);
});

test('matching the earlier best is not a new best', async ({ page }) => {
  await finish(page, { solves: [earlier(754)] });
  await expect(page.locator('.finish-chip.best')).toHaveCount(0);
  await expect(chips(page).first()).toContainText('Best 12:34');
});

test('with the timer hidden, the card leaves out the time and the best', async ({ page }) => {
  await finish(page, { solves: [earlier(690)], hideTimer: true });
  await expect(page.locator('.finish-time')).toHaveCount(0);
  await expect(chips(page)).toHaveCount(2);
  await expect(status(page)).toHaveText('Solved, medium.');
});

const announcement = (page: Page) => page.locator('p.sr-only[role="status"]').filter({ hasText: /^Solved/ });

test('typing the last number announces the summary once', async ({ page }) => {
  await finish(page, { solves: [earlier(900)] });
  await expect(announcement(page)).toHaveCount(1);
  await expect(announcement(page)).toHaveText(/^Solved in 12 minutes 3[45] seconds, medium\. New best time\.$/);
});

test('finishing with a hint’s Apply shows the card and announces the summary', async ({ page }) => {
  await page.addInitScript(([saveKey, saved, prefsKey, p]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(saveKey, saved); localStorage.setItem(prefsKey, p); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, nearly, PREFS_KEY, JSON.stringify(prefs)]);
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: 'Show a hint' }).click();
  const action = page.locator('.hint-strip .hint-action');
  await expect(async () => {
    await page.keyboard.press('h');
    await expect(action).toHaveText('Apply', { timeout: 500 });
  }).toPass();
  // Apply ignores taps just after the hint advances, so retry until the card appears.
  await expect(async () => {
    if (await action.count()) await action.click();
    await expect(page.locator('.completion')).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(announcement(page)).toHaveText(/^Solved in \d+ minutes? \d+ seconds?, medium\. First medium solve\.$/);
});

test('on the narrowest screen, an hour-long Expert solve fits inside the card', async ({ page }) => {
  const expert = createGame(createPuzzle('expert', 4242));
  const open = expert.givens.findIndex(v => !v);
  const saved = JSON.stringify({ ...expert, values: expert.solution.map((v, i) => i === open ? 0 : v) });
  await page.setViewportSize({ width: 260, height: 640 });
  await page.addInitScript(([saveKey, value, clockKey, clock, prefsKey, p]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(saveKey, value); localStorage.setItem(clockKey, clock); localStorage.setItem(prefsKey, p); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, saved, CLOCK_KEY, JSON.stringify({ id: expert.id, seconds: 4754 }), PREFS_KEY, JSON.stringify(prefs)]);
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.locator(`.board [data-index="${open}"]`).click();
  await page.keyboard.press(String(expert.solution[open]));
  await expect(page.locator('.finish-time')).toHaveText(/^79:1[45]$/);
  const overflowing = await page.locator('.completion').evaluate(card => {
    const box = card.getBoundingClientRect();
    return [...card.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.right > box.right + 0.5 || r.left < box.left - 0.5; }).length;
  });
  expect(overflowing).toBe(0);
});

test('pausing hides the focus strip', async ({ page }) => {
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(game)]);
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await expect(page.locator('.digit-focus-bar')).toBeVisible();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.locator('.digit-focus-bar')).toBeHidden();
  await page.getByRole('button', { name: 'Resume puzzle' }).click();
  await expect(page.locator('.digit-focus-bar')).toBeVisible();
});

async function solveFromStart(page: Page, { solves = [] as Solve[], extra = {} as Record<string, string> } = {}) {
  await page.addInitScript(values => { if (!sessionStorage.getItem('seeded')) { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } },
    { [SAVE_KEY]: JSON.stringify(game), [PREFS_KEY]: JSON.stringify(prefs), [SOLVES_KEY]: JSON.stringify({ solves }), ...extra });
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
  for (const cell of game.givens.flatMap((v, i) => v ? [] : [i])) {
    await page.locator(`.board [data-index="${cell}"]`).click();
    await page.keyboard.press(String(game.solution[cell]));
  }
  await expect(page.locator('.completion')).toBeVisible();
}

test('a solve with no fix and no hint past the technique is clean, and History keeps it', async ({ page }) => {
  await solveFromStart(page, { solves: [earlier(900)] });
  await expect(page.locator('.finish-chip.earned')).toHaveText('CleanClean solve');
  await expect(status(page)).toContainText('Clean solve.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).solves[0].clean, SOLVES_KEY)).toBe(true);
});

const savedValues = (page: Page) => page.evaluate(key => (JSON.parse(localStorage.getItem(key) ?? 'null')?.values ?? []) as number[], SAVE_KEY);
async function fillRest(page: Page) {
  for (const [cell, value] of (await savedValues(page)).entries()) {
    if (value) continue;
    await page.locator(`.board [data-index="${cell}"]`).click();
    await page.keyboard.press(String(game.solution[cell]));
  }
  await expect(page.locator('.completion')).toBeVisible();
}
async function startFresh(page: Page) {
  await page.addInitScript(values => { if (!sessionStorage.getItem('seeded')) { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } },
    { [SAVE_KEY]: JSON.stringify(game), [PREFS_KEY]: JSON.stringify(prefs), [SOLVES_KEY]: JSON.stringify({ solves: [earlier(900)] }) });
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
}
const openHint = async (page: Page, presses: number) => {
  await page.getByRole('button', { name: 'Show a hint' }).click();
  for (let k = 0; k < presses; k++) await page.keyboard.press('h');
};

test('a hint kept at naming the technique leaves a solve clean', async ({ page }) => {
  await startFresh(page);
  await openHint(page, 0);
  await expect(page.locator('.hint-strip')).toBeVisible();
  await page.keyboard.press('Escape');
  await fillRest(page);
  await expect(page.locator('.finish-chip.earned')).toHaveText('CleanClean solve');
});

for (const [name, assist] of [
  ['a hint past naming the technique', async (page: Page) => { await openHint(page, 1); await page.keyboard.press('Escape'); }],
  ['a hint’s Apply', async (page: Page) => {
    const before = (await savedValues(page)).filter(Boolean).length;
    await page.getByRole('button', { name: 'Show a hint' }).click();
    const action = page.locator('.hint-strip .hint-action');
    await expect(async () => { await page.keyboard.press('h'); await expect(action).toHaveText('Apply', { timeout: 500 }); }).toPass();
    await expect(async () => { if (await action.count()) await action.click(); await expect(action).toHaveCount(0, { timeout: 500 }); }).toPass();
    await expect.poll(async () => (await savedValues(page)).filter(Boolean).length).toBeGreaterThan(before);
  }],
  ['a wrong number, even once fixed', async (page: Page) => {
    const cell = game.givens.indexOf(0);
    await page.locator(`.board [data-index="${cell}"]`).click();
    await page.keyboard.press(String(game.solution[cell] % 9 + 1));
    await page.keyboard.press('Backspace');
  }],
  ['a restart', async (page: Page) => {
    const cell = game.givens.indexOf(0);
    await page.locator(`.board [data-index="${cell}"]`).click();
    await page.keyboard.press(String(game.solution[cell]));
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Restart puzzle' }).click();
    await page.locator('.sheet').getByRole('button', { name: 'Restart puzzle' }).click();
  }],
] as const) {
  test(`a solve after ${name} is not clean`, async ({ page }) => {
    await startFresh(page);
    await assist(page);
    await fillRest(page);
    await expect(page.locator('.finish-chip.earned')).toHaveCount(0);
  });
}

test('cancelling the share sheet saves nothing', async ({ page }) => {
  await page.addInitScript(() => { navigator.canShare = () => true; navigator.share = async () => { throw new DOMException('Share canceled', 'AbortError'); }; });
  await finish(page, { solves: [earlier(900)] });
  let downloaded = false;
  page.on('download', () => { downloaded = true; });
  await page.locator('.completion').getByRole('button', { name: 'Share' }).click();
  await page.waitForTimeout(500);
  expect(downloaded).toBe(false);
});

test('a first Expert solve from the bank shows First solve', async ({ page }) => {
  const expert = createGame(createPuzzle('expert', 11));
  const open = expert.givens.indexOf(0);
  await page.addInitScript(values => { if (!sessionStorage.getItem('seeded')) { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } },
    { [SAVE_KEY]: JSON.stringify({ ...expert, values: expert.solution.map((v, i) => i === open ? 0 : v) }), [PREFS_KEY]: JSON.stringify(prefs) });
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.locator(`.board [data-index="${open}"]`).click();
  await page.keyboard.press(String(expert.solution[open]));
  await expect(page.locator('.finish-chip.earned')).toHaveText('First solveFirst expert solve');
});

test('a game already in progress is never clean', async ({ page }) => {
  await finish(page, { solves: [earlier(900)] });
  await expect(page.locator('.finish-chip.earned')).toHaveCount(0);
});

test('a game played with Block incorrect answers is never clean', async ({ page }) => {
  await solveFromStart(page, { solves: [earlier(900)], extra: { [PREFS_KEY]: JSON.stringify({ ...prefs, blockIncorrectAnswers: true }) } });
  await expect(page.locator('.finish-chip.earned')).toHaveCount(0);
});

test('Share sends a square PNG of the solve map through the share sheet', async ({ page }) => {
  await page.addInitScript(() => {
    const shared: { name: string; type: string; width: number; height: number }[] = [];
    Object.assign(window, { shared });
    navigator.canShare = () => true;
    navigator.share = async data => {
      for (const file of data?.files ?? []) { const image = await createImageBitmap(file); shared.push({ name: file.name, type: file.type, width: image.width, height: image.height }); }
    };
  });
  await finish(page, { solves: [earlier(900)] });
  const share = page.locator('.completion').getByRole('button', { name: 'Share' });
  await expect(share).toBeEnabled();
  await share.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { shared: unknown[] }).shared)).toEqual([{ name: 'sudoclue-solve-medium.png', type: 'image/png', width: 1080, height: 1080 }]);
});

test('without file sharing, Share saves the image instead', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined }); });
  await finish(page, { solves: [earlier(900)] });
  const download = page.waitForEvent('download');
  await page.locator('.completion').getByRole('button', { name: 'Share' }).click();
  expect((await download).suggestedFilename()).toBe('sudoclue-solve-medium.png');
});

test('when the share sheet refuses the file, Share saves the image instead', async ({ page }) => {
  await page.addInitScript(() => { navigator.canShare = () => true; navigator.share = async () => { throw new DOMException('Not allowed', 'NotAllowedError'); }; });
  await finish(page, { solves: [earlier(900)] });
  const download = page.waitForEvent('download');
  await page.locator('.completion').getByRole('button', { name: 'Share' }).click();
  expect((await download).suggestedFilename()).toBe('sudoclue-solve-medium.png');
});

test('solving again after Restart earns nothing, even when the first solve did', async ({ page }) => {
  await finish(page);
  await expect(page.locator('.finish-chip.earned')).toHaveText('First solveFirst medium solve');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Restart puzzle' }).click();
  await page.locator('.sheet').getByRole('button', { name: 'Restart puzzle' }).click();
  for (const cell of game.givens.flatMap((v, i) => v ? [] : [i])) {
    await page.locator(`.board [data-index="${cell}"]`).click();
    await page.keyboard.press(String(game.solution[cell]));
  }
  await expect(page.locator('.completion')).toBeVisible();
  await expect(page.locator('.finish-chip.earned')).toHaveCount(0);
});
