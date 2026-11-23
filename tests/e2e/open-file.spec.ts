/** Site A (editorial drop) signature moves. Runs only on the open-file projects. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({}, info) => {
  test.skip(!info.project.name.startsWith('open-file'), 'Site A only');
});

test('the hero splits the name around the cut-out photo, with category tags', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sinai Rivodó');
  await expect(page.locator('.hero-photo img')).toBeVisible();
  await expect(page.locator('.hotspot')).toHaveCount(3);
  await expect(page.locator('.hotspot').first()).toHaveAttribute('href', /^\/work\/[a-z-]+\/$/);
});

test('the category index links to every category', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.cat-row')).toHaveCount(6);
  await expect(page.locator('.cat-row').first()).toHaveAttribute('href', '/work/beauty/');
});

test('the hero photo follows the cursor', async ({ page }, info) => {
  test.skip(info.project.name.includes('phone'), 'mouse only');
  await page.goto('/');
  await page.mouse.move(80, 80);
  await page.mouse.move(1100, 600, { steps: 10 });
  await page.waitForTimeout(800);
  const mx = await page.locator('[data-hero]').evaluate((el) => parseFloat(el.style.getPropertyValue('--mx') || '0'));
  expect(Math.abs(mx)).toBeGreaterThan(0.05);
});
