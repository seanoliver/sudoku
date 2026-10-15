import { createHash } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const checkoutPort = 3400 + parseInt(createHash('sha256').update(process.cwd()).digest('hex').slice(0, 8), 16) % 600;
const PORT = Number(process.env.E2E_PORT) || (process.env.CI ? 3400 : checkoutPort);
const phone = { viewport: { width: 390, height: 844 } };

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, reducedMotion: 'reduce' },
  // WebKit matters here: Safari does not focus a button when it is clicked.
  projects: [
    { name: 'chromium', testIgnore: /navigation\.spec/, use: { ...devices['Desktop Chrome'], ...phone } },
    { name: 'webkit', testIgnore: /navigation\.spec/, use: { ...devices['Desktop Safari'], ...phone } },
    { name: 'motion', testMatch: /navigation\.spec/, use: { ...devices['Desktop Chrome'], ...phone, reducedMotion: 'no-preference' } },
    { name: 'motion-webkit', testMatch: /navigation\.spec/, use: { ...devices['Desktop Safari'], ...phone, reducedMotion: 'no-preference' } },
  ],
  webServer: { command: `pnpm start --port ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: !process.env.CI },
});
