import { expect, type ConsoleMessage, type Page } from '@playwright/test';

export const ROUTES = ['route', 'catalogue', 'cart', 'orders', 'settings'] as const;
export type Route = (typeof ROUTES)[number];

/**
 * Collects console errors, warnings and uncaught exceptions for a page. Tests assert the list is empty.
 * `allowNotFound` lets one test accept the browser's log line for a 404 document. GitHub Pages returns
 * 404 for dynamic routes such as /order/<id>, which the app then renders itself.
 */
export function watchErrors(page: Page, options: { allowNotFound?: RegExp } = {}): string[] {
  const errors: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    const isNotFound = message.text().includes('status of 404');
    if (isNotFound && options.allowNotFound?.test(message.location().url)) return;
    errors.push(`console.${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

/** Tab bar link. The tab labels are Route, Catalogue, Cart and Orders. */
export function tab(page: Page, name: 'Route' | 'Catalogue' | 'Cart' | 'Orders') {
  // The accessible name starts with the icon glyph and can include the Cart badge, so match on text.
  return page.getByRole('tab').filter({ hasText: name });
}

/** Opens Settings from the header, sets the demo connection switch, and returns to the previous screen. */
export async function setOnline(page: Page, online: boolean): Promise<void> {
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  const toggle = page.getByRole('switch', { name: 'Online connection' });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-checked')) !== String(online)) {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-checked', String(online));
  await page.goBack();
  await expect(page).not.toHaveURL(/\/settings$/);
}

/** Starts a visit at the first "up next" stop on the route, and returns that shop's name. */
export async function startVisit(page: Page): Promise<string> {
  await page.goto('/fieldbook/');
  const start = page.getByRole('button', { name: /^Start visit at / });
  await expect(start).toBeVisible();
  const label = (await start.getAttribute('aria-label')) ?? '';
  const shop = label.replace('Start visit at ', '');
  await start.click();
  await expect(page).toHaveURL(/\/catalogue$/);
  await expect(page.getByLabel(`Visiting ${shop}`, { exact: false })).toBeVisible();
  return shop;
}

/** Finds elements that overflow the viewport sideways, ignoring those inside a horizontal scroller. */
export async function horizontalOverflow(
  page: Page,
): Promise<{ pageOverflowPx: number; offenders: string[] }> {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const pageOverflowPx = Math.max(0, document.documentElement.scrollWidth - viewport);
    const scrolls = (element: Element | null) => {
      for (let node = element; node; node = node.parentElement) {
        const overflowX = getComputedStyle(node).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') return true;
      }
      return false;
    };
    const offenders: string[] = [];
    for (const element of Array.from(document.querySelectorAll('body *'))) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if ((rect.right > viewport + 1 || rect.left < -1) && !scrolls(element.parentElement)) {
        const label =
          element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 40) ?? '';
        offenders.push(
          `${element.tagName.toLowerCase()} "${label}" right=${Math.round(rect.right)}`,
        );
      }
    }
    return { pageOverflowPx, offenders: offenders.slice(0, 10) };
  });
}
