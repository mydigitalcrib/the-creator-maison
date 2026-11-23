/**
 * Every page, every site, every browser:
 * loads, has the basic structure, and passes an automated accessibility scan.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

for (const route of ROUTES) {
  test.describe(`${route}`, () => {
    test('loads with one h1, a main landmark and a working skip link', async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main#main')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');

      const skip = page.locator('a.mfm-skip');
      await expect(skip).toHaveAttribute('href', '#main');
      await skip.focus();
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
    });

    test('has no serious or critical accessibility issues', async ({ page }) => {
      // Videos don't autoplay with reduced motion: keeps the scan fast (Firefox slows
      // down a lot while several videos decode at once). It doesn't change what's checked.
      test.setTimeout(60_000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const problems = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id} (${v.nodes.length}×): ${v.help} → ${v.nodes[0]?.target.join(' ')}`);
      expect(problems).toEqual([]);
    });
  });
}
