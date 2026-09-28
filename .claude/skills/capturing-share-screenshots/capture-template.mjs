// Copy to the scratchpad, edit SETUP and `setup()`, then run:
//   node --experimental-strip-types <copy>.mjs <port> <out.png> [light|dark]
// Needs `pnpm install` (for @playwright/test) and a running `pnpm start --port <port>`.
import { createRequire } from 'node:module';

const REPO = '/Users/seanoliver/code/learning/sudoku';
const { chromium } = createRequire(`${REPO}/package.json`)('@playwright/test');
const [port, out, theme = 'light'] = process.argv.slice(2);

// localStorage to seed before the app loads. Keys: SAVE_KEY (src/lib/game.ts), LEARNED_KEY (src/lib/lessons.ts), PREFS_KEY (src/lib/preferences.ts).
// For a saved game at a given hint: `const { gameBefore } = await import(`${REPO}/e2e/fixtures.ts`)`, then seed SAVE_KEY with its result.
// Preferences below match DEFAULT_PREFS (every aid on); change only what the shot needs.
const SETUP = {
  'sudoku.preferences.v1': JSON.stringify({ theme: 'system', blockIncorrectAnswers: true, highlightPeers: true, smartHighlighting: true, filterNumberKeys: true, hideTimer: false }),
};

// Put the screen in the state the post is about. The app opens on Home: Continue enters a seeded game, a level button starts one.
// Learn: click 'All techniques' on Home. Default below: board with a filled cell selected, so Smart highlighting shows.
async function setup(page) {
  const resume = page.getByRole('button', { name: /^Continue/ });
  await (await resume.count() ? resume : page.getByRole('button', { name: /^New easy puzzle/ })).click();
  await page.locator('.board .cell').first().waitFor();
  const filled = page.locator('.board .cell.given').first();
  await filled.click();
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: theme });
const page = await context.newPage();
await page.addInitScript(entries => {
  if (sessionStorage.getItem('seeded')) return;
  for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
  sessionStorage.setItem('seeded', '1');
}, SETUP);
await page.goto(`http://localhost:${port}/`);
await setup(page);
await page.evaluate(() => document.activeElement?.blur?.());
await page.waitForTimeout(400);

const m = await page.evaluate(() => {
  const target = document.querySelector('.board-wrap') ? '.board-wrap' : '.app-bar';
  const r = document.querySelector(target).getBoundingClientRect();
  return { target, left: r.left, right: innerWidth - r.right, clientWidth: document.documentElement.clientWidth, innerWidth, scrollHeight: document.documentElement.scrollHeight, innerHeight };
});
console.log(JSON.stringify(m));
if (Math.abs(m.left - m.right) > 1 || m.clientWidth !== m.innerWidth) {
  console.error('Margins unequal or scrollbar present; not capturing.');
  await browser.close();
  process.exit(1);
}
await page.screenshot({ path: out, fullPage: false, scale: 'css' });
await browser.close();
