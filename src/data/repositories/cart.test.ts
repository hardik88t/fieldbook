import { MAX_LINE_QTY } from '@/domain/cart';
import { ids, openTestDatabase } from '@/testing/helpers';

const SUNRISE = ids.sunriseCustomer;
const BLUEBIRD = ids.bluebirdCustomer;

describe('cart repository', () => {
  it('stores quantities per customer, so each shop keeps its own cart', async () => {
    const { repos } = await openTestDatabase();
    await repos.cart.setQty(SUNRISE, ids.basmati, 2);
    await repos.cart.setQty(BLUEBIRD, ids.basmati, 5);
    expect((await repos.cart.listLines(SUNRISE))[0]?.qty).toBe(2);
    expect((await repos.cart.listLines(BLUEBIRD))[0]?.qty).toBe(5);
  });

  it('joins product details and computes line totals in paise', async () => {
    const { repos } = await openTestDatabase();
    await repos.cart.setQty(SUNRISE, ids.sunflowerOil, 6);
    const [line] = await repos.cart.listLines(SUNRISE);
    expect(line).toMatchObject({
      productId: ids.sunflowerOil,
      name: 'Sunflower Oil',
      pack: '1 L bottle',
      unitPricePaise: 42000,
      qty: 6,
      linePaise: 252000,
    });
  });

  it('removes a line when quantity is set to 0', async () => {
    const { repos } = await openTestDatabase();
    await repos.cart.setQty(SUNRISE, ids.basmati, 2);
    await repos.cart.setQty(SUNRISE, ids.basmati, 0);
    expect(await repos.cart.listLines(SUNRISE)).toEqual([]);
  });

  it('rejects quantities above the line maximum or below zero', async () => {
    const { repos } = await openTestDatabase();
    await expect(repos.cart.setQty(SUNRISE, ids.basmati, MAX_LINE_QTY + 1)).rejects.toThrow(
      RangeError,
    );
    await expect(repos.cart.setQty(SUNRISE, ids.basmati, -1)).rejects.toThrow(RangeError);
  });

  it('adds quantities onto existing lines and caps the total at the line maximum', async () => {
    const { repos } = await openTestDatabase();
    await repos.cart.setQty(SUNRISE, ids.basmati, 90);
    await repos.cart.addLines(SUNRISE, [{ productId: ids.basmati, qty: 20 }]);
    expect((await repos.cart.listLines(SUNRISE))[0]?.qty).toBe(MAX_LINE_QTY);
  });

  it('skips products that no longer exist instead of failing the whole add', async () => {
    const { repos } = await openTestDatabase();
    await repos.cart.addLines(SUNRISE, [
      { productId: 'discontinued-item', qty: 3 },
      { productId: ids.basmati, qty: 1 },
    ]);
    const lines = await repos.cart.listLines(SUNRISE);
    expect(lines.map((l) => l.productId)).toEqual([ids.basmati]);
  });

  it('clears only the chosen customer', async () => {
    const { repos } = await openTestDatabase();
    await repos.cart.setQty(SUNRISE, ids.basmati, 1);
    await repos.cart.setQty(BLUEBIRD, ids.basmati, 1);
    await repos.cart.clear(SUNRISE);
    expect(await repos.cart.listLines(SUNRISE)).toEqual([]);
    expect(await repos.cart.listLines(BLUEBIRD)).toHaveLength(1);
  });
});
