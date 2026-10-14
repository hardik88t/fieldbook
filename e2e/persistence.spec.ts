import { expect, test } from '@playwright/test';

import { setOnline, startVisit, tab, watchErrors } from './helpers';

test('visit, cart and a queued order survive a reload (IndexedDB)', async ({ page }) => {
  const errors = watchErrors(page);
  const shop = await startVisit(page);

  await page.getByPlaceholder('Search products').fill('toor');
  await page.getByRole('button', { name: 'Add Toor Dal to cart' }).click();
  await page.getByRole('button', { name: 'Add one more Toor Dal' }).click();
  await expect(page.getByLabel('2 in cart')).toBeVisible();

  // Reload straight after the change. The database is saved to IndexedDB a moment later.
  await page.reload();
  await expect(page.getByLabel(`Visiting ${shop}`, { exact: false })).toBeVisible();
  await tab(page, 'Cart').click();
  await expect(page.getByLabel('Toor Dal, quantity 2')).toBeVisible();

  // Place the order while offline, reload, and it is still queued.
  await setOnline(page, false);
  await tab(page, 'Cart').click();
  await page.getByRole('button', { name: /^Place order · ₹/ }).click();
  await expect(page.getByText('View in Orders')).toBeVisible();
  await page.reload();
  await tab(page, 'Orders').click();
  const queued = page.getByRole('button', { name: new RegExp(`^Open order for ${shop}.*Queued$`) });
  await expect(queued).toBeVisible();

  // Online after the reload: the queued order syncs.
  await setOnline(page, true);
  await tab(page, 'Orders').click();
  const synced = page.getByRole('button', { name: new RegExp(`^Open order for ${shop}.*Synced$`) });
  await expect(synced.first()).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
