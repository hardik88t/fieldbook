import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { setOnline, startVisit, tab } from './helpers';

/**
 * Captures the README screenshots from the web build, with realistic seeded state: a visit in
 * progress, a cart with lines and a note, and one order waiting in the offline queue.
 * Phone shots are 390 x 844 CSS pixels at 2x. The desktop shot is 1280 x 800 at 1x.
 * Run with: npm run screenshots
 */
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');

async function shoot(page: Page, name: string): Promise<void> {
  // Drop focus so no field shows a focus outline, then wait for fonts and the blur to settle.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, name), animations: 'disabled' });
}

test('capture the README screenshots', async ({ page, browser }) => {
  // Route: the up-next card, before the visit starts.
  await page.goto('/fieldbook/');
  await expect(page.getByRole('progressbar', { name: 'Route progress' })).toBeVisible();
  await shoot(page, 'route.png');

  // Catalogue: a visit in progress, with two items already added.
  await startVisit(page);
  const search = page.getByPlaceholder('Search products');
  await search.fill('ghee');
  await page.getByRole('button', { name: 'Add Desi Ghee to cart' }).click();
  await search.fill('basmati');
  await page.getByRole('button', { name: 'Add Basmati Rice Gold to cart' }).click();
  await search.fill('toor');
  await page.getByRole('button', { name: 'Add Toor Dal to cart' }).click();
  await search.fill('');
  await expect(page.getByLabel('1 in cart').first()).toBeVisible();
  await shoot(page, 'catalogue.png');

  // Cart: quantities, a delivery note, and the totals.
  await tab(page, 'Cart').click();
  await expect(page.getByLabel('Desi Ghee, quantity 1')).toBeVisible();
  await page.getByRole('button', { name: 'Increase Desi Ghee' }).click();
  await expect(page.getByLabel('Desi Ghee, quantity 2')).toBeVisible();
  await page.getByLabel('Delivery note').fill('Leave with the cashier. Call on arrival.');
  // Focusing the note scrolls the list down, so scroll back to the shop header first.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.querySelectorAll<HTMLElement>('*').forEach((element) => {
      if (element.scrollTop > 0) element.scrollTop = 0;
    });
  });
  await shoot(page, 'cart.png');

  // Orders: place the order while offline, so it shows as queued.
  await setOnline(page, false);
  await tab(page, 'Cart').click();
  await page.getByRole('button', { name: /^Place order · ₹/ }).click();
  await expect(page.getByText('View in Orders')).toBeVisible();
  await tab(page, 'Orders').click();
  await expect(page.getByRole('button', { name: /Queued$/ }).first()).toBeVisible();
  await shoot(page, 'orders.png');

  // Settings: back online, the queued order sends.
  await setOnline(page, true);
  await tab(page, 'Orders').click();
  await expect(page.getByRole('button', { name: /Synced$/ }).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('switch', { name: 'Online connection' })).toBeVisible();
  await shoot(page, 'settings.png');

  // Desktop: the same database, in a 1280 x 800 window at 1x.
  const state = await page.context().storageState({ indexedDB: true });
  const desktop = await browser.newContext({
    storageState: state,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto('/fieldbook/catalogue');
  await expect(desktopPage.getByPlaceholder('Search products')).toBeVisible();
  await expect(desktopPage.getByLabel('Visiting', { exact: false })).toBeVisible();
  await shoot(desktopPage, 'desktop-web.png');
  await desktop.close();
});
