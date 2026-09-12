// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm --prefix server run start',
      port: 5000,
      timeout: 30_000,
      reuseExistingServer: true,
    },
    {
      command: 'npm --prefix client start',
      port: 3000,
      timeout: 60_000,
      reuseExistingServer: true,
    },
  ],
});
