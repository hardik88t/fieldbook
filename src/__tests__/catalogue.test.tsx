import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CatalogueScreen from '@/app/(tabs)/catalogue';
import type { CartLineView } from '@/data/repositories';
import type { Category, Customer, Order, OrderSummary, Product } from '@/domain/types';
import { asPaise } from '@/money';
import { useActiveCustomer, useCart, useCategories, useLastOrder, useProducts } from '@/state';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/state', () => {
  const { formatINR } = jest.requireActual('@/money');
  return {
    formatINR,
    useActiveCustomer: jest.fn(),
    useCart: jest.fn(),
    useCategories: jest.fn(),
    useLastOrder: jest.fn(),
    useProducts: jest.fn(),
  };
});

const CATEGORIES: Category[] = [
  { id: 'rice', name: 'Rice', sortOrder: 1 },
  { id: 'spices', name: 'Spices', sortOrder: 2 },
];

const PRODUCTS: Product[] = [
  {
    id: 'rice-basmati',
    categoryId: 'rice',
    name: 'Basmati Rice Gold',
    pack: '5 kg bag',
    pricePaise: asPaise(57000),
    tone: 'sand',
    glyph: 'bag',
  },
  {
    id: 'spice-garam',
    categoryId: 'spices',
    name: 'Garam Masala',
    pack: '100 g pack',
    pricePaise: asPaise(47900),
    tone: 'peach',
    glyph: 'tin',
  },
];

const SUNRISE: Customer = { id: 'cust-sunrise', name: 'Sunrise Pharmacy', area: 'Paldi' };

const LAST_ORDER = {
  id: 'order-last',
  customerId: SUNRISE.id,
  customerName: SUNRISE.name,
  createdAt: '2026-10-05T09:00:00.000Z',
  status: 'synced',
  subtotalPaise: asPaise(0),
  gstPaise: asPaise(0),
  totalPaise: asPaise(0),
  lastError: null,
  note: '',
  lines: [
    {
      productId: 'rice-basmati',
      productName: 'Basmati Rice Gold',
      pack: '5 kg bag',
      unitPricePaise: asPaise(57000),
      qty: 2,
      linePaise: asPaise(114000),
    },
    {
      productId: 'spice-garam',
      productName: 'Garam Masala',
      pack: '100 g pack',
      unitPricePaise: asPaise(47900),
      qty: 1,
      linePaise: asPaise(47900),
    },
  ],
} as Order & OrderSummary;

function line(product: Product, qty: number): CartLineView {
  return {
    productId: product.id,
    name: product.name,
    pack: product.pack,
    tone: product.tone,
    glyph: product.glyph,
    unitPricePaise: product.pricePaise,
    qty,
    linePaise: asPaise(product.pricePaise * qty),
  };
}

interface Setup {
  customer?: Customer | null;
  visitLoading?: boolean;
  lines?: CartLineView[];
  products?: Product[];
  productsError?: Error | null;
  lastOrder?: Order | null;
  reorder?: jest.Mock;
  categoriesError?: Error | null;
}

/** Wires every hook the screen reads. Returns the mocks the tests assert on. */
function setup(options: Setup = {}) {
  const customer = options.customer === undefined ? null : options.customer;
  const products = options.products ?? PRODUCTS;
  const refreshProducts = jest.fn();
  const cart = {
    customerId: customer ? customer.id : null,
    lines: options.lines ?? [],
    totals: { subtotalPaise: asPaise(0), gstPaise: asPaise(0), totalPaise: asPaise(0) },
    itemCount: 0,
    loading: false,
    setQty: jest.fn().mockResolvedValue(undefined),
    addOne: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
    placeOrder: jest.fn(),
  };
  const reorder = options.reorder ?? jest.fn().mockResolvedValue(2);
  const refreshCategories = jest.fn();

  (useActiveCustomer as jest.Mock).mockReturnValue({
    customerId: customer ? customer.id : null,
    customer,
    loading: options.visitLoading ?? false,
    startVisit: jest.fn(),
    endVisit: jest.fn(),
  });
  (useCart as jest.Mock).mockReturnValue(cart);
  (useCategories as jest.Mock).mockReturnValue({
    data: CATEGORIES,
    error: options.categoriesError ?? null,
    loading: false,
    refresh: refreshCategories,
  });
  (useLastOrder as jest.Mock).mockReturnValue({
    data: options.lastOrder === undefined ? null : options.lastOrder,
    error: null,
    loading: false,
    refresh: jest.fn(),
    reorder,
  });
  (useProducts as jest.Mock).mockImplementation(
    (filter: { query: string; categoryId: string | null }) => {
      const matching = products.filter(
        (p) =>
          (!filter.categoryId || p.categoryId === filter.categoryId) &&
          (!filter.query || p.name.toLowerCase().includes(filter.query.toLowerCase())),
      );
      return {
        // A failed first load has no data, as the real hook reports it.
        data: options.productsError ? undefined : matching,
        error: options.productsError ?? null,
        loading: false,
        refresh: refreshProducts,
      };
    },
  );

  return { cart, reorder, refreshProducts, refreshCategories };
}

/** Looks up the host element behind a button so the test can read its disabled state. */
function isDisabled(element: { props: { accessibilityState?: { disabled?: boolean } } }) {
  return element.props.accessibilityState?.disabled === true;
}

