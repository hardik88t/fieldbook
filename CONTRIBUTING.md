# Contributing to Fieldbook

## Setup and checks

```bash
npm ci
npm run check          # prettier --check, expo lint, tsc --noEmit, jest
```

Run `npm run check` before you push. CI runs the same steps and also builds the web export.
Run `npm run e2e` before you change routing, the web database or the connection switch. It builds the
web export, serves it under `/fieldbook/` and drives the app in Chromium. It needs
`npx playwright install chromium` once, or `FIELDBOOK_CHROMIUM` pointing at an installed build.
Commits follow Conventional Commits (`feat(cart): ...`, `fix(sync): ...`, `test(orders): ...`).
Branch from `main`, and keep each commit small and self-contained.

Dependency versions are pinned exactly. Install Expo-related packages with `npx expo install <pkg>`
so they match SDK 57. Do not hand-edit `package.json` versions.

## Building a screen

Screens are Phase B work. Each screen lives in the file already named for it (the placeholder files
carry a `TODO(phase B…)` comment). Build it against the contract below and nothing else.

### The rule

A screen reads data and runs actions only through the hooks in `@/state`. Screens do not open the
database, do not import repositories or `SyncEngine`, and do not touch `@/data/*` or `@/sync/*`
(types from `@/domain/types` are fine).

Allowed imports for a screen:

| From              | Use for                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `@/state`         | every hook below, `EmptyCartError`, `formatINR`                                                              |
| `@/money`         | the `Paise` type and helpers (`rupeesToPaise`, `addPaise`, `parseRupeesInput`)                               |
| `@/theme`         | `colors`, `space`, `radius`, `textStyles`, `fontSize`, `fontWeight`, `TOUCH_TARGET`, `PAGE_GUTTER`           |
| `@/domain/types`  | `Product`, `Category`, `Customer`, `StopView`, `Order`, `OrderSummary`, `OrderLine`, `OrderStatus`, `Totals` |
| `@/domain/search` | `matchesQuery`, `normalizeForSearch` (for client-side filtering only)                                        |
| `@/domain/dates`  | `localDateKey`, `daysAgo`, `startOfLocalDay`                                                                 |
| `@/components`    | `BootGate` is already applied at the root. Build more components under `src/components/`                     |
| `expo-router`     | navigation: `router.push('/catalogue')`, `Link`, `useLocalSearchParams`                                      |

### Hooks (`src/state/hooks.ts`)

Every query hook returns `Query<T>`:

```ts
interface Query<T> {
  data: T | undefined; // undefined until the first load completes
  error: Error | null;
  loading: boolean; // true only until the first load completes
  refresh: () => void; // re-run the query now
}
```

Queries re-run by themselves after any write (including sync status changes), so screens rarely
need `refresh`.

