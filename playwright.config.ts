import { defineConfig, devices } from '@playwright/test';

const PORT = 3400;
const phone = { viewport: { width: 390, height: 844 } };

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, reducedMotion: 'reduce' },
  // WebKit matters here: Safari does not focus a button when it is clicked.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...phone } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], ...phone } },
  ],
  webServer: { command: `pnpm start --port ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: !process.env.CI },
});
