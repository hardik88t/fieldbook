/**
 * Deterministic demo data: 8 grocery/FMCG categories, 64 products, 7 Ahmedabad-area shops and
 * a route for "today". Built from a clock value so tests can assert exact results.
 */
import { computeTotals } from '@/domain/cart';
import { localDateKey } from '@/domain/dates';
import type {
  Category,
  Customer,
  Product,
  ProductGlyph,
  ProductTone,
  VisitState,
} from '@/domain/types';
import { asPaise, rupeesToPaise, type Paise } from '@/money';

import type { SqlDb } from './sql';
import { TABLES } from './schema';

export interface SeedOrderLine {
  productId: string;
  qty: number;
  unitPricePaise: Paise;
}

export interface SeedOrder {
  id: string;
  customerId: string;
  createdAt: string;
  note: string;
  lines: SeedOrderLine[];
  subtotalPaise: Paise;
  gstPaise: Paise;
  totalPaise: Paise;
}

export interface SeedStop {
  id: string;
  customerId: string;
  visitDate: string;
  plannedTime: string;
  position: number;
  visitState: VisitState;
}

export interface SeedData {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  stops: SeedStop[];
  orders: SeedOrder[];
}

type CategorySeed = { id: string; name: string; tone: ProductTone; glyph: ProductGlyph };

const CATEGORIES: CategorySeed[] = [
  { id: 'rice', name: 'Rice', tone: 'sand', glyph: 'bag' },
  { id: 'oil-ghee', name: 'Oil & Ghee', tone: 'sand', glyph: 'bottle' },
  { id: 'spices', name: 'Spices', tone: 'peach', glyph: 'tin' },
  { id: 'snacks', name: 'Snacks', tone: 'peach', glyph: 'bag' },
  { id: 'pulses', name: 'Pulses', tone: 'mint', glyph: 'bag' },
  { id: 'tea-coffee', name: 'Tea & Coffee', tone: 'violet', glyph: 'tin' },
  { id: 'biscuits', name: 'Biscuits', tone: 'sand', glyph: 'tin' },
  { id: 'personal-care', name: 'Personal Care', tone: 'violet', glyph: 'tub' },
];

/** [name, pack, price in rupees] per category, in CATEGORIES order. */
const PRODUCT_TABLE: [string, string, number][][] = [
  [
    ['Basmati Rice Gold', '5 kg bag', 570],
    ['Sona Masoori Rice', '5 kg bag', 365],
    ['Kolam Rice', '10 kg bag', 720],
    ['Idli Rice', '1 kg pack', 68],
    ['Brown Rice Organic', '1 kg pack', 118],
    ['Poha Thick', '500 g pack', 46],
    ['Sabudana', '500 g pack', 58],
    ['Jeera Rice Mix', '250 g pack', 92],
  ],
  [
    ['Sunflower Oil', '1 L bottle', 420],
    ['Groundnut Oil', '1 L bottle', 268],
    ['Mustard Oil', '1 L bottle', 215],
    ['Refined Palm Oil', '1 L pouch', 139],
    ['Desi Ghee', '500 ml jar', 880],
    ['Ghee Pouch', '1 L pouch', 1520],
    ['Coconut Oil', '500 ml bottle', 195],
    ['Olive Oil Light', '500 ml bottle', 540],
  ],
  [
    ['Garam Masala', '100 g pack', 479],
    ['Turmeric Powder', '200 g pack', 62],
    ['Red Chilli Powder', '200 g pack', 98],
    ['Coriander Powder', '200 g pack', 74],
    ['Cumin Seeds', '100 g pack', 88],
    ['Black Pepper Whole', '100 g pack', 144],
    ['Mustard Seeds', '100 g pack', 36],
    ['Chaat Masala', '100 g pack', 66],
  ],
  [
    ['Masala Peanuts', '200 g pack', 52],
    ['Bhujia Sev', '400 g pack', 128],
    ['Khakhra Methi', '200 g pack', 85],
    ['Namkeen Mix', '500 g pack', 140],
    ['Potato Chips Classic', '90 g pack', 20],
    ['Roasted Chana', '250 g pack', 60],
    ['Salted Popcorn', '100 g pack', 30],
    ['Mathri', '300 g pack', 110],
  ],
  [
    ['Toor Dal', '1 kg pack', 168],
    ['Moong Dal Yellow', '1 kg pack', 142],
    ['Chana Dal', '1 kg pack', 96],
    ['Masoor Dal', '1 kg pack', 118],
    ['Urad Dal Split', '1 kg pack', 158],
    ['Rajma Chitra', '1 kg pack', 152],
    ['Kabuli Chana', '1 kg pack', 128],
    ['Besan', '1 kg pack', 104],
  ],
  [
    ['CTC Tea Premium', '500 g pack', 285],
    ['Masala Chai Blend', '250 g pack', 168],
    ['Green Tea', '100 g pack', 210],
    ['Instant Coffee', '100 g jar', 265],
    ['Filter Coffee Powder', '250 g pack', 240],
    ['Tea Dust', '1 kg pack', 390],
    ['Ginger Tea Mix', '200 g pack', 120],
    ['Elaichi Tea', '250 g pack', 198],
  ],
  [
    ['Glucose Biscuits', '800 g pack', 92],
    ['Vanilla Cream Biscuits', '300 g pack', 40],
    ['Marie Biscuits', '250 g pack', 30],
    ['Digestive Biscuits', '400 g pack', 120],
    ['Elaichi Rusk', '300 g pack', 58],
    ['Butter Cookies', '150 g pack', 75],
    ['Coconut Cookies', '200 g pack', 65],
    ['Salted Crackers', '250 g pack', 55],
  ],
  [
    ['Sandal Bath Soap', '4 x 100 g', 168],
    ['Herbal Toothpaste', '200 g tube', 110],
    ['Shampoo Sachets', '12 pc pack', 48],
    ['Hand Wash Refill', '1 L pouch', 225],
    ['Detergent Powder', '1 kg pack', 135],
    ['Dishwash Bar', '3 x 150 g', 65],
    ['Almond Face Cream', '50 g jar', 95],
    ['Floor Cleaner', '1 L bottle', 150],
  ],
];