| Hook                | Signature                                                                                                                                                      | Returns                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAppStatus`      | `() => { status: 'booting' \| 'ready' \| 'error'; error: string \| null; ready: boolean }`                                                                     | Boot state. Screens are only mounted after `ready` (see `BootGate`).                                                                           |
| `useConnectivity`   | `() => { online: boolean; setOnline(online: boolean): void }`                                                                                                  | The demo online switch. Going online flushes the queue.                                                                                        |
| `useActiveCustomer` | `() => { customerId: string \| null; customer: Customer \| null; loading: boolean; startVisit(customerId: string): Promise<void>; endVisit(): Promise<void> }` | The shop being visited. Persisted on the device.                                                                                               |
| `useCart`           | `() => CartView`                                                                                                                                               | See below.                                                                                                                                     |
| `useTodayStops`     | `() => Query<StopView[]>`                                                                                                                                      | Today's route in planned order.                                                                                                                |
| `useCategories`     | `() => Query<Category[]>`                                                                                                                                      | Categories in display order.                                                                                                                   |
| `useProducts`       | `(filter?: { query?: string; categoryId?: string \| null }) => Query<Product[]>`                                                                               | Products, filtered by text (case and diacritic insensitive) and category.                                                                      |
| `useOrders`         | `(options?: { limit?: number }) => Query<OrderSummary[]>`                                                                                                      | Orders, newest first.                                                                                                                          |
| `useOrder`          | `(orderId: string \| null) => Query<Order \| null>`                                                                                                            | One order with its lines.                                                                                                                      |
| `useLastOrder`      | `(customerId: string \| null) => Query<Order \| null> & { reorder(): Promise<number> }`                                                                        | The customer's most recent order from an earlier day. `reorder()` copies its lines into the cart and resolves with the number of lines copied. |
| `useSync`           | `() => { online: boolean; pendingCount: number; flushNow(): Promise<FlushReport>; retryOrder(orderId: string): Promise<FlushReport> }`                         | Queue state and sync controls. `retryOrder` is the Retry action on a failed order.                                                             |
| `useAppActions`     | `() => AppActions`                                                                                                                                             | Every write action (see below). Use for Settings, for example `resetDemoData()`.                                                               |
| `useRepositories`   | `() => Repositories \| null`                                                                                                                                   | Escape hatch for one-off reads. Prefer the hooks above.                                                                                        |

`CartView`:

```ts
interface CartView {
  customerId: string | null; // null when no visit is active
  lines: CartLineView[]; // { productId, name, pack, tone, glyph, unitPricePaise, qty, linePaise }
  totals: Totals; // { subtotalPaise, gstPaise, totalPaise }, GST 5%, all in paise
  itemCount: number; // sum of quantities, for the tab badge
  loading: boolean;
  setQty(productId: string, qty: number): Promise<void>; // 0 removes the line; 0..99
  addOne(productId: string): Promise<void>;
  clear(): Promise<void>;
  placeOrder(note: string): Promise<Order>; // throws EmptyCartError when empty
}
```

Write actions (`useAppActions()` or the hooks above) are `async`, and they reject on error. Show
the error to the user; do not swallow it.

### Examples

Route screen, start a visit and go to the catalogue:

```tsx
import { useRouter } from 'expo-router';
import { useActiveCustomer, useTodayStops, formatINR } from '@/state';

export default function RouteScreen() {
  const router = useRouter();
  const stops = useTodayStops();
  const { startVisit } = useActiveCustomer();

  if (stops.loading) return <ActivityIndicator />;
  if (stops.error) return <ErrorState error={stops.error} onRetry={stops.refresh} />;

  const next = stops.data?.find((s) => s.visitState === 'todo');
  // ...render the timeline. Show s.lastOrder with formatINR(s.lastOrder.totalPaise).
  // "Start visit":
  // await startVisit(next.customerId); router.push('/catalogue');
}
```

Catalogue screen, search with a debounce and add to cart:

```tsx
import { useCart, useCategories, useLastOrder, useActiveCustomer, useProducts } from '@/state';

const [query, setQuery] = useState('');
const [categoryId, setCategoryId] = useState<string | null>(null);
const debounced = useDebouncedValue(query, 150); // screen-level helper, not in the contract
const categories = useCategories();
const products = useProducts({ query: debounced, categoryId });
const cart = useCart();
const { customerId } = useActiveCustomer();
const lastVisit = useLastOrder(customerId);

// Reorder banner:
// const copied = await lastVisit.reorder();
// Add button and stepper:
// await cart.setQty(product.id, qtyInCart + 1);
```

Cart screen, quantity steppers and placing the order:

```tsx
import { EmptyCartError, formatINR, useCart } from '@/state';

const cart = useCart();
// Stepper: await cart.setQty(line.productId, line.qty - 1)  (0 removes the line)
// Totals:  formatINR(cart.totals.subtotalPaise), formatINR(cart.totals.gstPaise), formatINR(cart.totals.totalPaise)

