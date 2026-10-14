import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import OrdersScreen from '@/app/(tabs)/orders';
import type { OrderSummary, OrderStatus } from '@/domain/types';
import { asPaise } from '@/money';
import { useOrders, useSync } from '@/state';

import { describeFlush, formatClock, formatOrderWhen } from '@/components/orders/format';
import { statusPresentation } from '@/components/orders/StatusPill';

function isDisabled(element: { props: { accessibilityState?: { disabled?: boolean } } }): boolean {
  return element.props.accessibilityState?.disabled === true;
}

const mockRouter = { navigate: jest.fn(), push: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  Stack: { Screen: () => null },
}));

jest.mock('@/state', () => {
  const actual = jest.requireActual('@/money');
  return {
    formatINR: actual.formatINR,
    useOrders: jest.fn(),
    useSync: jest.fn(),
  };
});

const TODAY = new Date().toISOString();

function summary(
  id: string,
  status: OrderStatus,
  overrides: Partial<OrderSummary> = {},
): OrderSummary {
  return {
    id,
    customerId: 'cust-sunrise',
    customerName: 'Sunrise Pharmacy',
    createdAt: TODAY,
    status,
    subtotalPaise: asPaise(156000),
    gstPaise: asPaise(7800),
    totalPaise: asPaise(163800),
    lastError: null,
    ...overrides,
  };
}

const ORDERS: OrderSummary[] = [
  summary('ord_q1', 'queued', { customerName: 'Bluebird Foods' }),
  summary('ord_s1', 'syncing', { customerName: 'Riverside Mart' }),
  summary('ord_ok1', 'synced', { customerName: 'Lotus Kirana' }),
  summary('ord_f1', 'failed', {
    customerName: 'Northgate Pharmacy',
    lastError: 'Server timed out',
  }),
];

interface SyncMocks {
  flushNow: jest.Mock;
  retryOrder: jest.Mock;
}

function setup({
  orders = ORDERS,
  pendingCount = 2,
  online = true,
}: { orders?: OrderSummary[]; pendingCount?: number; online?: boolean } = {}): SyncMocks {
  const sync: SyncMocks = {
    flushNow: jest
      .fn()
      .mockResolvedValue({ submitted: 2, failed: 0, parked: 0, remaining: 0, blockedUntil: null }),
    retryOrder: jest
      .fn()
      .mockResolvedValue({ submitted: 1, failed: 0, parked: 0, remaining: 0, blockedUntil: null }),
  };
  (useOrders as jest.Mock).mockReturnValue({
    data: orders,
    error: null,
    loading: false,
    refresh: jest.fn(),
  });
  (useSync as jest.Mock).mockReturnValue({
    online,
    pendingCount,
    flushNow: sync.flushNow,
    retryOrder: sync.retryOrder,
  });
  return sync;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('status pills', () => {
  it.each<[OrderStatus, string]>([
    ['queued', 'Queued'],
    ['syncing', 'Syncing'],
    ['synced', 'Synced'],
    ['failed', 'Failed'],
  ])('labels a %s order as %s', (status, label) => {
    expect(statusPresentation(status).label).toBe(label);
  });

  it('uses a different colour for each status', async () => {
    const backgrounds = new Set(
      (['queued', 'syncing', 'synced', 'failed'] as OrderStatus[]).map(
        (status) => statusPresentation(status).background,
      ),
    );
    expect(backgrounds.size).toBe(4);
  });

  it('renders one pill per order with an accessible status label', async () => {
    setup();
    await render(<OrdersScreen />);

    expect(screen.getByLabelText('Status: Queued')).toBeTruthy();
    expect(screen.getByLabelText('Status: Syncing')).toBeTruthy();
    expect(screen.getByLabelText('Status: Synced')).toBeTruthy();
    expect(screen.getByLabelText('Status: Failed')).toBeTruthy();
  });
});

describe('Orders list', () => {
  it('lists each order with its customer, total and reference', async () => {
    setup();
    await render(<OrdersScreen />);

    expect(screen.getByText('Bluebird Foods')).toBeTruthy();
    expect(screen.getAllByText('₹ 1,638')).toHaveLength(ORDERS.length);
    expect(screen.getAllByText(/^Today, /)).toHaveLength(ORDERS.length);
    expect(screen.getByText('Server timed out')).toBeTruthy();
  });

  it('opens the order detail from the row', async () => {
    setup();
    await render(<OrdersScreen />);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Open order for Bluebird Foods, ₹ 1,638, Queued',
      }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/order/ord_q1');
  });

  it('shows the empty state when there are no orders', async () => {
    setup({ orders: [], pendingCount: 0 });
    await render(<OrdersScreen />);

    expect(screen.getByText('No orders yet')).toBeTruthy();
  });
});