/** Renders the screen and lets the list finish its first scheduled layout pass inside act. */
async function renderScreen() {
  await render(<CatalogueScreen />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Catalogue screen', () => {
  it('asks for a visit from Route when no shop is active, and disables adding', async () => {
    setup({ customer: null });
    await renderScreen();

    expect(screen.getByText('No visit in progress')).toBeTruthy();
    const add = screen.getByRole('button', { name: 'Add Basmati Rice Gold to cart' });
    expect(isDisabled(add)).toBe(true);
    expect(add.props.accessibilityHint).toMatch(/Start a visit from Route/);

    await fireEvent.press(screen.getByRole('button', { name: 'Go to Route to start a visit' }));
    expect(mockPush).toHaveBeenCalledWith('/route');
  });

  it('shows the active shop and offers the reorder banner with the last order size', async () => {
    setup({ customer: SUNRISE, lastOrder: LAST_ORDER });
    await renderScreen();

    expect(screen.getByText('Sunrise Pharmacy')).toBeTruthy();
    expect(screen.getByText('Paldi')).toBeTruthy();
    expect(screen.getByText('Reorder last visit')).toBeTruthy();
    expect(screen.getByText('Sunrise Pharmacy · 2 items')).toBeTruthy();
  });

  it('reorders the last visit and reports the lines added inline', async () => {
    const { reorder } = setup({
      customer: SUNRISE,
      lastOrder: LAST_ORDER,
      reorder: jest.fn().mockResolvedValue(2),
    });
    await renderScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Reorder last visit from Sunrise Pharmacy' }),
    );

    await waitFor(() => expect(screen.getByText('2 items added')).toBeTruthy());
    expect(reorder).toHaveBeenCalledTimes(1);
  });

  it('shows a reorder error instead of hiding it', async () => {
    setup({
      customer: SUNRISE,
      lastOrder: LAST_ORDER,
      reorder: jest.fn().mockRejectedValue(new Error('Cart is locked')),
    });
    await renderScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Reorder last visit from Sunrise Pharmacy' }),
    );

    expect(await screen.findByText('Cart is locked')).toBeTruthy();
  });

  it('adds a product to the cart when Add is pressed', async () => {
    const { cart } = setup({ customer: SUNRISE });
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Add Basmati Rice Gold to cart' }));

    expect(cart.addOne).toHaveBeenCalledWith('rice-basmati');
  });

  it('shows the price in rupees and the pack size for each product', async () => {
    setup({ customer: SUNRISE });
    await renderScreen();

    expect(screen.getByText('₹ 570')).toBeTruthy();
    expect(screen.getByText('₹ 479')).toBeTruthy();
    expect(screen.getByText('5 kg bag')).toBeTruthy();
  });

  it('turns Add into a stepper once the product is in the cart and sets the new quantity', async () => {
    const basmati = PRODUCTS[0] as Product;
    const { cart } = setup({ customer: SUNRISE, lines: [line(basmati, 2)] });
    await renderScreen();

    expect(screen.getByLabelText('2 in cart')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add Basmati Rice Gold to cart' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Add one more Basmati Rice Gold' }));
    expect(cart.setQty).toHaveBeenLastCalledWith('rice-basmati', 3);

    await fireEvent.press(screen.getByRole('button', { name: 'Remove one Basmati Rice Gold' }));
    expect(cart.setQty).toHaveBeenLastCalledWith('rice-basmati', 1);
  });

  it('removes the line when the stepper goes down from one', async () => {
    const basmati = PRODUCTS[0] as Product;
    const { cart } = setup({ customer: SUNRISE, lines: [line(basmati, 1)] });
    await renderScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Remove Basmati Rice Gold from cart' }),
    );

    expect(cart.setQty).toHaveBeenLastCalledWith('rice-basmati', 0);
  });

  it('searches after a short debounce and passes the trimmed query to useProducts', async () => {
    setup({ customer: SUNRISE });
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Search products'), '  garam ');

    await waitFor(() =>
      expect(useProducts).toHaveBeenLastCalledWith({ query: 'garam', categoryId: null }),
    );
    expect(screen.getByText('Garam Masala')).toBeTruthy();
    expect(screen.queryByText('Basmati Rice Gold')).toBeNull();
  });

  it('filters by category when a chip is pressed', async () => {
    setup({ customer: SUNRISE });
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Spices' }));

    expect(useProducts).toHaveBeenLastCalledWith({ query: '', categoryId: 'spices' });
    expect(screen.getByRole('button', { name: 'Spices' }).props.accessibilityState.selected).toBe(
      true,
    );
  });

  it('shows an empty catalogue state when there are no products at all', async () => {
    setup({ customer: SUNRISE, products: [] });
    await renderScreen();

    expect(screen.getByText('No products yet')).toBeTruthy();
  });

  it('shows a no-results state with a way back to all products', async () => {
    setup({ customer: SUNRISE });
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Search products'), 'zzz');
    expect(await screen.findByText('No matches for "zzz"')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Show all products' }));

    await waitFor(() => expect(screen.getByText('Basmati Rice Gold')).toBeTruthy());
    expect(screen.getByLabelText('Search products').props.value).toBe('');
  });

  it('shows a load error with a retry action', async () => {
    const { refreshProducts } = setup({
      customer: SUNRISE,
      productsError: new Error('Database offline'),
    });
    await renderScreen();

    expect(screen.getByText('Could not load products')).toBeTruthy();
    expect(screen.getByText('Database offline')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refreshProducts).toHaveBeenCalled();
  });

  it('shows a cart error when an add is rejected', async () => {
    const { cart } = setup({ customer: SUNRISE });
    cart.addOne.mockRejectedValueOnce(new Error('Could not save the cart'));
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Add Basmati Rice Gold to cart' }));

    expect(await screen.findByText('Could not save the cart')).toBeTruthy();
  });
});
