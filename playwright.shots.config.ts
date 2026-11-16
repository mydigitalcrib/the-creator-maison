/**
 * Screenshots of all 3 sites, desktop + phone, for side-by-side review.
 *
 *   npm run build
 *   npm run shots        → images land in screenshots/
 */
import { defineConfig, devices } from '@playwright/test';
import base, { SITES } from './playwright.config';

export default defineConfig({
  ...base,
  testDir: 'tests/visual',
  reporter: 'list',
  outputDir: 'test-results/shots',
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  metadata: { sites: SITES },
});
