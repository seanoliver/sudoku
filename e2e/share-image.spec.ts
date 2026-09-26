import { expect, test } from '@playwright/test';

const meta = (page: import('@playwright/test').Page, key: string) => page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute('content');

test('links to the site share a large 1200×630 image with alt text', async ({ page, request }) => {
  await page.goto('/');
  expect(await meta(page, 'twitter:card')).toBe('summary_large_image');
  expect(await meta(page, 'og:description')).toBe('A calm Sudoku that teaches you every technique, one move at a time.');
  const image = await meta(page, 'og:image');
  expect(image).toMatch(/^https:\/\/sudoku\.seanoliver\.dev\/opengraph-image/);
  expect(await meta(page, 'og:image:width')).toBe('1200');
  expect(await meta(page, 'og:image:height')).toBe('630');
  expect(await meta(page, 'og:image:alt')).toBeTruthy();
  expect(await meta(page, 'twitter:image')).toMatch(/^https:\/\/sudoku\.seanoliver\.dev\/twitter-image/);
  const response = await request.get(new URL(image!).pathname + new URL(image!).search);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
  const png = await response.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
});
