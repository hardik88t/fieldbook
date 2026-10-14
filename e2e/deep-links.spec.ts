import { expect, test, type Locator, type Page } from '@playwright/test';

import { ROUTES, type Route, tab, watchErrors } from './helpers';

/** The element that proves each screen rendered. */
const RENDERED: Record<Route, (page: Page) => Locator> = {
  route: (page) => page.getByRole('progressbar', { name: 'Route progress' }),
  catalogue: (page) => page.getByPlaceholder('Search products'),
  cart: (page) => page.getByText('No shop selected'),
  orders: (page) => page.getByRole('button', { name: 'Sync now' }),
  settings: (page) => page.getByRole('switch', { name: 'Online connection' }),
};

test('the root opens the Route tab', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/fieldbook/');
  await expect(page).toHaveURL(/\/fieldbook\/route$/);
  await expect(RENDERED.route(page)).toBeVisible();
  expect(errors).toEqual([]);
});

for (const route of ROUTES) {
  test(`/${route} loads directly, on refresh and as ${route}.html`, async ({ page }) => {
    const errors = watchErrors(page);

    const direct = await page.goto(`/fieldbook/${route}`);
    expect(direct?.status()).toBe(200);
    await expect(RENDERED[route](page)).toBeVisible();

    await page.reload();
    await expect(RENDERED[route](page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/fieldbook/${route}$`));

    const withHtml = await page.goto(`/fieldbook/${route}.html`);
    expect(withHtml?.status()).toBe(200);
    await expect(RENDERED[route](page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/fieldbook/${route}$`));

    expect(errors).toEqual([]);
  });
}

test('tab bar navigation keeps working after a direct load', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/fieldbook/orders');
  await expect(RENDERED.orders(page)).toBeVisible();
  await tab(page, 'Cart').click();
  await expect(page).toHaveURL(/\/fieldbook\/cart$/);
  await expect(RENDERED.cart(page)).toBeVisible();
  await tab(page, 'Route').click();
  await expect(RENDERED.route(page)).toBeVisible();
  expect(errors).toEqual([]);
});

test('an order detail opens from the list and survives a refresh', async ({ page }) => {
  // Pages answers an order id it has no file for with 404, so the browser logs one 404 line for
  // that document. The app still renders the order, which is what this test checks.
  const errors = watchErrors(page, { allowNotFound: /\/fieldbook\/order\// });
  await page.goto('/fieldbook/orders');
  await page
    .getByRole('button', { name: /^Open order for / })
    .first()
    .click();
  await expect(page).toHaveURL(/\/fieldbook\/order\/[^/]+$/);
  const timeline = page.getByLabel('Order status timeline');
  await expect(timeline).toBeVisible();
  await page.reload();
  await expect(timeline).toBeVisible();
  expect(errors).toEqual([]);
});
