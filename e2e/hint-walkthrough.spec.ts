import { expect, test, type Page } from '@playwright/test';
import { focusState, gameBefore, historyLength, openWalkthrough, stepToEnd } from './fixtures.ts';

const xyWing = gameBefore(step => step.technique === 'xy-wing');
const next = (page: Page) => page.getByRole('button', { name: 'Next step' });
const previous = (page: Page) => page.getByRole('button', { name: 'Previous step' });
const counter = (page: Page) => page.locator('.walk-count');
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

test('arrowing onto a walkthrough cell keeps its ring', async ({ page }) => {
  await openWalkthrough(page, xyWing);
  const ringed = Number(await page.locator('.board .cell.walk-focus').first().getAttribute('data-index'));
  const from = Number(await page.locator('.board .cell[tabindex="0"]').getAttribute('data-index'));
  await page.locator('.board .cell[tabindex="0"]').focus();
  const [rows, cols] = [Math.floor(ringed / 9) - Math.floor(from / 9), ringed % 9 - from % 9];
  for (let k = 0; k < Math.abs(rows); k++) await page.keyboard.press(rows > 0 ? 'ArrowDown' : 'ArrowUp');
  for (let k = 0; k < Math.abs(cols); k++) await page.keyboard.press(cols > 0 ? 'ArrowRight' : 'ArrowLeft');
  await expect(page.locator(`.board [data-index="${ringed}"]`)).toBeFocused();
  await expect(page.locator(`.board [data-index="${ringed}"]`)).toHaveClass(/selected/);
  await expect(page.locator('.board .selection-outline')).toHaveCount(0);
  expect(await page.locator(`.board [data-index="${ringed}"]`).evaluate(element => getComputedStyle(element, '::after').borderTopWidth)).not.toBe('0px');
});

test.describe('marks line up with the notes they point at', () => {
  test.beforeEach(async ({ page }) => openWalkthrough(page, xyWing));

  test('each candidate mark is the cell\'s own note digit, shown', async ({ page }) => {
    const marked = page.locator('.board .cell[data-chip], .board .cell[data-strike]');
    expect(await marked.count()).toBeGreaterThan(0);
    for (const cell of await marked.all()) {
      const digits = `${await cell.getAttribute('data-chip') ?? ''} ${await cell.getAttribute('data-strike') ?? ''}`.trim().split(/\s+/);
      for (const digit of digits) await expect(cell.locator(`.note-digit[data-digit="${digit}"]`)).toHaveCSS('opacity', '1');
    }
  });

  test('cells the step does not use fade, and the cells it uses do not', async ({ page }) => {
    const unused = page.locator('.board .cell:not(.walk-used)').first();
    await expect(unused.locator('> *').first()).toHaveCSS('opacity', '0.22');
    await expect(page.locator('.board .cell.walk-focus').first()).toHaveClass(/walk-used/);
  });
});

test('every link ends at the edge of the note digit it joins', async ({ page }) => {
  await openWalkthrough(page, gameBefore(step => step.technique === 'coloring'));
  await next(page).click();
  const lines = page.locator('.walk-links line');
  expect(await lines.count()).toBeGreaterThan(0);
  const gaps = await page.evaluate(() => {
    const wrap = document.querySelector('.board-wrap') as HTMLElement, box = wrap.getBoundingClientRect();
    const notes = [...document.querySelectorAll('.board .cell[data-chip] .note-digit')].filter(note => getComputedStyle(note).opacity === '1').map(note => { const r = note.getBoundingClientRect(); return { x: r.left + r.width / 2 - box.left - wrap.clientLeft, y: r.top + r.height / 2 - box.top - wrap.clientTop, edge: r.width / 2 + 1 }; });
    return [...document.querySelectorAll('.walk-links line')].flatMap(line => [[+line.getAttribute('x1')!, +line.getAttribute('y1')!], [+line.getAttribute('x2')!, +line.getAttribute('y2')!]])
      .map(([x, y]) => Math.min(...notes.map(note => Math.abs(Math.hypot(note.x - x, note.y - y) - note.edge))));
  });
  for (const gap of gaps) expect(gap).toBeLessThan(1);
});

const SIZES = [{ width: 390, height: 844, strict: true }, { width: 1280, height: 800, strict: true }, { width: 375, height: 553, strict: false }, { width: 320, height: 568, strict: false }];
for (const { strict, ...viewport } of SIZES) test.describe(`at ${viewport.width} × ${viewport.height}`, () => {
  test.use({ viewport });

  for (const technique of ['coloring', 'swordfish', 'x-wing'] as const) for (const place of ['hint', 'lesson'] as const) test(`every ${technique} step in a ${place} shows its whole sentence and keeps its buttons on screen`, async ({ page }) => {
    await openWalkthrough(page, gameBefore(step => step.technique === technique));
    if (place === 'lesson') {
      await stepToEnd(page);
      await page.locator('.walk-learn').click();
      await expect(page.locator('.lesson-bar')).toBeVisible();
      await expect(counter(page)).toHaveText(/^1 of /);
      await expect.poll(() => page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
    }
    for (;;) {
      const fit = await page.evaluate(() => {
        const action = document.querySelector('.walk-actions')!.getBoundingClientRect(), sentence = document.querySelector('.walk-panel p') as HTMLElement;
        return { bottom: action.bottom, height: innerHeight, scroll: document.scrollingElement!.scrollHeight, hidden: sentence.scrollHeight - sentence.clientHeight, cue: sentence.classList.contains('clipped') && sentence.tabIndex === 0 };
      });
      expect(fit.bottom).toBeLessThanOrEqual(fit.height);
      expect(fit.scroll).toBeLessThanOrEqual(fit.height);
      if (strict) expect(fit.hidden).toBeLessThanOrEqual(1);
      else expect(fit.hidden <= 1 || fit.cue).toBe(true);
      if (!await next(page).count() || !await next(page).isEnabled()) break;
      await next(page).click();
    }
  });
});

test('a double tap on Next before the last step does not open the lesson', async ({ page }) => {
  await openWalkthrough(page, gameBefore(step => step.technique === 'locked-candidates'));
  await expect(counter(page)).toHaveText('1 of 2');
  await next(page).dblclick();
  await expect(counter(page)).toHaveText('2 of 2');
  await page.waitForTimeout(400);
  await expect(page.locator('.lesson-bar')).toHaveCount(0);
});

test('stepping on from a scrolled sentence to one that fits keeps focus in the app', async ({ page }) => {
  await openWalkthrough(page, xyWing);
  await page.addStyleTag({ content: '.walk-panel p { font-size: 120px !important; }' });
  await page.setViewportSize({ width: 390, height: 845 });
  const sentence = page.locator('.walk-panel p');
  await expect(sentence).toHaveAttribute('tabindex', '0');
  await sentence.focus();
  await page.evaluate(() => document.querySelectorAll('style').forEach(style => { if (style.textContent?.includes('120px')) style.remove(); }));
  await page.keyboard.press('h');
  await expect(counter(page)).toHaveText('2 of 4');
  await expect(sentence).not.toHaveAttribute('tabindex', '0');
  expect((await focusState(page)).inApp).toBe(true);
});