describe('Retry on a failed order', () => {
  it('retries that order by id and reports the result', async () => {
    const sync = setup();
    await render(<OrdersScreen />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Retry order for Northgate Pharmacy' }),
    );

    await waitFor(() => expect(sync.retryOrder).toHaveBeenCalledWith('ord_f1'));
    expect(await screen.findByText('1 order sent.')).toBeTruthy();
  });

  it('does not offer a retry for orders that are not failed', async () => {
    setup();
    await render(<OrdersScreen />);

    expect(screen.getAllByRole('button', { name: /Retry order for/ })).toHaveLength(1);
  });

  it('disables Retry while offline and does not send', async () => {
    const sync = setup({ online: false });
    await render(<OrdersScreen />);

    const retry = screen.getByRole('button', { name: 'Retry order for Northgate Pharmacy' });
    expect(isDisabled(retry)).toBe(true);
    await fireEvent.press(retry);
    expect(sync.retryOrder).not.toHaveBeenCalled();
    expect(screen.getByText('Go online to retry')).toBeTruthy();
  });

  it('shows a failed retry inline', async () => {
    const sync = setup();
    sync.retryOrder.mockRejectedValueOnce(new Error('Transport unavailable'));
    await render(<OrdersScreen />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Retry order for Northgate Pharmacy' }),
    );

    expect(await screen.findByText('Transport unavailable')).toBeTruthy();
  });
});

describe('Sync now', () => {
  it('flushes the queue and reports what was sent', async () => {
    const sync = setup({ pendingCount: 2 });
    await render(<OrdersScreen />);

    expect(screen.getByText('2 orders waiting to sync')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sync now' }));

    await waitFor(() => expect(sync.flushNow).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('2 orders sent.')).toBeTruthy();
  });

  it('is disabled when nothing is waiting', async () => {
    setup({ pendingCount: 0 });
    await render(<OrdersScreen />);

    expect(screen.getByText('All orders synced')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeDisabled();
  });

  it('is disabled offline, where orders wait on the device', async () => {
    const sync = setup({ online: false, pendingCount: 3 });
    await render(<OrdersScreen />);

    expect(screen.getByText(/Offline\. Orders wait on this device/)).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Sync now' });
    expect(isDisabled(button)).toBe(true);
    await fireEvent.press(button);
    expect(sync.flushNow).not.toHaveBeenCalled();
  });
});

describe('describeFlush', () => {
  it('reports failures first, because they need the user to act', async () => {
    expect(describeFlush({ submitted: 1, failed: 2, remaining: 0 })).toEqual({
      tone: 'danger',
      text: '2 orders could not be sent. Tap Retry on the order to try again.',
    });
  });

  it('reports successful sends with the right plural', async () => {
    expect(describeFlush({ submitted: 1, failed: 0, remaining: 0 }).text).toBe('1 order sent.');
    expect(describeFlush({ submitted: 3, failed: 0, remaining: 0 }).text).toBe('3 orders sent.');
  });

  it('reports waiting and nothing-to-do states', async () => {
    expect(describeFlush({ submitted: 0, failed: 0, remaining: 2 }).text).toBe(
      'Orders are waiting for their next attempt.',
    );
    expect(describeFlush({ submitted: 0, failed: 0, remaining: 0 }).text).toBe(
      'Nothing to send. Everything is synced.',
    );
  });
});

describe('date formatting for lists', () => {
  it('formats clock times in the 12-hour style of the reference', async () => {
    expect(formatClock(new Date(2026, 9, 14, 9, 5))).toBe('9:05 am');
    expect(formatClock(new Date(2026, 9, 14, 0, 30))).toBe('12:30 am');
    expect(formatClock(new Date(2026, 9, 14, 12, 0))).toBe('12:00 pm');
    expect(formatClock(new Date(2026, 9, 14, 16, 10))).toBe('4:10 pm');
  });

  it('says Today, Yesterday, or the date for older orders', async () => {
    const now = new Date(2026, 9, 14, 12, 0);
    expect(formatOrderWhen(new Date(2026, 9, 14, 9, 42).toISOString(), now)).toBe('Today, 9:42 am');
    expect(formatOrderWhen(new Date(2026, 9, 13, 16, 10).toISOString(), now)).toBe(
      'Yesterday, 4:10 pm',
    );
    expect(formatOrderWhen(new Date(2026, 9, 2, 14, 5).toISOString(), now)).toBe('2 Oct, 2:05 pm');
  });
});
