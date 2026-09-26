import type { Page } from '@playwright/test';
import { LESSON_BANK } from '../src/lib/lesson-bank.ts';
import { lessonOf, practiceGame } from '../src/lib/lessons.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';
import { allSteps } from '../src/lib/steps.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { createGame, SAVE_KEY } from '../src/lib/game.ts';
import { applyHint, nextHint } from '../src/lib/hints.ts';
import type { Step } from '../src/lib/steps.ts';

/** A saved game whose next hint is the first step matching `want`, walking Expert seeds in order. */
export function gameBefore(want: (step: Step) => boolean): string {
  for (let seed = 1; seed <= 400; seed++) {
    let game = createGame(createPuzzle('expert', seed));
    for (let guard = 0; guard < 120; guard++) {
      const hint = nextHint(game);
      if (hint.kind !== 'step') break;
      if (want(hint.step)) return JSON.stringify(game);
      game = applyHint(game, hint.step);
    }
  }
  throw new Error('no such step');
}

/** Loads the app with `saved` as the current game and opens the hint walkthrough from the strip. */
export async function openWalkthrough(page: Page, saved: string) {
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [SAVE_KEY, saved]);
  await page.goto('/');
  await page.locator('.board .cell').first().waitFor();
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await page.locator('.hint-action').click();
  await page.locator('.hint-action').click();
  await page.locator('.walk-panel').waitFor();
}

/** What has keyboard focus, and whether it is inside the app's key handler. */
export const focusState = (page: Page) => page.evaluate(() => {
  const element = document.activeElement;
  return { inApp: Boolean(element?.closest('.app')), label: element?.getAttribute('aria-label') ?? element?.className ?? '' };
});

export const stepLabel = (page: Page) => page.locator('.walk-stepper span').textContent();
export const historyLength = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').history?.length ?? 0, SAVE_KEY);

/** The crossings-out that answer practice board `board` of the pointing lesson. */
export const answer = (board: number) => {
  const game = practiceGame(LESSON_BANK.pointing[board], board);
  return allSteps(game.values, getPlayableCandidates(game), 'locked-candidates').find(step => lessonOf(step) === 'pointing')!.eliminations;
};
export const footer = (page: Page) => page.locator('.lesson-footer');
export const prompt = (page: Page) => page.locator('.lesson-prompt');
/** A tap after reading the result: the footer ignores a second tap within 350 ms, as a double tap. */
export const tapFooter = async (page: Page) => { await page.waitForTimeout(400); await footer(page).click(); };
export async function crossOut(page: Page, marks: { cell: number; digit: number }[]) {
  for (const { cell, digit } of marks) {
    await page.locator(`.board [data-index="${cell}"]`).click();
    await page.keyboard.press(String(digit));
  }
}
