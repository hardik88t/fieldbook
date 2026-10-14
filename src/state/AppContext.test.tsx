import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { SqlDb } from '@/data/sql';
import { EmptyCartError } from '@/data/repositories';
import { FakeTransport } from '@/sync/fakeTransport';
import { NOW, openTestDatabase } from '@/testing/helpers';

import {
  useActiveCustomer,
  useAppActions,
  useAppStatus,
  useCart,
  useConnectivity,
  useLastOrder,
  useOrders,
  useSync,
  useTodayStops,
} from './hooks';
import { AppProvider } from './AppContext';

/**
 * Builds a provider wrapper over one shared in-memory database, so tests can unmount and remount
 * the app and check what survived (the way a page reload would).
 */
function makeApp(options: { online?: boolean } = {}) {
  const dbPromise: Promise<SqlDb> = openTestDatabase({ seed: false }).then((t) => t.db);
  const transport = new FakeTransport({
    latencyMs: 0,
    sleep: async () => undefined,
    online: true,
    now: () => NOW,
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppProvider
        openDatabase={() => dbPromise}
        transport={transport}
        now={() => NOW}
        initiallyOnline={options.online ?? true}
      >
        {children}
      </AppProvider>
    );
  }
  return { Wrapper, transport };
}

async function renderReady<T>(hook: () => T, wrapper: ReturnType<typeof makeApp>['Wrapper']) {
  const rendered = await renderHook(() => ({ value: hook(), status: useAppStatus() }), { wrapper });
  await waitFor(() => expect(rendered.result.current.status.ready).toBe(true));
  return rendered;
}

describe('AppProvider boot', () => {
  it('opens, seeds and reports ready', async () => {
    const { Wrapper } = makeApp();
    const { result } = await renderReady(() => useTodayStops(), Wrapper);
    await waitFor(() => expect(result.current.value.data).toHaveLength(7));
    expect(result.current.value.data?.[0]?.visitState).toBe('done');
  });
});

describe('active customer', () => {
  it('starts a visit, resolves the customer and remembers it across a restart', async () => {
    const { Wrapper } = makeApp();
    const first = await renderReady(() => useActiveCustomer(), Wrapper);
    await act(async () => {
      await first.result.current.value.startVisit('cust-northgate');
    });
    await waitFor(() =>
      expect(first.result.current.value.customer?.name).toBe('Northgate Pharmacy'),
    );
    await first.unmount();

    const second = await renderReady(() => useActiveCustomer(), Wrapper);
    await waitFor(() => expect(second.result.current.value.customerId).toBe('cust-northgate'));
  });
});