async function place(note: string) {
  try {
    const order = await cart.placeOrder(note);
    // Show the inline confirmation for order.id. The cart is already cleared.
  } catch (error) {
    if (error instanceof EmptyCartError) return; // nothing to place
    throw error;
  }
}
```

Orders screen, status pills and retry:

```tsx
import { useOrders, useSync } from '@/state';

const orders = useOrders();
const sync = useSync();
// Pill for order.status: 'queued' | 'syncing' | 'synced' | 'failed'
// Retry on failed: await sync.retryOrder(order.id)
// "Sync now":      await sync.flushNow()
```

Settings screen, demo switch and reset:

```tsx
import { useAppActions, useConnectivity } from '@/state';

const { online, setOnline } = useConnectivity();
const { resetDemoData } = useAppActions();
```

### Money

- Every amount is a `Paise` (integer paise). Never use floats or rupee numbers for money.
- Display money only with `formatINR(amount)`. It returns `₹ 5,691` for whole rupees, and `₹ 1,234.50`
  when there are paise. Do not write your own formatter.
- Totals come from the hooks (`cart.totals`). Do not recompute GST in a screen.
- To turn user input into paise, use `parseRupeesInput(text)` (returns `null` when invalid).

### Visual rules

- Colours, spacing and type come from `@/theme`. Do not hard-code hex values or sizes.
- Every touchable has an `accessibilityRole` and `accessibilityLabel`, and is at least
  `TOUCH_TARGET` (44 px) in both directions.
- Lists and text must work at phone width with a 20 px gutter (`PAGE_GUTTER`) and no horizontal scroll.
- The reference for layout is `src/mocks` in the portfolio repo (`Fieldbook.tsx`, `Fieldbook.module.css`).

### Placeholders and file conventions

- Replace the body of the file that holds the `TODO(phase B…)` comment. Delete the
  `ScreenPlaceholder` import and the `TODO` comment when the screen is done.
- Keep the final file path. The routes are `src/app/(tabs)/route.tsx`, `catalogue.tsx`, `cart.tsx`,
  `orders.tsx` and `src/app/settings.tsx`.
- Order detail belongs at `src/app/order/[id].tsx` (a root stack screen, added by Phase B3). Link to it with
  `router.push(`/order/${order.id}`)`.
- Put reusable UI in `src/components/`. Put screen-only helpers next to the screen.

### Tests for a screen

- Put tests in `src/__tests__/`, named after the screen (`route.test.tsx`). Never put a test file under
  `src/app/`: every file there becomes a route.
- Jest picks up `src/**/*.test.ts(x)`. Run them with `npm test`.
- For hooks, render inside `AppProvider` with `renderHook` from `@testing-library/react-native` (it is
  async in v14, so `await` it). See `src/state/AppContext.test.tsx` for the pattern. Pass
  `openDatabase={() => openTestDatabase().then((t) => t.db)}` from `@/testing/helpers`, a `FakeTransport`
  with `latencyMs: 0` and `sleep: async () => undefined`, and `now={() => NOW}`.
- Await the flush inside `act` when a test depends on sync: `await act(async () => { await sync.flushNow(); })`.
- Find orders by id, not by list position. The seeded orders also appear in the lists.
- Use `NOW` and the seeded ids from `@/testing/helpers`.

## Data layer and sync (for maintainers, not screen builders)

- **Schema changes** go in a new migration in `src/data/migrations.ts`. Migrations are append-only. Never edit a shipped one.
- **Repositories** live in `src/data/repositories/`. Each one takes a `SqlDb`. Writes that touch several
  tables run inside `db.transaction`. Transactions do not nest.
- **Seed data** is deterministic (`buildSeedData(now)` in `src/data/seed.ts`). Tests assert exact values against it.
- **Sync transport** is the `SyncTransport` interface in `src/sync/types.ts`. A real server must treat repeated
  `idempotencyKey` values as one order and return the original result.
- **Backoff:** 2 s, 4 s, 8 s, 16 s and so on, capped at 5 minutes. After 8 transient failures, or on a
  rejection, an order is parked until the user retries it.
