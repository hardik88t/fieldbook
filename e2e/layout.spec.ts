import { expect, test } from '@playwright/test';

import { horizontalOverflow, startVisit, tab, watchErrors } from './helpers';

const SCREENS = ['Route', 'Catalogue', 'Cart', 'Orders'] as const;

for (const width of [360, 390]) {
  test.describe(`phone width ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('no screen scrolls sideways', async ({ page }) => {
      const errors = watchErrors(page);
      await startVisit(page);
      await page.getByPlaceholder('Search products').fill('toor');
      await page.getByRole('button', { name: 'Add Toor Dal to cart' }).click();
      await page.getByPlaceholder('Search products').fill('');

      for (const screen of SCREENS) {
        await tab(page, screen).click();
        await page.waitForLoadState('load');
        const overflow = await horizontalOverflow(page);
        expect.soft(overflow.pageOverflowPx, `${screen} page overflow`).toBe(0);
        expect.soft(overflow.offenders, `${screen} elements past the edge`).toEqual([]);
      }

      await page.getByRole('button', { name: 'Open settings' }).click();
      await expect(page.getByRole('switch', { name: 'Online connection' })).toBeVisible();
      const settings = await horizontalOverflow(page);
      expect.soft(settings.pageOverflowPx, 'Settings page overflow').toBe(0);
      expect.soft(settings.offenders, 'Settings elements past the edge').toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}
