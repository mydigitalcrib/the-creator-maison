/** The closed card cover (first visit), desktop + phone. */
import { test } from '@playwright/test';

test('open-file closed cover', async ({ page }, info) => {
  await page.goto('http://localhost:4321/');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `screenshots/${info.project.name}/a-pages/cover-closed.png`, fullPage: true });
});
