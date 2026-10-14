import { expect, test, type Page } from '@playwright/test';

import { setOnline, startVisit, tab, watchErrors } from './helpers';

test('route to synced order: visit, catalogue, cart, offline order, then sync', async ({
  page,
}) => {
  const errors = watchErrors(page);

  // Route: today's stops and the up-next card.
  await page.goto('/fieldbook/');
  await expect(page.getByRole('progressbar', { name: 'Route progress' })).toBeVisible();
  await expect(page.getByText(/stops left/)).toBeVisible();

  // Catalogue: start the visit, then search, filter, add three items and use the reorder banner.
  const shop = await startVisit(page);
  const search = page.getByPlaceholder('Search products');
  await search.fill('ghee');
  await expect(page.getByRole('button', { name: 'Add Desi Ghee to cart' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Sunflower Oil to cart' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search' }).click();

  await page.getByRole('button', { name: 'Pulses', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Toor Dal to cart' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Basmati Rice Gold to cart' })).toHaveCount(0);
  for (const name of ['Toor Dal', 'Chana Dal', 'Besan']) {
    await page.getByRole('button', { name: `Add ${name} to cart` }).click();
    await expect(page.getByRole('button', { name: `Add one more ${name}` })).toBeVisible();
  }

  const reorder = page.getByRole('button', { name: /^Reorder last visit from / });
  await expect(reorder).toBeVisible();
  await reorder.click();
  await expect(page.getByText(/items? added/)).toBeVisible();

  // Cart: steppers, delivery note and totals.
  await tab(page, 'Cart').click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByLabel(`Cart for ${shop}`, { exact: false })).toBeVisible();
  // The reorder merged into existing lines, so check the stepper relative to what it shows now.
  const before = await quantityOf(page, 'Besan');
  await page.getByRole('button', { name: 'Increase Besan' }).click();
  await expect(page.getByLabel(`Besan, quantity ${before + 1}`)).toBeVisible();
  await page.getByRole('button', { name: 'Decrease Besan' }).click();
  await expect(page.getByLabel(`Besan, quantity ${before}`)).toBeVisible();
  await page.getByLabel('Delivery note').fill('Leave with the cashier. Call on arrival.');
  await expect(page.getByText(/GST/).first()).toBeVisible();

  // Settings: go offline. The order is written to the device and waits in the queue.
  await setOnline(page, false);
  await tab(page, 'Cart').click();
  const placeButton = page.getByRole('button', { name: /^Place order · ₹/ });
  const amount = ((await placeButton.getAttribute('aria-label')) ?? '').replace(
    /^Place order · /,
    '',
  );
  expect(amount).toMatch(/^₹ /);
  await placeButton.click();
  await expect(page.getByText('View in Orders')).toBeVisible();

  // Orders: the new order is queued, not sent.
  await tab(page, 'Orders').click();
  const queued = page.getByRole('button', {
    name: new RegExp(`^Open order for ${escapeRegExp(shop)}, ${escapeRegExp(amount)}, Queued$`),
  });
  await expect(queued).toBeVisible();

  // Back online: the queue flushes and the order becomes synced.
  await setOnline(page, true);
  await tab(page, 'Orders').click();
  const synced = page.getByRole('button', {
    name: new RegExp(`^Open order for ${escapeRegExp(shop)}, ${escapeRegExp(amount)}, Synced$`),
  });
  await expect(synced).toBeVisible({ timeout: 20_000 });

  expect(errors).toEqual([]);
});

async function quantityOf(page: Page, product: string): Promise<number> {
  const label = await page
    .getByLabel(new RegExp(`^${escapeRegExp(product)}, quantity \\d+$`))
    .getAttribute('aria-label');
  return Number(label?.match(/quantity (\d+)$/)?.[1] ?? NaN);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