const CUSTOMERS: Customer[] = [
  { id: 'cust-bluebird', name: 'Bluebird Foods', area: 'Navrangpura' },
  { id: 'cust-sunrise', name: 'Sunrise Pharmacy', area: 'Paldi' },
  { id: 'cust-northgate', name: 'Northgate Pharmacy', area: 'Ring Road' },
  { id: 'cust-riverside', name: 'Riverside Mart', area: 'Old City Road' },
  { id: 'cust-maple', name: 'Maple Cafe Supplies', area: 'Ellis Bridge' },
  { id: 'cust-lotus', name: 'Lotus Kirana', area: 'Maninagar' },
  { id: 'cust-ambica', name: 'Ambica Provision Store', area: 'Lal Darwaja' },
];

const ROUTE_TIMES = ['09:10', '09:55', '10:40', '11:30', '12:15', '13:00', '13:45'];
/** Stops before this index are already visited today, as in the reference design. */
const VISITED_STOPS = 2;

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildProducts(): Product[] {
  const products: Product[] = [];
  CATEGORIES.forEach((category, categoryIndex) => {
    for (const [name, pack, rupees] of PRODUCT_TABLE[categoryIndex] ?? []) {
      products.push({
        id: `${category.id}-${slug(name)}`,
        categoryId: category.id,
        name,
        pack,
        pricePaise: rupeesToPaise(rupees),
        tone: category.tone,
        glyph: category.glyph,
      });
    }
  });
  return products;
}

/** Local time today at HH:MM, as an ISO UTC string. */
function localTodayAt(now: Date, hhmm: string, dayOffset = 0): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset, h, m);
  return date.toISOString();
}

function buildOrders(now: Date, products: Product[]): SeedOrder[] {
  const orders: SeedOrder[] = [];
  const productCount = products.length;

  CUSTOMERS.forEach((customer, customerIndex) => {
    // Each customer has two past orders. Sunrise's last order has 9 lines, for "Reorder last visit".
    const past = [
      { days: 9 + customerIndex, time: '10:12' },
      { days: 24 + customerIndex, time: '11:04' },
    ];
    past.forEach((visit, orderIndex) => {
      const lineCount =
        customerIndex === 1 && orderIndex === 0 ? 9 : 4 + ((customerIndex + orderIndex) % 3);
      const start = (customerIndex * 11 + orderIndex * 7) % productCount;
      const lines: SeedOrderLine[] = [];
      for (let j = 0; j < lineCount; j += 1) {
        const product = products[(start + j * 5) % productCount];
        if (!product) continue;
        lines.push({
          productId: product.id,
          qty: 1 + ((customerIndex + j + orderIndex) % 4),
          unitPricePaise: product.pricePaise,
        });
      }
      orders.push(
        buildOrder(
          `seed-${customer.id}-${orderIndex}`,
          customer.id,
          localTodayAt(now, visit.time, visit.days),
          orderIndex === 0 ? 'Deliver before noon' : '',
          lines,
        ),
      );
    });
  });

  // Today's visits that are already done: one order each for the first VISITED_STOPS shops.
  CUSTOMERS.slice(0, VISITED_STOPS).forEach((customer, index) => {
    const product = products[(index * 13 + 3) % productCount];
    const second = products[(index * 13 + 9) % productCount];
    if (!product || !second) return;
    orders.push(
      buildOrder(
        `seed-today-${customer.id}`,
        customer.id,
        localTodayAt(now, ROUTE_TIMES[index] ?? '09:00'),
        '',
        [
          { productId: product.id, qty: 2, unitPricePaise: product.pricePaise },
          { productId: second.id, qty: 1, unitPricePaise: second.pricePaise },
        ],
      ),
    );
  });

  return orders;
}

