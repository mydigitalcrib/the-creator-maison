/** Full-page screenshots of every Site A page type (desktop + phone). */
import { test } from '@playwright/test';

const PAGES = [
  '/',
  '/about/',
  '/proof/',
  '/contact/',
  '/work/',
  '/work/beauty/',
  '/work/beauty/glass-skin-in-five/',
  '/nope/',
];

for (const path of PAGES) {
  test(`open-file page ${path}`, async ({ page }, info) => {
    // skip the envelope intro (it shows once per visit)
    await page.addInitScript(() => sessionStorage.setItem('mfm-letter-opened', '1'));
    await page.goto(`http://localhost:4321${path}`);
    await page.evaluate(() => document.fonts.ready);
    const slug = path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\//g, '--');
    await page.screenshot({ path: `screenshots/${info.project.name}/a-pages/${slug}.png`, fullPage: true });
  });
}