describe('cart and orders', () => {
  it('totals the reference cart in paise: subtotal 5,420, GST 271, total 5,691', async () => {
    const { Wrapper } = makeApp();
    const { result } = await renderReady(
      () => ({ visit: useActiveCustomer(), cart: useCart() }),
      Wrapper,
    );
    await act(async () => {
      await result.current.value.visit.startVisit('cust-northgate');
    });
    await act(async () => {
      await result.current.value.cart.setQty('rice-basmati-rice-gold', 2);
      await result.current.value.cart.setQty('oil-ghee-sunflower-oil', 6);
      await result.current.value.cart.setQty('oil-ghee-desi-ghee', 2);
    });
    await waitFor(() => expect(result.current.value.cart.totals.totalPaise).toBe(569100));
    expect(result.current.value.cart.totals.subtotalPaise).toBe(542000);
    expect(result.current.value.cart.totals.gstPaise).toBe(27100);
    expect(result.current.value.cart.itemCount).toBe(10);
  });

  it('places an order: clears the cart and syncs it when online', async () => {
    const { Wrapper } = makeApp({ online: true });
    const { result } = await renderReady(
      () => ({ visit: useActiveCustomer(), cart: useCart(), orders: useOrders() }),
      Wrapper,
    );
    await act(async () => {
      await result.current.value.visit.startVisit('cust-northgate');
    });
    await act(async () => {
      await result.current.value.cart.setQty('rice-basmati-rice-gold', 1);
    });
    let placedId = '';
    await act(async () => {
      placedId = (await result.current.value.cart.placeOrder('Back door')).id;
    });

    const placed = () => result.current.value.orders.data?.find((o) => o.id === placedId);
    await waitFor(() => expect(placed()?.status).toBe('synced'));
    expect(result.current.value.cart.lines).toEqual([]);
  });

  it('keeps an order queued while offline, then sends it on reconnect', async () => {
    const { Wrapper, transport } = makeApp({ online: false });
    const { result } = await renderReady(
      () => ({
        visit: useActiveCustomer(),
        cart: useCart(),
        orders: useOrders(),
        sync: useSync(),
        net: useConnectivity(),
      }),
      Wrapper,
    );
    await act(async () => {
      await result.current.value.visit.startVisit('cust-northgate');
    });
    await act(async () => {
      await result.current.value.cart.setQty('rice-basmati-rice-gold', 1);
    });
    let placedId = '';
    await act(async () => {
      placedId = (await result.current.value.cart.placeOrder('')).id;
    });

    const placed = () => result.current.value.orders.data?.find((o) => o.id === placedId);
    await waitFor(() => expect(placed()?.status).toBe('queued'));
    expect(result.current.value.sync.pendingCount).toBe(1);
    expect(transport.serverOrderCount()).toBe(0);

    // Reconnect and wait for the send inside act, so React commits the final state.
    await act(async () => {
      result.current.value.net.setOnline(true);
      await result.current.value.sync.flushNow();
    });
    await waitFor(() => expect(placed()?.status).toBe('synced'));
    expect(transport.serverOrderCount()).toBe(1);
    await waitFor(() => expect(result.current.value.sync.pendingCount).toBe(0));
  });

  it('refuses to place an empty cart', async () => {
    const { Wrapper } = makeApp();
    const { result } = await renderReady(
      () => ({ visit: useActiveCustomer(), cart: useCart() }),
      Wrapper,
    );
    await act(async () => {
      await result.current.value.visit.startVisit('cust-northgate');
    });
    await expect(result.current.value.cart.placeOrder('')).rejects.toBeInstanceOf(EmptyCartError);
  });

  it('copies the previous visit into the cart for "Reorder last visit"', async () => {
    const { Wrapper } = makeApp();
    const { result } = await renderReady(
      () => ({ visit: useActiveCustomer(), last: useLastOrder('cust-sunrise'), cart: useCart() }),
      Wrapper,
    );
    await act(async () => {
      await result.current.value.visit.startVisit('cust-sunrise');
    });
    await waitFor(() => expect(result.current.value.last.data?.lines).toHaveLength(9));

    let copied = 0;
    await act(async () => {
      copied = await result.current.value.last.reorder();
    });
    expect(copied).toBe(9);
    await waitFor(() => expect(result.current.value.cart.lines).toHaveLength(9));
  });

  it('resets demo data: clears the active customer and their cart', async () => {
    const { Wrapper } = makeApp();
    const { result } = await renderReady(
      () => ({ visit: useActiveCustomer(), cart: useCart(), reset: useAppActions() }),
      Wrapper,
    );
    await act(async () => {
      await result.current.value.visit.startVisit('cust-northgate');
    });
    await act(async () => {
      await result.current.value.cart.setQty('rice-basmati-rice-gold', 3);
    });
    await waitFor(() => expect(result.current.value.cart.itemCount).toBe(3));

    await act(async () => {
      await result.current.value.reset.resetDemoData();
    });
    await waitFor(() => expect(result.current.value.visit.customerId).toBeNull());
    expect(result.current.value.cart.itemCount).toBe(0);
  });
});

describe('connection switch', () => {
  it('refuses Sync now while offline and sends nothing', async () => {
    const { Wrapper, transport } = makeApp({ online: false });
    const { result } = await renderReady(
      () => ({ visit: useActiveCustomer(), cart: useCart(), orders: useOrders(), sync: useSync() }),
      Wrapper,
    );
    await act(async () => {
      await result.current.value.visit.startVisit('cust-northgate');
    });
    await act(async () => {
      await result.current.value.cart.setQty('rice-basmati-rice-gold', 1);
    });
    let placedId = '';
    await act(async () => {
      placedId = (await result.current.value.cart.placeOrder('')).id;
    });

    await act(async () => {
      await expect(result.current.value.sync.flushNow()).rejects.toThrow(/offline/i);
    });
    expect(transport.serverOrderCount()).toBe(0);
    expect(result.current.value.orders.data?.find((o) => o.id === placedId)?.status).toBe('queued');
  });

  it('keeps the offline switch after a restart, as a reload would', async () => {
    const { Wrapper } = makeApp({ online: true });
    const first = await renderReady(() => useConnectivity(), Wrapper);
    expect(first.result.current.value.online).toBe(true);
    await act(async () => {
      first.result.current.value.setOnline(false);
    });
    // Let the save finish before the restart, as the browser's IndexedDB write does.
    await waitFor(() => expect(first.result.current.value.online).toBe(false));
    await first.unmount();

    const second = await renderReady(() => useConnectivity(), Wrapper);
    await waitFor(() => expect(second.result.current.value.online).toBe(false));
  });
});
