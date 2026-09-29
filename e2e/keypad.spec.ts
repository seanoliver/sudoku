import { expect, test, type Page } from '@playwright/test';
import { gameBefore, openGame } from './fixtures.ts';
import { SAVE_KEY } from '../src/lib/game.ts';
import { lessonOf } from '../src/lib/lessons.ts';

const saved = gameBefore(step => lessonOf(step) === 'pointing');
const seed = (page: Page) => page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, saved]);
const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;
const key = (page: Page, digit: number) => box(page, `.number-pad .number-key:nth-child(${digit})`);

test('the number keys form a 3 × 3 grid in keypad order', async ({ page }) => {
  await seed(page);
  await openGame(page);
  const keys = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => key(page, d)));
  for (const row of [0, 1, 2]) {
    const [a, b, c] = keys.slice(row * 3, row * 3 + 3);
    expect(Math.abs(a.y - b.y)).toBeLessThan(1);
    expect(Math.abs(b.y - c.y)).toBeLessThan(1);
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
  }
  expect(keys[3].y).toBeGreaterThan(keys[0].y + keys[0].height - 1);
  expect(keys[6].y).toBeGreaterThan(keys[3].y + keys[3].height - 1);
  expect(Math.abs(keys[0].x - keys[3].x)).toBeLessThan(1);
});

test('the entry modes stack to the left of the grid, with Erase below them', async ({ page }) => {
  await seed(page);
  await openGame(page);
  const [numbers, notes, exclude] = await Promise.all(['value', 'note', 'exclude'].map(m => box(page, `.mode-option.mode-${m}`)));
  const erase = await box(page, '.erase-control');
  const one = await key(page, 1);
  expect(numbers.y).toBeLessThan(notes.y);
  expect(notes.y).toBeLessThan(exclude.y);
  expect(Math.abs(numbers.x - exclude.x)).toBeLessThan(1);
  expect(erase.y).toBeGreaterThan(exclude.y);
  for (const tool of [numbers, notes, exclude, erase]) expect(tool.x + tool.width).toBeLessThanOrEqual(one.x);
});

test('the mode indicator sits on the chosen mode', async ({ page }) => {
  await seed(page);
  await openGame(page);
  for (const [mode, label] of [['note', 'Notes'], ['exclude', 'Exclude'], ['value', 'Numbers']] as const) {
    await page.locator(`.mode-option.mode-${mode}`).click();
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(300);
    const [indicator, option] = await Promise.all([box(page, '.mode-indicator'), box(page, `.mode-option.mode-${mode}`)]);
    expect(Math.abs(indicator.y + indicator.height / 2 - (option.y + option.height / 2))).toBeLessThan(3);
  }
});

