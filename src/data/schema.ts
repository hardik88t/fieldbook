/**
 * Table definitions for schema version 1. Add new tables or columns with a new migration in
 * migrations.ts; never edit a migration that has shipped.
 *
 * Money columns are INTEGER paise. Timestamps are ISO-8601 UTC strings. Dates are YYYY-MM-DD.
 */
export const TABLES = {
  categories: 'categories',
  products: 'products',
  customers: 'customers',
  stops: 'stops',
  orders: 'orders',
  orderItems: 'order_items',
  syncQueue: 'sync_queue',
  cartLines: 'cart_lines',
  appSettings: 'app_settings',
} as const;

export const SCHEMA_V1: readonly string[] = [
  `CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  )`,
  `CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    pack TEXT NOT NULL,
    price_paise INTEGER NOT NULL CHECK (price_paise > 0),
    tone TEXT NOT NULL CHECK (tone IN ('violet', 'peach', 'mint', 'sand')),
    glyph TEXT NOT NULL CHECK (glyph IN ('bag', 'bottle', 'tin', 'tub'))
  )`,
  `CREATE TABLE customers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    area TEXT NOT NULL
  )`,
  `CREATE TABLE stops (
    id TEXT PRIMARY KEY NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    visit_date TEXT NOT NULL,
    planned_time TEXT NOT NULL,
    position INTEGER NOT NULL,
    visit_state TEXT NOT NULL CHECK (visit_state IN ('todo', 'done')),
    UNIQUE (visit_date, position)
  )`,
  `CREATE TABLE orders (
    id TEXT PRIMARY KEY NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL CHECK (status IN ('queued', 'syncing', 'synced', 'failed')),
    note TEXT NOT NULL DEFAULT '',
    subtotal_paise INTEGER NOT NULL,
    gst_paise INTEGER NOT NULL,
    total_paise INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    last_error TEXT
  )`,
  `CREATE TABLE order_items (
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    line_no INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    pack TEXT NOT NULL,
    unit_price_paise INTEGER NOT NULL,
    qty INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 99),
    line_paise INTEGER NOT NULL,
    PRIMARY KEY (order_id, line_no)
  )`,
  `CREATE TABLE sync_queue (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL UNIQUE,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at INTEGER,
    parked INTEGER NOT NULL DEFAULT 0 CHECK (parked IN (0, 1)),
    last_error TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE cart_lines (
    customer_id TEXT NOT NULL REFERENCES customers(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    qty INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 99),
    PRIMARY KEY (customer_id, product_id)
  )`,
  `CREATE TABLE app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`,
  `CREATE INDEX idx_products_category ON products(category_id)`,
  `CREATE INDEX idx_stops_date ON stops(visit_date, position)`,
  `CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at)`,
  `CREATE INDEX idx_orders_created ON orders(created_at)`,
  `CREATE INDEX idx_sync_due ON sync_queue(parked, next_attempt_at, seq)`,
];
