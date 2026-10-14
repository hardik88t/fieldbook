import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { prepareDatabase } from '@/data/bootstrap';
import { createId } from '@/data/ids';
import type { PlaceOrderInput } from '@/data/repositories';
import { resetToSeed } from '@/data/seed';
import type { SqlDb } from '@/data/sql';
import { localDateKey, startOfLocalDay } from '@/domain/dates';
import type { Order } from '@/domain/types';
import { FakeTransport } from '@/sync/fakeTransport';
import type { FlushReport } from '@/sync/engine';
import type { SyncTransport } from '@/sync/types';

import { createServices, type AppServices } from './services';

const ACTIVE_CUSTOMER_KEY = 'activeCustomerId';
/** The Settings connection switch, saved so a reload keeps the rep offline. */
const CONNECTION_KEY = 'connection.online';
const OFFLINE_MESSAGE = 'You are offline. Orders send when you are back online.';
/** Longest a single timer may sleep. Timers are re-armed after every flush anyway. */
const MAX_TIMER_MS = 60_000;
const EMPTY_REPORT: FlushReport = {
  submitted: 0,
  failed: 0,
  parked: 0,
  remaining: 0,
  blockedUntil: null,
};

export type AppStatus = 'booting' | 'ready' | 'error';

/** Writes and sync controls. Screens reach these through the hooks in hooks.ts. */
export interface AppActions {
  setOnline(online: boolean): void;
  startVisit(customerId: string): Promise<void>;
  endVisit(): Promise<void>;
  setCartQty(productId: string, qty: number): Promise<void>;
  addToCart(productId: string): Promise<void>;
  clearCart(): Promise<void>;
  /** Throws EmptyCartError when the cart is empty. */
  placeOrder(note: string): Promise<Order>;
  /** Copies the customer's last order into the cart. Resolves with the number of lines copied. */
  reorderLastVisit(customerId: string): Promise<number>;
  retryOrder(orderId: string): Promise<FlushReport>;
  flushNow(): Promise<FlushReport>;
  resetDemoData(): Promise<void>;
}

export interface AppContextValue {
  status: AppStatus;
  error: string | null;
  services: AppServices | null;
  online: boolean;
  activeCustomerId: string | null;
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

export interface AppProviderProps {
  children: ReactNode;
  /** Opens the platform database. Native uses expo-sqlite, web uses sql.js, tests use memory. */
  openDatabase: () => Promise<SqlDb>;
  /** Defaults to a FakeTransport with 800 ms latency. */
  transport?: SyncTransport;
  /** Clock for timestamps and "today". Defaults to the real clock. */
  now?: () => Date;
  /** Defaults to online. */
  initiallyOnline?: boolean;
}

export function AppProvider({
  children,
  openDatabase,
  transport: transportOverride,
  now,
  initiallyOnline = true,
}: AppProviderProps) {
  const [transport] = useState<SyncTransport>(
    () => transportOverride ?? new FakeTransport({ latencyMs: 800, online: initiallyOnline }),
  );

  const [status, setStatus] = useState<AppStatus>('booting');
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<AppServices | null>(null);
  const [online, setOnlineState] = useState(initiallyOnline);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);

  // Refs let long-lived callbacks (timers, async actions) read the latest values without re-binding.
  const servicesRef = useRef<AppServices | null>(null);
  const onlineRef = useRef(online);
  const activeCustomerRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<FlushReport>>(async () => EMPTY_REPORT);
  const openRef = useRef(openDatabase);
  const nowRef = useRef(now);

  const clock = useCallback(() => (nowRef.current ?? (() => new Date()))(), []);

