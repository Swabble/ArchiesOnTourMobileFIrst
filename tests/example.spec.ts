import { test, expect } from '@playwright/test';

test('homepage has hero headline', async ({ page }) => {
  await page.goto('http://localhost:4321/');
  const heading = page.locator('h1');
  await expect(heading).toHaveText(/Foodtruck Catering/);
});
