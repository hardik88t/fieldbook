import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4173);
const ORIGIN = `http://127.0.0.1:${PORT}`;

// The e2e run needs dist/ (npm run e2e builds it first). The server serves dist/ under /fieldbook/
// the way GitHub Pages does. Set FIELDBOOK_CHROMIUM to reuse an installed Chromium instead of the
// one that `npx playwright install chromium` downloads.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: ORIGIN,
    trace: 'retain-on-failure',
    launchOptions: process.env.FIELDBOOK_CHROMIUM
      ? { executablePath: process.env.FIELDBOOK_CHROMIUM }
      : {},
  },
  webServer: {
    command: 'node e2e/serve-dist.mjs',
    env: { PORT: String(PORT) },
    url: `${ORIGIN}/fieldbook/`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'web',
      testIgnore: /screenshots\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      // Captures the README screenshots. Run with npm run screenshots.
      name: 'screenshots',
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 },
    },
  ],
});
