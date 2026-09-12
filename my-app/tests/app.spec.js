const { test, expect } = require('@playwright/test');

test('homepage loads with heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Items');
});

test('can add a new item', async ({ page }) => {
  await page.goto('/');
  const uniqueName = `Test Item ${Date.now()}`;

  await page.fill('input[placeholder="New item name"]', uniqueName);
  await page.click('button:has-text("Add")');

  await expect(page.locator('.item-list')).toContainText(uniqueName);
});

test('can delete an item', async ({ page }) => {
  await page.goto('/');
  const uniqueName = `Delete Me ${Date.now()}`;

  await page.fill('input[placeholder="New item name"]', uniqueName);
  await page.click('button:has-text("Add")');
  await expect(page.locator('.item-list')).toContainText(uniqueName);

  const row = page.locator('li', { hasText: uniqueName });
  await row.locator('button:has-text("Delete")').click();

  await expect(page.locator('.item-list')).not.toContainText(uniqueName);
});
