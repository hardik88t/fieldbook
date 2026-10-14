/**
 * Public hooks for screens. This file is the contract for screen builders (see CONTRIBUTING.md,
 * "Building a screen"). Screens read data through these hooks and write through their actions.
 * Do not import repositories or the sync engine directly from a screen.
 */
import { useMemo } from 'react';

import type { CartLineView, ProductFilter, Repositories } from '@/data/repositories';
import { computeTotals, EMPTY_TOTALS } from '@/domain/cart';
import { localDateKey, startOfLocalDay } from '@/domain/dates';
import type {
  Category,
  Customer,
  Order,
  OrderSummary,
  Product,
  StopView,
  Totals,
} from '@/domain/types';
import type { FlushReport } from '@/sync/engine';

import { useAppContext, type AppActions } from './AppContext';
import { useQuery, type Query } from './useQuery';

export type { CartLineView, ProductFilter } from '@/data/repositories';
export type { Query } from './useQuery';

/** Boot state. `ready` is false while the database opens and seeds. */
export function useAppStatus(): {
  status: 'booting' | 'ready' | 'error';
  error: string | null;
  ready: boolean;
} {
  const { status, error } = useAppContext();
  return { status, error, ready: status === 'ready' };
}

/** Repositories for one-off reads. Prefer the query hooks below. Null until the app is ready. */
export function useRepositories(): Repositories | null {
  return useAppContext().services?.repos ?? null;
}

/** Write actions. Use for flows the hooks below do not cover (for example, Settings). */
export function useAppActions(): AppActions {
  return useAppContext().actions;
}

/** Demo connectivity switch and the sync trigger. */
export function useConnectivity(): { online: boolean; setOnline: (online: boolean) => void } {
  const { online, actions } = useAppContext();
  return { online, setOnline: actions.setOnline };
}

/** The shop the rep is visiting right now. Persisted on the device. */
export function useActiveCustomer(): {
  customerId: string | null;
  customer: Customer | null;
  loading: boolean;
  /** Sets the active customer. Call this from "Start visit", then navigate to Catalogue. */
  startVisit: (customerId: string) => Promise<void>;
  endVisit: () => Promise<void>;
} {
  const { activeCustomerId, actions } = useAppContext();
  const customer = useQuery(
    (repos) =>
      activeCustomerId ? repos.stops.getCustomer(activeCustomerId) : Promise.resolve(null),
    [activeCustomerId],
  );
  return {
    customerId: activeCustomerId,
    customer: customer.data ?? null,
    loading: activeCustomerId !== null && customer.loading,
    startVisit: actions.startVisit,
    endVisit: actions.endVisit,
  };
}

export interface CartView {
  /** Customer whose cart this is, or null when no visit is active. */
  customerId: string | null;
  lines: CartLineView[];
  totals: Totals;
  /** Sum of quantities across lines, for the tab badge. */
  itemCount: number;
  loading: boolean;
  setQty: (productId: string, qty: number) => Promise<void>;
  addOne: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  /**
   * Places the order for the active customer: writes it locally as "queued" and sends it when
   * online. Clears the cart. Throws EmptyCartError when the cart is empty.
   */
  placeOrder: (note: string) => Promise<Order>;
}

/** The active customer's cart, saved on this device. Totals are computed in paise with 5% GST. */
export function useCart(): CartView {
  const { activeCustomerId, actions } = useAppContext();
  const lines = useQuery(
    (repos) =>
      activeCustomerId
        ? repos.cart.listLines(activeCustomerId)
        : Promise.resolve<CartLineView[]>([]),
    [activeCustomerId],
  );
  const data = useMemo<CartLineView[]>(() => lines.data ?? [], [lines.data]);
  const totals = useMemo<Totals>(
    () =>
      data.length === 0
        ? EMPTY_TOTALS
        : computeTotals(
            data.map((line) => ({ unitPricePaise: line.unitPricePaise, qty: line.qty })),
          ),
    [data],
  );
  return {
    customerId: activeCustomerId,
    lines: data,
    totals,
    itemCount: data.reduce((sum, line) => sum + line.qty, 0),
    loading: activeCustomerId !== null && lines.loading,
    setQty: actions.setCartQty,
    addOne: actions.addToCart,
    clear: actions.clearCart,
    placeOrder: actions.placeOrder,
  };
}

export function useCategories(): Query<Category[]> {
  return useQuery((repos) => repos.products.listCategories(), []);
}

/** Catalogue products. Filter by free text and/or category. Re-runs when filter values change. */
export function useProducts(filter: ProductFilter = {}): Query<Product[]> {
  const query = filter.query ?? '';
  const categoryId = filter.categoryId ?? null;
  return useQuery(
    (repos) => repos.products.listProducts({ query, categoryId }),
    [query, categoryId],
  );
}

/** Today's route in planned order, each stop with its customer and last order. */
export function useTodayStops(): Query<StopView[]> {
  const { services } = useAppContext();
  return useQuery(
    (repos) => repos.stops.listForDate(localDateKey(services?.now() ?? new Date())),
    [services],
  );
}

/** Orders, newest first. */
export function useOrders(options: { limit?: number } = {}): Query<OrderSummary[]> {
  const limit = options.limit;
  return useQuery((repos) => repos.orders.listSummaries({ limit }), [limit]);
}

export function useOrder(orderId: string | null): Query<Order | null> {
  return useQuery(
    (repos) => (orderId ? repos.orders.getOrder(orderId) : Promise.resolve(null)),
    [orderId],
  );
}

export interface LastOrderView extends Query<Order | null> {
  /** Copies the last order's lines into the cart. Resolves with the number of lines copied. */
  reorder: () => Promise<number>;
}

/**
 * The customer's most recent order from an earlier day, for the "Reorder last visit" banner.
 * Orders placed today are ignored, so the banner never offers the order that was just placed.
 */
export function useLastOrder(customerId: string | null): LastOrderView {
  const { actions, services } = useAppContext();
  const last = useQuery(
    (repos) =>
      customerId
        ? repos.orders.lastOrderForCustomer(customerId, {
            before: startOfLocalDay(services?.now() ?? new Date()).toISOString(),
          })
        : Promise.resolve(null),
    [customerId, services],
  );
  return {
    ...last,
    reorder: () => (customerId ? actions.reorderLastVisit(customerId) : Promise.resolve(0)),
  };
}

export interface SyncView {
  online: boolean;
  /** Orders not yet confirmed by the server, including parked ones. */
  pendingCount: number;
  /** Sends everything due now. */
  flushNow: () => Promise<FlushReport>;
  /** Clears backoff for one order and sends it now. Use for the "Retry" action on failed orders. */
  retryOrder: (orderId: string) => Promise<FlushReport>;
}

export function useSync(): SyncView {
  const { online, actions } = useAppContext();
  const pending = useQuery((repos) => repos.syncQueue.pendingCount(), []);
  return {
    online,
    pendingCount: pending.data ?? 0,
    flushNow: actions.flushNow,
    retryOrder: actions.retryOrder,
  };
}