function buildOrder(
  id: string,
  customerId: string,
  createdAt: string,
  note: string,
  lines: SeedOrderLine[],
): SeedOrder {
  const totals = computeTotals(lines);
  return { id, customerId, createdAt, note, lines, ...totals };
}

/** Pure: the full demo dataset for the day `now` falls on. */
export function buildSeedData(now: Date): SeedData {
  const products = buildProducts();
  const visitDate = localDateKey(now);
  const stops: SeedStop[] = CUSTOMERS.slice(0, ROUTE_TIMES.length).map((customer, index) => ({
    id: `stop-${visitDate}-${index + 1}`,
    customerId: customer.id,
    visitDate,
    plannedTime: ROUTE_TIMES[index] ?? '09:00',
    position: index + 1,
    visitState: index < VISITED_STOPS ? 'done' : 'todo',
  }));

  return {
    categories: CATEGORIES.map((category, index) => ({
      id: category.id,
      name: category.name,
      sortOrder: index,
    })),
    products,
    customers: CUSTOMERS,
    stops,
    orders: buildOrders(now, products),
  };
}

/** Clears every data table (not migrations) and inserts the seed data in one transaction. */
export async function resetToSeed(db: SqlDb, now: Date): Promise<void> {
  const data = buildSeedData(now);
  await db.transaction(async () => {
    for (const table of [
      TABLES.syncQueue,
      TABLES.orderItems,
      TABLES.orders,
      TABLES.cartLines,
      TABLES.stops,
      TABLES.customers,
      TABLES.products,
      TABLES.categories,
      TABLES.appSettings,
    ]) {
      await db.run(`DELETE FROM ${table}`);
    }

    for (const category of data.categories) {
      await db.run('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)', [
        category.id,
        category.name,
        category.sortOrder,
      ]);
    }
    for (const product of data.products) {
      await db.run(
        'INSERT INTO products (id, category_id, name, pack, price_paise, tone, glyph) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          product.id,
          product.categoryId,
          product.name,
          product.pack,
          product.pricePaise,
          product.tone,
          product.glyph,
        ],
      );
    }
    for (const customer of data.customers) {
      await db.run('INSERT INTO customers (id, name, area) VALUES (?, ?, ?)', [
        customer.id,
        customer.name,
        customer.area,
      ]);
    }
    for (const stop of data.stops) {
      await db.run(
        'INSERT INTO stops (id, customer_id, visit_date, planned_time, position, visit_state) VALUES (?, ?, ?, ?, ?, ?)',
        [
          stop.id,
          stop.customerId,
          stop.visitDate,
          stop.plannedTime,
          stop.position,
          stop.visitState,
        ],
      );
    }
    for (const order of data.orders) {
      await db.run(
        `INSERT INTO orders (id, customer_id, status, note, subtotal_paise, gst_paise, total_paise, created_at, last_error)
         VALUES (?, ?, 'synced', ?, ?, ?, ?, ?, NULL)`,
        [
          order.id,
          order.customerId,
          order.note,
          order.subtotalPaise,
          order.gstPaise,
          order.totalPaise,
          order.createdAt,
        ],
      );
      let lineNo = 0;
      for (const line of order.lines) {
        lineNo += 1;
        const product = data.products.find((p) => p.id === line.productId);
        await db.run(
          `INSERT INTO order_items (order_id, line_no, product_id, product_name, pack, unit_price_paise, qty, line_paise)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.id,
            lineNo,
            line.productId,
            product?.name ?? line.productId,
            product?.pack ?? '',
            line.unitPricePaise,
            line.qty,
            asPaise(line.unitPricePaise * line.qty),
          ],
        );
      }
    }
  });
}
