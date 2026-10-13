import { expect, test, type Page } from '@playwright/test';
import { openGame } from './fixtures.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { DEFAULT_PREFS, PREFS_KEY } from '../src/lib/preferences.ts';

// The iOS build sets `data-app="ios"` on <html>; these tests set it on the website build to check the CSS under it.
const game = createGame(createPuzzle('medium', 7));
const inApp = (page: Page, on: boolean) => page.evaluate(on => on ? document.documentElement.setAttribute('data-app', 'ios') : document.documentElement.removeAttribute('data-app'), on);
/** Focuses an element the way a keyboard user would see it: after a Tab, so it matches :focus-visible in WebKit too. */
const keyboardFocus = async (page: Page, selector: string) => { await page.keyboard.press('Tab'); await page.locator(selector).evaluate(element => (element as HTMLElement).focus()); };

test.beforeEach(async ({ page }) => {
  // Wrong numbers go in, so a hint can point at one.
  const prefs = { ...DEFAULT_PREFS, blockIncorrectAnswers: false, filterNumberKeys: false };
  await page.addInitScript(([saveKey, saved, prefsKey, preferences]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(saveKey, saved); localStorage.setItem(prefsKey, preferences); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, JSON.stringify(game), PREFS_KEY, JSON.stringify(prefs)]);
});

test('a control shows its focus ring on the website and not in the app', async ({ page }) => {
  await openGame(page);
  await page.locator('.difficulty-button').focus();
  await page.keyboard.press('Enter');
  const close = page.locator('.sheet-close');
  await expect(close).toBeFocused();
  await expect(close).toHaveCSS('outline-style', 'solid');
  await inApp(page, true);
  await expect(close).toHaveCSS('outline-style', 'none');
});

test('a focused cell other than the selected one shows a ring on the website and not in the app', async ({ page }) => {
  await openGame(page);
  await keyboardFocus(page, '.board .cell:not(.selected) >> nth=40');
  const focused = page.locator('.board .cell:focus-visible:not(.selected)');
  await expect(focused).not.toHaveCSS('box-shadow', 'none');
  await inApp(page, true);
  await expect(focused).toHaveCSS('box-shadow', 'none');
});

test('in the app a focused hint-mistake cell keeps its red ring and loses the blue one', async ({ page }) => {
  await openGame(page);
  const cell = game.givens.findIndex(v => !v);
  await page.locator(`.board [data-index="${cell}"]`).click();
  await page.keyboard.press(String(game.solution[cell] % 9 + 1));
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await page.locator('.hint-action').click();
  const mistake = page.locator(`.board [data-index="${cell}"]`);
  await expect(mistake).toHaveClass(/hint-mistake/);
  // Safari leaves focus on the page after a tap on the hint button, so put it on the board before moving the selection.
  await mistake.focus();
  await page.keyboard.press('ArrowRight');
  await keyboardFocus(page, `.board [data-index="${cell}"]`);
  await expect(mistake).not.toHaveClass(/selected/);
  const rings = () => mistake.evaluate(element => getComputedStyle(element).boxShadow.split('inset').length - 1);
  expect(await rings()).toBe(2);
  await inApp(page, true);
  expect(await rings()).toBe(1);
  const red = await page.evaluate(() => { const probe = document.createElement('i'); probe.style.color = 'var(--red)'; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; });
  await expect(mistake).toHaveCSS('box-shadow', new RegExp(red.replace(/[()]/g, '\\$&')));
});

test('a focused cell in a lesson walkthrough shows its dashed outline on the website and not in the app', async ({ page }) => {
  await page.goto('/');
  await page.locator('.home-lesson').click();
  await expect(page.locator('.board-wrap.walkthrough')).toBeVisible();
  await keyboardFocus(page, '.board .cell >> nth=40');
  const focused = page.locator('.board .cell:focus-visible');
  await expect(focused).toHaveCSS('outline-style', 'dashed');
  await inApp(page, true);
  await expect(focused).toHaveCSS('outline-style', 'none');
});
