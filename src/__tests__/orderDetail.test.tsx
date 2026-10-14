import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import OrderDetailScreen from '@/app/order/[id]';
import type { Order, OrderStatus } from '@/domain/types';
import { asPaise } from '@/money';
import { useOrder, useSync } from '@/state';
import { buildTimeline } from '@/components/orders/OrderTimeline';
import { shortReference } from '@/components/cart/OrderConfirmation';

function isDisabled(element: { props: { accessibilityState?: { disabled?: boolean } } }): boolean {
  return element.props.accessibilityState?.disabled === true;
}

const mockRouter = { navigate: jest.fn(), push: jest.fn(), back: jest.fn() };
const mockParams = { current: { id: 'ord_f1' } as { id: string | string[] } };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams.current,
  Stack: { Screen: () => null },
}));

jest.mock('@/state', () => {
  const actual = jest.requireActual('@/money');
  return {
    formatINR: actual.formatINR,
    useOrder: jest.fn(),
    useSync: jest.fn(),
  };
});

const CREATED = new Date(2026, 9, 14, 9, 42).toISOString();

function order(status: OrderStatus, overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord_f1_abc123',
    customerId: 'cust-northgate',
    customerName: 'Northgate Pharmacy',
    createdAt: CREATED,
    status,
    subtotalPaise: asPaise(156000),
    gstPaise: asPaise(7800),
    totalPaise: asPaise(163800),
    lastError: status === 'failed' ? 'Server timed out' : null,
    note: 'Leave with the guard',
    lines: [
      {
        productId: 'rice',
        productName: 'Basmati Rice Gold',
        pack: '5 kg bag',
        unitPricePaise: asPaise(57000),
        qty: 2,
        linePaise: asPaise(114000),
      },
      {
        productId: 'oil',
        productName: 'Sunflower Oil',
        pack: '1 L bottle',
        unitPricePaise: asPaise(42000),
        qty: 1,
        linePaise: asPaise(42000),
      },
    ],
    ...overrides,
  };
}

function setup(data: Order | null | undefined, { online = true } = {}) {
  const retryOrder = jest
    .fn()
    .mockResolvedValue({ submitted: 1, failed: 0, parked: 0, remaining: 0, blockedUntil: null });
  (useOrder as jest.Mock).mockReturnValue({
    data,
    error: null,
    loading: data === undefined,
    refresh: jest.fn(),
  });
  (useSync as jest.Mock).mockReturnValue({
    online,
    pendingCount: 1,
    flushNow: jest.fn(),
    retryOrder,
  });
  return { retryOrder };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { id: 'ord_f1' };
});

describe('Order detail', () => {
  it('shows the header, status, lines, totals and delivery note', async () => {
    setup(order('synced'));
    await render(<OrderDetailScreen />);

    expect(screen.getAllByText('₹ 1,638').length).toBeGreaterThan(0);
    expect(screen.getByText(`Ref ${shortReference('ord_f1_abc123')}`)).toBeTruthy();
    expect(screen.getByText('Basmati Rice Gold')).toBeTruthy();
    expect(screen.getByText('5 kg bag · 2 × ₹ 570')).toBeTruthy();
    expect(screen.getByText('₹ 1,140')).toBeTruthy();
    expect(screen.getByText('2 items')).toBeTruthy();
    expect(screen.getByText('Subtotal')).toBeTruthy();
    expect(screen.getByText('GST 5%')).toBeTruthy();
    expect(screen.getByText('Leave with the guard')).toBeTruthy();
    expect(screen.getByLabelText('Status: Synced')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry sending this order' })).toBeNull();
  });

  it('shows the full timestamp', async () => {
    setup(order('queued'));
    await render(<OrderDetailScreen />);

    expect(screen.getAllByText('14 Oct 2026, 9:42 am').length).toBeGreaterThan(0);
  });

  it('shows a failed order with its reason and a retry action', async () => {
    const { retryOrder } = setup(order('failed'));
    await render(<OrderDetailScreen />);

    const timeline = screen.getByLabelText('Order status timeline');
    expect(within(timeline).getByText('Could not send')).toBeTruthy();
    expect(within(timeline).getByText('Server timed out')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Retry sending this order' }));
    await waitFor(() => expect(retryOrder).toHaveBeenCalledWith('ord_f1_abc123'));
    expect(await screen.findByText('1 order sent.')).toBeTruthy();
  });

  it('disables the retry action offline', async () => {
    const { retryOrder } = setup(order('failed'), { online: false });
    await render(<OrderDetailScreen />);

    const retry = screen.getByRole('button', { name: 'Retry sending this order' });
    expect(isDisabled(retry)).toBe(true);
    await fireEvent.press(retry);
    expect(retryOrder).not.toHaveBeenCalled();
    expect(screen.getByText('You are offline. Go online to retry.')).toBeTruthy();
  });

  it('says so when the order is not on this device', async () => {
    setup(null);
    await render(<OrderDetailScreen />);

    expect(screen.getByText('Order not found')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back to orders' }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/orders');
  });

  it('reads the id from the route, including the array form', async () => {
    mockParams.current = { id: ['ord_f1'] };
    setup(order('queued'));
    await render(<OrderDetailScreen />);

    expect(useOrder).toHaveBeenCalledWith('ord_f1');
  });
});

describe('buildTimeline', () => {
  const base = { createdAt: CREATED, lastError: null, online: true };

  it('marks a queued order as waiting to send', async () => {
    const steps = buildTimeline({ ...base, status: 'queued' });
    expect(steps.map((step) => [step.id, step.state])).toEqual([
      ['placed', 'done'],
      ['saved', 'done'],
      ['sent', 'todo'],
      ['confirmed', 'todo'],
    ]);
    expect(steps[2]?.detail).toBe('Next in line');
  });

  it('explains a queued order while offline', async () => {
    const steps = buildTimeline({ ...base, status: 'queued', online: false });
    expect(steps[2]?.detail).toBe('Waiting for a connection');
  });

  it('marks a syncing order as in progress', async () => {
    const steps = buildTimeline({ ...base, status: 'syncing' });
    expect(steps[2]).toMatchObject({ state: 'current', title: 'Sending to server' });
  });

  it('marks a synced order as sent and confirmed', async () => {
    const steps = buildTimeline({ ...base, status: 'synced' });
    expect(steps[2]?.state).toBe('done');
    expect(steps[3]).toMatchObject({ state: 'done', title: 'Confirmed by server' });
  });

  it('puts the failure on the step where sending stopped', async () => {
    const steps = buildTimeline({ ...base, status: 'failed', lastError: 'Rejected: invalid shop' });
    expect(steps[2]).toMatchObject({ state: 'failed', detail: 'Rejected: invalid shop' });
    expect(steps[3]?.state).toBe('todo');
  });

  it('falls back to a retry hint when a failure has no message', async () => {
    const steps = buildTimeline({ ...base, status: 'failed', lastError: null });
    expect(steps[2]?.detail).toBe('Tap Retry to send it again');
  });
});

describe('shortReference', () => {
  it('takes the last six letters or digits, upper-cased', async () => {
    expect(shortReference('ord_m1x2y3_xyz789')).toBe('XYZ789');
    expect(shortReference('ab')).toBe('AB');
  });
});
