import type { Paise } from '@/money';

/** Visual tone used for product image tiles. Matches the portfolio reference palette. */
export type ProductTone = 'violet' | 'peach' | 'mint' | 'sand';

/** Simple product silhouette drawn with SVG. */
export type ProductGlyph = 'bag' | 'bottle' | 'tin' | 'tub';

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  pack: string;
  pricePaise: Paise;
  tone: ProductTone;
  glyph: ProductGlyph;
}

export interface Customer {
  id: string;
  name: string;
  area: string;
}

export type VisitState = 'todo' | 'done';

export interface Stop {
  id: string;
  customerId: string;
  /** Local calendar day, YYYY-MM-DD. */
  visitDate: string;
  /** Planned visit time, HH:MM (24 hour). */
  plannedTime: string;
  position: number;
  visitState: VisitState;
}

export interface OrderReference {
  id: string;
  totalPaise: Paise;
  createdAt: string;
}

export interface StopView extends Stop {
  customer: Customer;
  /** Most recent order for this customer at query time (may have been placed today). */
  lastOrder: OrderReference | null;
}

export type OrderStatus = 'queued' | 'syncing' | 'synced' | 'failed';

export interface OrderLine {
  productId: string;
  productName: string;
  pack: string;
  unitPricePaise: Paise;
  qty: number;
  linePaise: Paise;
}

export interface OrderSummary {
  id: string;
  customerId: string;
  customerName: string;
  createdAt: string;
  status: OrderStatus;
  subtotalPaise: Paise;
  gstPaise: Paise;
  totalPaise: Paise;
  lastError: string | null;
}

export interface Order extends OrderSummary {
  note: string;
  lines: OrderLine[];
}

export interface CartLine {
  customerId: string;
  productId: string;
  qty: number;
}

export interface Totals {
  subtotalPaise: Paise;
  gstPaise: Paise;
  totalPaise: Paise;
}
