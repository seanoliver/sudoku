import type { Page } from '@playwright/test';
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
