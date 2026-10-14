import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CartScreen from '@/app/(tabs)/cart';
import { computeTotals } from '@/domain/cart';
import type { Order, StopView } from '@/domain/types';
import { asPaise } from '@/money';
import {
  EmptyCartError,
  useActiveCustomer,
  useCart,
  useConnectivity,
  useTodayStops,
  type CartLineView,
} from '@/state';

const mockRouter = { navigate: jest.fn(), push: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  Stack: { Screen: () => null },
}));

jest.mock('@/state', () => {
  const actual = jest.requireActual('@/money');
  class MockEmptyCartError extends Error {
    constructor() {
      super('Cannot place an order: the cart is empty');
      this.name = 'EmptyCartError';
    }
  }
  return {
    EmptyCartError: MockEmptyCartError,
    formatINR: actual.formatINR,
    useCart: jest.fn(),
    useActiveCustomer: jest.fn(),
    useTodayStops: jest.fn(),
    useConnectivity: jest.fn(),
  };
});

const LINES: CartLineView[] = [
  {
    productId: 'rice',
    name: 'Basmati Rice Gold',
    pack: '5 kg bag',
    tone: 'sand',
    glyph: 'bag',
    unitPricePaise: asPaise(57000),
    qty: 2,
    linePaise: asPaise(114000),
  },
  {
    productId: 'oil',
    name: 'Sunflower Oil',
    pack: '1 L bottle',
    tone: 'sand',
    glyph: 'bottle',
    unitPricePaise: asPaise(42000),
    qty: 1,
    linePaise: asPaise(42000),
  },
];

function placedOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord_m1x2y3_xyz789',
    customerId: 'cust-sunrise',
    customerName: 'Sunrise Pharmacy',
    createdAt: new Date().toISOString(),
    status: 'queued',
    subtotalPaise: asPaise(156000),
    gstPaise: asPaise(7800),
    totalPaise: asPaise(163800),
    lastError: null,
    note: '',
    lines: [],
    ...overrides,
  };
}

interface CartMocks {
  setQty: jest.Mock;
  clear: jest.Mock;
  placeOrder: jest.Mock;
}

/** Wires the hooks for a cart with the given lines. Defaults: Sunrise Pharmacy, stop 2, Paldi. */
function setup({
  lines = LINES,
  customerId = 'cust-sunrise' as string | null,
  online = true,
}: { lines?: CartLineView[]; customerId?: string | null; online?: boolean } = {}): CartMocks {
  const mocks: CartMocks = {
    setQty: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    placeOrder: jest.fn().mockResolvedValue(placedOrder()),
  };
  const totals = computeTotals(
    lines.map((line) => ({ unitPricePaise: line.unitPricePaise, qty: line.qty })),
  );
  (useCart as jest.Mock).mockReturnValue({
    customerId,
    lines,
    totals,
    itemCount: lines.reduce((sum, line) => sum + line.qty, 0),
    loading: false,
    setQty: mocks.setQty,
    addOne: jest.fn(),
    clear: mocks.clear,
    placeOrder: mocks.placeOrder,
  });
  (useActiveCustomer as jest.Mock).mockReturnValue({
    customerId,
    customer:
      customerId === null ? null : { id: customerId, name: 'Sunrise Pharmacy', area: 'Paldi' },
    loading: false,
    startVisit: jest.fn(),
    endVisit: jest.fn(),
  });
  (useTodayStops as jest.Mock).mockReturnValue({
    data: [{ customerId: 'cust-sunrise', position: 2 }] as unknown as StopView[],
    loading: false,
    error: null,
    refresh: jest.fn(),
  });
  (useConnectivity as jest.Mock).mockReturnValue({ online, setOnline: jest.fn() });
  return mocks;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Cart screen: contents', () => {
  it('shows the shop, its stop, the lines, the totals and the place order button', async () => {
    setup();
    await render(<CartScreen />);

    expect(screen.getByText('Sunrise Pharmacy')).toBeTruthy();
    expect(screen.getByText('Stop 2 · Paldi')).toBeTruthy();
    expect(screen.getByText('Saved on this device')).toBeTruthy();
    expect(screen.getByText('Basmati Rice Gold')).toBeTruthy();
    expect(screen.getByText('5 kg bag · ₹ 570 each')).toBeTruthy();
    expect(screen.getByText('₹ 1,140')).toBeTruthy();
    expect(screen.getByText('Subtotal')).toBeTruthy();
    expect(screen.getByText('GST 5%')).toBeTruthy();
    expect(screen.getByText('₹ 78')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Place order · ₹ 1,638' })).toBeTruthy();
    expect(screen.getByText('Sends automatically when you are back online.')).toBeTruthy();
  });

  it('shows the empty state linking to the catalogue when the cart has no lines', async () => {
    setup({ lines: [] });
    await render(<CartScreen />);

    expect(screen.getByText('Your cart is empty')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Place order/ })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Browse catalogue' }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/catalogue');
  });

  it('asks for a visit first when no shop is active', async () => {
    setup({ lines: [], customerId: null });
    await render(<CartScreen />);

    expect(screen.getByText('No shop selected')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: "Open today's route" }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/route');
  });
});

