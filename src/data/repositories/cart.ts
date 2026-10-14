import { assertValidQty, lineTotal, MAX_LINE_QTY } from '@/domain/cart';
import type { ProductGlyph, ProductTone } from '@/domain/types';
import { asPaise, type Paise } from '@/money';

import type { SqlDb } from '../sql';

/** A cart line joined with its current product details. */
export interface CartLineView {
  productId: string;
  name: string;
  pack: string;
  tone: ProductTone;
  glyph: ProductGlyph;
  unitPricePaise: Paise;
  qty: number;
  linePaise: Paise;
}

export interface CartRepository {
  /** Cart lines for one customer, in product name order. Unknown products are skipped. */
  listLines(customerId: string): Promise<CartLineView[]>;
  /** Sets the quantity. 0 removes the line. Quantities above MAX_LINE_QTY are rejected. */
  setQty(customerId: string, productId: string, qty: number): Promise<void>;
  /** Adds quantity to existing lines, capped at MAX_LINE_QTY. Skips unknown products. */
  addLines(customerId: string, lines: { productId: string; qty: number }[]): Promise<void>;
  clear(customerId: string): Promise<void>;
}

interface CartRow {
  product_id: string;
  name: string;
  pack: string;
  tone: ProductTone;
  glyph: ProductGlyph;
  price_paise: number;
  qty: number;
}

export function createCartRepository(db: SqlDb): CartRepository {
  return {
    async listLines(customerId) {
      const rows = await db.all<CartRow>(
        `SELECT cl.product_id, p.name, p.pack, p.tone, p.glyph, p.price_paise, cl.qty
           FROM cart_lines cl
           JOIN products p ON p.id = cl.product_id
          WHERE cl.customer_id = ?
          ORDER BY p.name`,
        [customerId],
      );
      return rows.map((row) => {
        const unit = asPaise(row.price_paise);
        return {
          productId: row.product_id,
          name: row.name,
          pack: row.pack,
          tone: row.tone,
          glyph: row.glyph,
          unitPricePaise: unit,
          qty: row.qty,
          linePaise: lineTotal(unit, row.qty),
        };
      });
    },

    async setQty(customerId, productId, qty) {
      assertValidQty(qty);
      if (qty === 0) {
        await db.run('DELETE FROM cart_lines WHERE customer_id = ? AND product_id = ?', [
          customerId,
          productId,
        ]);
        return;
      }
      await db.run(
        `INSERT INTO cart_lines (customer_id, product_id, qty) VALUES (?, ?, ?)
         ON CONFLICT (customer_id, product_id) DO UPDATE SET qty = excluded.qty`,
        [customerId, productId, qty],
      );
    },

    async addLines(customerId, lines) {
      await db.transaction(async () => {
        for (const line of lines) {
          if (!Number.isInteger(line.qty) || line.qty <= 0) continue;
          const product = await db.first<{ id: string }>('SELECT id FROM products WHERE id = ?', [
            line.productId,
          ]);
          if (!product) continue;
          const existing = await db.first<{ qty: number }>(
            'SELECT qty FROM cart_lines WHERE customer_id = ? AND product_id = ?',
            [customerId, line.productId],
          );
          const next = Math.min(MAX_LINE_QTY, (existing?.qty ?? 0) + line.qty);
          await db.run(
            `INSERT INTO cart_lines (customer_id, product_id, qty) VALUES (?, ?, ?)
             ON CONFLICT (customer_id, product_id) DO UPDATE SET qty = excluded.qty`,
            [customerId, line.productId, next],
          );
        }
      });
    },

    async clear(customerId) {
      await db.run('DELETE FROM cart_lines WHERE customer_id = ?', [customerId]);
    },
  };
}