// Full-screen phones, phones in Safari with the browser bars showing, small and folding phones, laptops, and iPads.
const SIZES = [[390, 844], [375, 667], [393, 659], [375, 628], [390, 664], [360, 640], [375, 553], [320, 568], [466, 678], [466, 590], [890, 626], [626, 890], [1440, 790], [1280, 761], [1280, 720], [1024, 768], [1440, 900], [700, 560], [660, 520], [800, 640], [375, 600], [390, 610], [414, 620], [700, 580], [683, 657], [700, 630], [720, 680], [799, 640], [1280, 951], [1440, 952], [700, 700], [874, 700]].map(([width, height]) => ({ width, height }));
for (const size of SIZES) {
  test(`the game fits without scrolling at ${size.width} × ${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await seed(page);
    await openGame(page);
    const layout = await page.evaluate(() => { const pad = document.querySelector('.number-pad')!.getBoundingClientRect(); return { scroll: document.documentElement.scrollHeight, height: innerHeight, pad: pad.bottom, right: pad.right, scrollWidth: document.documentElement.scrollWidth, width: innerWidth }; });
    expect(layout.scroll).toBeLessThanOrEqual(layout.height);
    expect(layout.pad).toBeLessThanOrEqual(layout.height);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.right).toBeLessThanOrEqual(layout.width);
  });
}

test('keys and tools stay at least 36px tall on short screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 628 });
  await seed(page);
  await openGame(page);
  for (const selector of ['.number-pad .number-key', '.mode-option', '.erase-control', '.history-control']) {
    expect((await page.locator(selector).first().boundingBox())!.height).toBeGreaterThanOrEqual(36);
  }
});

test('in Notes mode each key shows its digit in that digit’s note position', async ({ page }) => {
  await seed(page);
  await openGame(page);
  await page.locator('.mode-option.mode-note').click();
  for (const digit of [1, 5, 9]) {
    const [k, d] = await Promise.all([key(page, digit), box(page, `.number-pad .number-key:nth-child(${digit}) > span`)]);
    const col = (d.x + d.width / 2 - k.x) / k.width, row = (d.y + d.height / 2 - k.y) / k.height;
    const expected = (digit - 1) % 3, expectedRow = Math.floor((digit - 1) / 3);
    expect(Math.floor(col * 3)).toBe(expected);
    expect(Math.floor(row * 3)).toBe(expectedRow);
  }
});

test('only the play screen shrinks; Home keeps its full width on short screens', async ({ page }) => {
  for (const [width, height, expected] of [[390, 664, 354], [1440, 790, 420]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('main.home')).toBeVisible();
    expect(Math.round((await page.locator('main.home').boundingBox())!.width)).toBe(expected);
  }
});

// The installed iPhone app pads the page by the notch and home-bar areas; the variables stand in for env(safe-area-inset-*).
for (const [width, height, top, bottom] of [[375, 667, 20, 0], [375, 812, 50, 34], [390, 844, 47, 34]] as const) {
  test(`the installed app fits at ${width} × ${height} with ${top}px and ${bottom}px safe areas`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(([t, b]) => document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.setProperty('--safe-top', `${t}px`);
      document.documentElement.style.setProperty('--safe-bottom', `${b}px`);
    }), [top, bottom]);
    await seed(page);
    await openGame(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  });
}

test('on short screens the keys end level with Erase', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await seed(page);
  await openGame(page);
  const [nine, erase] = await Promise.all([key(page, 9), box(page, '.erase-control')]);
  expect(Math.abs(nine.y + nine.height - (erase.y + erase.height))).toBeLessThan(1);
});

test('on tall phones the keys end level with Erase', async ({ page }) => {
  for (const [width, height] of [[390, 844], [360, 800]] as const) {
    await page.setViewportSize({ width, height });
    await seed(page);
    await openGame(page);
    const [nine, erase] = await Promise.all([key(page, 9), box(page, '.erase-control')]);
    expect(Math.abs(nine.y + nine.height - (erase.y + erase.height))).toBeLessThan(1);
  }
});

test('the mode buttons have room for their labels', async ({ page }) => {
  for (const [width, height] of [[390, 844], [375, 553]] as const) {
    await page.setViewportSize({ width, height });
    await seed(page);
    await openGame(page);
    for (const mode of ['value', 'note', 'exclude']) {
      const fits = await page.locator(`.mode-option.mode-${mode}`).evaluate(el => el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().right <= el.parentElement!.getBoundingClientRect().right);
      expect(fits).toBe(true);
    }
  }
});

for (const [width, height] of [[890, 626], [1440, 790], [1024, 768]] as const) {
  test(`at ${width} × ${height} the controls sit beside the board`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seed(page);
    await openGame(page);
    const [board, pad] = await Promise.all([box(page, '.board-wrap'), box(page, '.number-pad')]);
    expect(pad.x).toBeGreaterThan(board.x + board.width);
    expect(board.width).toBeGreaterThan(400);
  });
}

for (const [width, height] of [[375, 553], [466, 590]] as const) {
  test(`at ${width} × ${height} the game bar is one row and the grid stays`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seed(page);
    await openGame(page);
    const buttons = await Promise.all(['.home-button', '.difficulty-button', '.pause-button', '.hint-button', '.settings-button'].map(s => box(page, `.game-bar ${s}`)));
    const middle = (b: { y: number; height: number }) => b.y + b.height / 2;
    for (const b of buttons) expect(Math.abs(middle(b) - middle(buttons[0]))).toBeLessThan(4);
    const [one, four] = await Promise.all([key(page, 1), key(page, 4)]);
    expect(four.y).toBeGreaterThan(one.y + one.height - 1);
  });
}

for (const [width, height] of [[375, 667], [320, 568]] as const) {
  test(`the installed app at ${width} × ${height} fits a game and a lesson`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.setProperty('--safe-top', '20px');
      document.documentElement.style.setProperty('--bar-height', '60px');
    }));
    await seed(page);
    await openGame(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), 'game').toBe(true);
    await page.goto('/');
    await page.locator('.home-lesson').click();
    await expect(page.locator('.lesson-footer')).toBeVisible();
    for (const phase of ['watch', 'practice']) {
      if (phase === 'practice') { await page.locator('.lesson-footer').click(); await page.waitForTimeout(300); }
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), phase).toBe(true);
    }
  });
}

for (const [width, height] of [[1024, 768], [890, 626]] as const) {
  test(`a lesson's footer button can be tapped at ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.locator('.home-lesson').click();
    const footer = page.locator('.lesson-footer');
    await expect(footer).toBeVisible();
    const b = (await footer.boundingBox())!;
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.lesson-footer') !== null, [b.x + b.width / 2, b.y + b.height / 2]);
    expect(hit).toBe(true);
  });
}

test('the desktop caption stays on Home at side-by-side sizes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 790 });
  await page.goto('/');
  await expect(page.locator('.desktop-caption')).toBeVisible();
});

for (const [width, height] of [[375, 629], [375, 553], [390, 664], [360, 640], [1280, 951], [768, 1024]] as const) {
  test(`a lesson fits without scrolling at ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.locator('.home-lesson').click();
    await expect(page.locator('.lesson-footer')).toBeVisible();
    for (const phase of ['watch', 'practice']) {
      if (phase === 'practice') { await page.locator('.lesson-footer').click(); await page.waitForTimeout(300); }
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), phase).toBe(true);
    }
    if (height === 629) expect((await box(page, '.board-wrap')).width).toBeGreaterThanOrEqual(270);
  });
}

test('on short portrait screens Home and Settings line up with the board card', async ({ page }) => {
  for (const [width, height] of [[375, 553], [466, 590], [430, 640], [412, 660], [844, 390]] as const) {
    await page.setViewportSize({ width, height });
    await seed(page);
    await openGame(page);
    const [card, home, settings] = await Promise.all([box(page, '.puzzle-panel'), box(page, '.game-bar .home-button'), box(page, '.game-bar .settings-button')]);
    expect(Math.abs(home.x - card.x)).toBeLessThan(2);
    expect(Math.abs(settings.x + settings.width - (card.x + card.width))).toBeLessThan(2);
  }
});
