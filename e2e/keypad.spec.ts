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

// Full-screen phones, phones in Safari with the browser bars showing, laptops, and an iPad in landscape.
const SIZES = [[390, 844], [375, 667], [393, 659], [375, 628], [390, 664], [360, 640], [1440, 790], [1280, 761], [1024, 768], [1440, 900]].map(([width, height]) => ({ width, height }));
for (const size of SIZES) {
  test(`the game fits without scrolling at ${size.width} × ${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await seed(page);
    await openGame(page);
    const layout = await page.evaluate(() => ({ scroll: document.documentElement.scrollHeight, height: innerHeight, pad: document.querySelector('.number-pad')!.getBoundingClientRect().bottom }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.height);
    expect(layout.pad).toBeLessThanOrEqual(layout.height);
  });
}

test('keys and tools stay at least 36px tall on short screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 628 });
  await seed(page);
  await openGame(page);
  for (const selector of ['.number-pad .number-key', '.mode-option', '.erase-control']) {
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
