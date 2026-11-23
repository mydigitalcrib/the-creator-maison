/** Behaviour that must work the same on all 3 sites. */
import { expect, test } from '@playwright/test';

// Site A greets first-time visitors with an envelope intro; these tests act like returning visitors.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('mfm-letter-opened', '1'));
});

test('the plain list of all work is one click from home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'See all work as a list' }).click();
  await expect(page).toHaveURL(/\/work\/(#list)?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('All work');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6);
});

test('every category is linked from the work page and lists its videos', async ({ page }) => {
  await page.goto('/work/');
  for (const id of ['beauty', 'fashion', 'wellness', 'tech', 'apps', 'storytelling']) {
    await expect(page.locator(`a[href="/work/${id}/"]`).first()).toBeAttached();
  }
  await page.goto('/work/beauty/');
  await expect(page.locator('.videos > li')).toHaveCount(3);
});

test('videos have an accessible name', async ({ page }) => {
  await page.goto('/work/beauty/glass-skin-in-five/');
  await expect(page.locator('video[aria-label="Glass skin in five minutes, for Skincare brand"]')).toBeAttached();
});

test('video pages link to the next video in the category', async ({ page }) => {
  await page.goto('/work/beauty/glass-skin-in-five/');
  await page.locator('a[rel="next"]').click();
  await expect(page).toHaveURL(/\/work\/beauty\/lipstick-wear-test\/$/);
});

test('unknown pages show the 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await expect(page.getByRole('link', { name: 'All work' }).first()).toBeVisible();
});

test.describe('contact form (placeholder mode)', () => {
  test('requires name, email, brand and message', async ({ page }) => {
    await page.goto('/contact/');
    await page.getByRole('button', { name: 'Send brief' }).click();
    const nameIsValid = await page
      .getByLabel('Your name *')
      .evaluate((el) => (el as HTMLInputElement).validity.valid);
    expect(nameIsValid).toBe(false);
    await expect(page.locator('.mfm-form__status')).toBeEmpty();
  });

  test('says nothing was sent when filled in', async ({ page }) => {
    await page.goto('/contact/');
    await page.getByLabel('Your name *').fill('Test Person');
    await page.getByLabel('Email *').fill('test@example.com');
    await page.getByLabel('Brand or company *').fill('Test Brand');
    await page.getByRole('checkbox', { name: 'Short-form video' }).check();
    await page.getByLabel('Timeline').selectOption({ index: 1 });
    await page.getByLabel('Tell me about the project *').fill('A test brief.');
    await page.getByRole('button', { name: 'Send brief' }).click();
    await expect(page.getByRole('status')).toContainText('nothing was sent');
  });
});