describe('Cart screen: quantities', () => {
  it('increases a line by one through setQty', async () => {
    const mocks = setup();
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Increase Sunflower Oil' }));
    await waitFor(() => expect(mocks.setQty).toHaveBeenCalledWith('oil', 2));
  });

  it('removes a line when its last unit is taken away', async () => {
    const mocks = setup();
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Remove Sunflower Oil' }));
    await waitFor(() => expect(mocks.setQty).toHaveBeenCalledWith('oil', 0));
  });

  it('shows a failed quantity change inline instead of swallowing it', async () => {
    const mocks = setup();
    mocks.setQty.mockRejectedValueOnce(new Error('Quantity is too large'));
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Decrease Basmati Rice Gold' }));
    expect(await screen.findByText('Quantity is too large')).toBeTruthy();
  });
});

describe('Cart screen: place order', () => {
  it('places the order with the delivery note, clears the note and shows the inline confirmation', async () => {
    const mocks = setup();
    await render(<CartScreen />);

    const note = screen.getByLabelText('Delivery note');
    await fireEvent.changeText(note, 'Leave with the guard');
    await fireEvent.press(screen.getByRole('button', { name: 'Place order · ₹ 1,638' }));

    await waitFor(() => expect(mocks.placeOrder).toHaveBeenCalledWith('Leave with the guard'));
    expect(await screen.findByText('Order placed')).toBeTruthy();
    expect(screen.getByText(/Sunrise Pharmacy · ₹ 1,638 · Ref XYZ789/)).toBeTruthy();
    expect(screen.getByText('Saved on this device and sending now.')).toBeTruthy();
    expect(screen.getByLabelText('Delivery note').props.value).toBe('');
  });

  it('links from the confirmation to the Orders tab', async () => {
    setup();
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Place order · ₹ 1,638' }));
    await fireEvent.press(await screen.findByRole('link', { name: 'View in Orders' }));

    expect(mockRouter.navigate).toHaveBeenCalledWith('/orders');
  });

  it('says it will send later when the connection is off', async () => {
    setup({ online: false });
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Place order · ₹ 1,638' }));
    expect(
      await screen.findByText('Saved on this device. It sends when you are back online.'),
    ).toBeTruthy();
  });

  it('turns an EmptyCartError into a plain notice, not a confirmation', async () => {
    const mocks = setup();
    mocks.placeOrder.mockRejectedValueOnce(new EmptyCartError('cust-sunrise'));
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Place order · ₹ 1,638' }));

    expect(await screen.findByText('Nothing to place. Your cart is empty.')).toBeTruthy();
    expect(screen.queryByText('Order placed')).toBeNull();
  });

  it('shows any other placement error inline', async () => {
    const mocks = setup();
    mocks.placeOrder.mockRejectedValueOnce(new Error('Database is locked'));
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Place order · ₹ 1,638' }));

    expect(await screen.findByText('Database is locked')).toBeTruthy();
    expect(screen.queryByText('Order placed')).toBeNull();
  });

  it('ignores a second press while the first order is still being placed', async () => {
    const mocks = setup();
    let finish: (order: Order) => void = () => undefined;
    mocks.placeOrder.mockReturnValue(
      new Promise<Order>((resolve) => {
        finish = resolve;
      }),
    );
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Place order · ₹ 1,638' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Place order · ₹ 1,638' }));
    expect(mocks.placeOrder).toHaveBeenCalledTimes(1);

    finish(placedOrder());
    expect(await screen.findByText('Order placed')).toBeTruthy();
  });
});

describe('Cart screen: clear', () => {
  it('asks inline before clearing and only clears when confirmed', async () => {
    const mocks = setup();
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Clear all items from cart' }));
    expect(screen.getByText(/Remove every item from this cart/)).toBeTruthy();
    expect(mocks.clear).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Clear cart' }));
    await waitFor(() => expect(mocks.clear).toHaveBeenCalledTimes(1));
  });

  it('keeps the cart when the clear is cancelled', async () => {
    const mocks = setup();
    await render(<CartScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Clear all items from cart' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mocks.clear).not.toHaveBeenCalled();
    expect(screen.queryByText(/Remove every item from this cart/)).toBeNull();
  });
});