  /** Arms one timer for the earliest backed-off order, so retries happen without user action. */
  const armTimer = useCallback(async () => {
    const current = servicesRef.current;
    if (!current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const wake = await current.engine.nextWakeAt();
    if (wake === null) return;
    const delay = Math.min(MAX_TIMER_MS, Math.max(0, wake - clock().getTime()));
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (onlineRef.current) void flushRef.current();
    }, delay);
  }, [clock]);

  const runFlush = useCallback(async (): Promise<FlushReport> => {
    const current = servicesRef.current;
    if (!current) return EMPTY_REPORT;
    const report = await current.engine.flush();
    await armTimer();
    return report;
  }, [armTimer]);

  // Keep the refs pointing at the latest values. Declared before the boot effect, which reads them.
  useEffect(() => {
    openRef.current = openDatabase;
    nowRef.current = now;
    activeCustomerRef.current = activeCustomerId;
    flushRef.current = runFlush;
  }, [openDatabase, now, activeCustomerId, runFlush]);

  // Boot once: open, migrate, seed if empty, restore the active customer, then flush leftovers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openRef.current();
        const clockNow = nowRef.current ?? (() => new Date());
        await prepareDatabase(db, clockNow());
        const next = createServices({ db, transport, now: clockNow });
        await next.engine.recoverAfterRestart();
        const savedCustomer = await next.repos.settings.get(ACTIVE_CUSTOMER_KEY);
        const savedOnline = await next.repos.settings.get(CONNECTION_KEY);
        if (cancelled) return;
        const startOnline = savedOnline === null ? initiallyOnline : savedOnline === 'true';
        onlineRef.current = startOnline;
        setOnlineState(startOnline);
        transport.setOnline?.(startOnline);
        servicesRef.current = next;
        activeCustomerRef.current = savedCustomer;
        setServices(next);
        setActiveCustomerId(savedCustomer);
        setStatus('ready');
        if (onlineRef.current) void runFlush();
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : 'Could not open the database');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Boot runs once per mount. `transport` and `runFlush` are stable for the life of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actions = useMemo<AppActions>(() => {
    const requireServices = (): AppServices => {
      const current = servicesRef.current;
      if (!current) throw new Error('Fieldbook is still starting up');
      return current;
    };
    const requireCustomer = (): string => {
      const customerId = activeCustomerRef.current;
      if (!customerId) throw new Error('No active customer. Start a visit first.');
      return customerId;
    };

    return {
      setOnline: (next) => {
        onlineRef.current = next;
        setOnlineState(next);
        transport.setOnline?.(next);
        servicesRef.current?.repos.settings
          .set(CONNECTION_KEY, next ? 'true' : 'false')
          .catch((error: unknown) =>
            console.warn('Fieldbook: could not save the connection', error),
          );
        if (next) void runFlush();
      },

      startVisit: async (customerId) => {
        const current = requireServices();
        await current.repos.settings.set(ACTIVE_CUSTOMER_KEY, customerId);
        activeCustomerRef.current = customerId;
        setActiveCustomerId(customerId);
        current.bus.notify();
      },

      endVisit: async () => {
        const current = requireServices();
        await current.repos.settings.set(ACTIVE_CUSTOMER_KEY, null);
        activeCustomerRef.current = null;
        setActiveCustomerId(null);
        current.bus.notify();
      },

      setCartQty: async (productId, qty) => {
        const current = requireServices();
        await current.repos.cart.setQty(requireCustomer(), productId, qty);
        current.bus.notify();
      },

      addToCart: async (productId) => {
        const current = requireServices();
        await current.repos.cart.addLines(requireCustomer(), [{ productId, qty: 1 }]);
        current.bus.notify();
      },

      clearCart: async () => {
        const current = requireServices();
        await current.repos.cart.clear(requireCustomer());
        current.bus.notify();
      },

      placeOrder: async (note) => {
        const current = requireServices();
        const placedAt = current.now();
        const input: PlaceOrderInput = {
          orderId: createId('ord'),
          customerId: requireCustomer(),
          note: note.trim(),
          createdAt: placedAt.toISOString(),
          visitDate: localDateKey(placedAt),
        };
        const order = await current.repos.orders.placeFromCart(input);
        current.bus.notify();
        if (onlineRef.current) void runFlush();
        return order;
      },

      reorderLastVisit: async (customerId) => {
        const current = requireServices();
        const last = await current.repos.orders.lastOrderForCustomer(customerId, {
          before: startOfLocalDay(current.now()).toISOString(),
        });
        if (!last) return 0;
        await current.repos.cart.addLines(
          customerId,
          last.lines.map((line) => ({ productId: line.productId, qty: line.qty })),
        );
        current.bus.notify();
        return last.lines.length;
      },

      retryOrder: async (orderId) => {
        const current = requireServices();
        if (!onlineRef.current) throw new Error(OFFLINE_MESSAGE);
        const report = await current.engine.retry(orderId);
        await armTimer();
        return report;
      },

      flushNow: () => {
        if (!onlineRef.current) return Promise.reject(new Error(OFFLINE_MESSAGE));
        return runFlush();
      },

      resetDemoData: async () => {
        const current = requireServices();
        await resetToSeed(current.db, current.now());
        activeCustomerRef.current = null;
        setActiveCustomerId(null);
        current.bus.notify();
      },
    };
  }, [runFlush, armTimer, transport]);

  const value = useMemo<AppContextValue>(
    () => ({ status, error, services, online, activeCustomerId, actions }),
    [status, error, services, online, activeCustomerId, actions],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Internal: the raw context. Public code should use the hooks in hooks.ts. */
export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('Fieldbook hooks must be used inside <AppProvider>');
  }
  return value;
}
