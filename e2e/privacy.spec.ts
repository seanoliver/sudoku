import { expect, test } from '@playwright/test';

test('the privacy policy has its own page that links back to the app', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
  await expect(page.getByText('The iPhone app collects nothing.')).toBeVisible();
  await page.getByRole('link', { name: /Sudoku/ }).click();
  await expect(page).toHaveURL(/\/$/);
});
