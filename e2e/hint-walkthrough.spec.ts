import { expect, test, type Page } from '@playwright/test';
import { focusState, gameBefore, historyLength, openWalkthrough } from './fixtures.ts';

const xyWing = gameBefore(step => step.technique === 'xy-wing');
const next = (page: Page) => page.getByRole('button', { name: 'Next step' });
const previous = (page: Page) => page.getByRole('button', { name: 'Previous step' });
const counter = (page: Page) => page.locator('.walk-stepper span');
const apply = (page: Page) => page.locator('.hint-strip .hint-action');

test.describe('focus through an XY-wing walkthrough', () => {
  test.beforeEach(async ({ page }) => openWalkthrough(page, xyWing));

  test('opening the walkthrough from the strip puts focus on the next-step button', async ({ page }) => {
    await expect(counter(page)).toHaveText('1 of 4');
    await expect(next(page)).toBeFocused();
  });

  test('H steps through to the end, then focus moves to Apply and stays in the app', async ({ page }) => {
    for (const label of ['2 of 4', '3 of 4', '4 of 4']) {
      await page.keyboard.press('h');
      await expect(counter(page)).toHaveText(label);
    }
    await expect(apply(page)).toBeFocused();
    await page.keyboard.press('h');
    await expect(counter(page)).toHaveText('4 of 4');
    expect((await focusState(page)).inApp).toBe(true);
  });

  test('stepping back from the last step keeps focus in the app when the click does not focus the button', async ({ page }) => {
    for (let k = 0; k < 3; k++) await next(page).click();
    await expect(apply(page)).toBeFocused();
    await previous(page).dispatchEvent('click');
    await expect(counter(page)).toHaveText('3 of 4');
    await expect(next(page)).toBeFocused();
    await page.keyboard.press('h');
    await expect(counter(page)).toHaveText('4 of 4');
  });

  test('returning to the first step moves focus off the disabled back button', async ({ page }) => {
    await next(page).click();
    await previous(page).click();
    await expect(previous(page)).toBeDisabled();
    expect((await focusState(page)).inApp).toBe(true);
    await page.keyboard.press('h');
    await expect(counter(page)).toHaveText('2 of 4');
  });

  test('Escape closes the walkthrough and returns focus to the selected cell', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.walk-panel')).toHaveCount(0);
    await expect(page.locator('.cell.selected')).toBeFocused();
  });

  test('the keypad under the panel is out of reach while the walkthrough is open', async ({ page }) => {
    await expect(page.locator('.note-controls')).toHaveAttribute('inert', '');
    await expect(page.locator('.number-pad')).toHaveAttribute('inert', '');
    await next(page).focus();
    for (let k = 0; k < 4; k++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.note-controls, .number-pad')))).toBe(false);
    }
  });

  test('a quick double Enter on the next-step button does not apply the move', async ({ page }) => {
    await next(page).click();
    await next(page).click();
    await next(page).focus();
    const before = await historyLength(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(counter(page)).toHaveText('4 of 4');
    expect(await historyLength(page)).toBe(before);
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    await expect(page.locator('.walk-panel')).toHaveCount(0);
    await expect.poll(() => historyLength(page)).toBe(before + 1);
  });

  test('a keyboard-focused cell shows a focus ring during the walkthrough', async ({ page }) => {
    await page.locator('.cell.selected').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.walk-panel')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.classList.contains('cell') && getComputedStyle(document.activeElement).outlineStyle)).toBe('dashed');
  });
});

test('the answer on the last step sits where a placed number sits in its cell', async ({ page }) => {
  await openWalkthrough(page, gameBefore(step => step.technique === 'naked-single'));
  await next(page).click();
  const offset = (selector: string) => page.evaluate(sel => {
    const glyph = document.querySelector(sel)!; const range = document.createRange(); range.selectNodeContents(glyph);
    const g = range.getBoundingClientRect(), c = glyph.closest('.cell')!.getBoundingClientRect();
    return { x: g.left + g.width / 2 - (c.left + c.width / 2), y: g.top + g.height / 2 - (c.top + c.height / 2) };
  }, selector);
  const answer = await offset('.walk-ghost'), placed = await offset('.cell.given .cell-number');
  expect(Math.abs(answer.x - placed.x)).toBeLessThan(1);
  expect(Math.abs(answer.y - placed.y)).toBeLessThan(1);
  await expect(page.locator('.cell.walk-answer .notes')).toBeHidden();
});
