/** Captures the same pages on every site so they can be compared side by side. */
import { test } from '@playwright/test';
import { SITES } from '../../playwright.config';

const PAGES = [
  { slug: 'home', path: '/' },
  { slug: 'category', path: '/work/beauty/' },
  { slug: 'video', path: '/work/beauty/glass-skin-in-five/' },
  { slug: 'contact', path: '/contact/' },
];

for (const site of SITES) {
  for (const page of PAGES) {
    test(`${site.name} · ${page.slug}`, async ({ page: p }, info) => {
      await p.goto(`http://localhost:${site.port}${page.path}`);
      await p.evaluate(() => document.fonts.ready);
      await p.screenshot({
        path: `screenshots/${info.project.name}/${site.name}--${page.slug}.png`,
        fullPage: false,
      });
    });
  }
}
