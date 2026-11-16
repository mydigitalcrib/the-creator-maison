/**
 * Automatic tests for all 3 sites.
 *
 *   npm run build   (tests run against the built sites)
 *   npm test
 *
 * Every site is tested in Chromium, Firefox and WebKit (Safari's engine),
 * plus a 360px-wide touch phone.
 */
import { defineConfig, devices } from '@playwright/test';

export const SITES = [
  { name: 'open-file', port: 4321 },
  { name: 'pop-zine', port: 4322 },
  { name: 'desktop-diary', port: 4323 },
] as const;

const DESKTOP = [
  { name: 'chromium', use: devices['Desktop Chrome'] },
  { name: 'firefox', use: devices['Desktop Firefox'] },
  { name: 'webkit', use: devices['Desktop Safari'] },
];

const PHONE = {
  ...devices['Pixel 7'],
  viewport: { width: 360, height: 780 },
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
  },
  projects: SITES.flatMap((site) => [
    ...DESKTOP.map((browser) => ({
      name: `${site.name} · ${browser.name}`,
      testIgnore: /mobile\.spec\.ts/,
      use: { ...browser.use, baseURL: `http://localhost:${site.port}` },
    })),
    {
      name: `${site.name} · phone`,
      testMatch: /(pages|mobile)\.spec\.ts/,
      use: { ...PHONE, baseURL: `http://localhost:${site.port}` },
    },
  ]),
  webServer: SITES.map((site) => ({
    command: `npm run preview -w @mfm/${site.name}`,
    url: `http://localhost:${site.port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  })),
});
