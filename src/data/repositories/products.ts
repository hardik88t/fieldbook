import { matchesQuery } from '@/domain/search';
import type { Category, Product, ProductGlyph, ProductTone } from '@/domain/types';
import { asPaise } from '@/money';

import type { SqlDb } from '../sql';

export interface ProductFilter {
  /** Free text, matched case- and diacritic-insensitively against name, pack and category. */
  query?: string;
  /** Category id, or null/undefined for all categories. */
  categoryId?: string | null;
}

export interface ProductRepository {
  listCategories(): Promise<Category[]>;
  listProducts(filter?: ProductFilter): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
}

interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  pack: string;
  price_paise: number;
  tone: ProductTone;
  glyph: ProductGlyph;
}

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    pack: row.pack,
    pricePaise: asPaise(row.price_paise),
    tone: row.tone,
    glyph: row.glyph,
  };
}

export function createProductRepository(db: SqlDb): ProductRepository {
  const categoryNames = async (): Promise<Map<string, string>> => {
    const rows = await db.all<CategoryRow>('SELECT id, name, sort_order FROM categories');
    return new Map(rows.map((row) => [row.id, row.name]));
  };

  return {
    async listCategories() {
      const rows = await db.all<CategoryRow>(
        'SELECT id, name, sort_order FROM categories ORDER BY sort_order, name',
      );
      return rows.map((row) => ({ id: row.id, name: row.name, sortOrder: row.sort_order }));
    },

    async listProducts(filter = {}) {
      const rows = await db.all<ProductRow>(
        'SELECT id, category_id, name, pack, price_paise, tone, glyph FROM products ORDER BY name',
      );
      let products = rows.map(toProduct);
      if (filter.categoryId) {
        products = products.filter((product) => product.categoryId === filter.categoryId);
      }
      const query = filter.query?.trim();
      if (query) {
        const names = await categoryNames();
        products = products.filter((product) =>
          matchesQuery(
            `${product.name} ${product.pack} ${names.get(product.categoryId) ?? ''}`,
            query,
          ),
        );
      }
      return products;
    },

    async getProduct(id) {
      const row = await db.first<ProductRow>(
        'SELECT id, category_id, name, pack, price_paise, tone, glyph FROM products WHERE id = ?',
        [id],
      );
      return row ? toProduct(row) : null;
    },
  };
}
