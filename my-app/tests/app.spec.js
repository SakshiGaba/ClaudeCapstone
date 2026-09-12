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

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// T8: add item with an explicit category, and add item with category omitted/blank/whitespace-only
test('adding an item with an explicit category stores it as-is', async ({ page, request }) => {
  await page.goto('/');
  const name = unique('T8-Explicit-Name');
  const category = unique('T8-Explicit-Cat');

  await page.fill('input[placeholder="New item name"]', name);
  await page.fill('input[placeholder="Category (optional)"]', category);
  await page.click('button:has-text("Add")');

  await expect(page.locator('li', { hasText: name })).toBeVisible();

  const res = await request.get(`/api/items?category=${encodeURIComponent(category)}`);
  const data = await res.json();
  expect(data.find((item) => item.name === name)?.category).toBe(category);
});

test('adding an item with category omitted, blank, or whitespace-only defaults to Uncategorized', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const omittedName = unique('T8-Omitted-Name');
  const blankName = unique('T8-Blank-Name');
  const whitespaceName = unique('T8-Whitespace-Name');

  // omitted category (field left untouched)
  await page.fill('input[placeholder="New item name"]', omittedName);
  await page.click('button:has-text("Add")');
  await expect(page.locator('li', { hasText: omittedName })).toBeVisible();

  // blank category
  await page.fill('input[placeholder="New item name"]', blankName);
  await page.fill('input[placeholder="Category (optional)"]', '');
  await page.click('button:has-text("Add")');
  await expect(page.locator('li', { hasText: blankName })).toBeVisible();

  // whitespace-only category
  await page.fill('input[placeholder="New item name"]', whitespaceName);
  await page.fill('input[placeholder="Category (optional)"]', '   ');
  await page.click('button:has-text("Add")');
  await expect(page.locator('li', { hasText: whitespaceName })).toBeVisible();

  const res = await request.get('/api/items?category=Uncategorized');
  const data = await res.json();
  const names = data.map((item) => item.name);
  expect(names).toContain(omittedName);
  expect(names).toContain(blankName);
  expect(names).toContain(whitespaceName);
});

// T9: filter list by category, and filter to a category with zero items
test('filtering by category shows only matching items', async ({ page }) => {
  await page.goto('/');
  const nameA = unique('T9-ItemA');
  const nameB = unique('T9-ItemB');
  const catA = unique('T9-CatA');
  const catB = unique('T9-CatB');

  await page.fill('input[placeholder="New item name"]', nameA);
  await page.fill('input[placeholder="Category (optional)"]', catA);
  await page.click('button:has-text("Add")');
  await expect(page.locator('li', { hasText: nameA })).toBeVisible();

  await page.fill('input[placeholder="New item name"]', nameB);
  await page.fill('input[placeholder="Category (optional)"]', catB);
  await page.click('button:has-text("Add")');
  await expect(page.locator('li', { hasText: nameB })).toBeVisible();

  await page.selectOption('#category-filter', catA);
  await expect(page.locator('li', { hasText: nameA })).toBeVisible();
  await expect(page.locator('li', { hasText: nameB })).not.toBeVisible();
});

test('filtering to a category with zero matching items shows the empty-state message', async ({ page }) => {
  await page.goto('/');
  const name = unique('T9-EmptyItem');
  const category = unique('T9-EmptyCat');

  await page.fill('input[placeholder="New item name"]', name);
  await page.fill('input[placeholder="Category (optional)"]', category);
  await page.click('button:has-text("Add")');

  await page.selectOption('#category-filter', category);
  await expect(page.locator('li', { hasText: name })).toBeVisible();

  await page.locator('li', { hasText: name }).locator('button:has-text("Delete")').click();

  await expect(page.getByText('No items in this category.')).toBeVisible();
  await expect(page.locator('.item-list')).toHaveCount(0);
});
