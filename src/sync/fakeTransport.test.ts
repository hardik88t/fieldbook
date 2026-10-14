import { FakeTransport } from './fakeTransport';
import { TransportError, type SubmitOrderRequest } from './types';

const request = (key: string): SubmitOrderRequest => ({
  idempotencyKey: key,
  order: {
    orderId: key,
    customerId: 'cust-northgate',
    note: '',
    createdAt: '2026-10-14T04:00:00.000Z',
    lines: [
      {
        productId: 'rice-basmati-rice-gold',
        productName: 'Basmati',
        qty: 2,
        unitPricePaise: 57000,
        linePaise: 114000,
      },
    ],
    subtotalPaise: 114000,
    gstPaise: 5700,
    totalPaise: 119700,
  },
});

const instant = async () => undefined;

describe('FakeTransport', () => {
  it('refuses requests while offline, without storing anything', async () => {
    const transport = new FakeTransport({ online: false, sleep: instant });
    const error = await transport.submitOrder(request('k1')).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TransportError);
    expect((error as TransportError).kind).toBe('offline');
    expect((error as TransportError).retryable).toBe(true);
    expect(transport.serverOrderCount()).toBe(0);
  });

  it('stores an accepted order and returns its server id', async () => {
    const transport = new FakeTransport({ sleep: instant });
    const response = await transport.submitOrder(request('k1'));
    expect(response).toMatchObject({ serverOrderId: 'srv-00001', duplicate: false });
    expect(transport.getServerOrder('k1')?.request.order.totalPaise).toBe(119700);
  });

  it('answers a repeated idempotency key with the original result, without a second order', async () => {
    const transport = new FakeTransport({ sleep: instant });
    const first = await transport.submitOrder(request('k1'));
    const second = await transport.submitOrder(request('k1'));
    expect(second).toMatchObject({ serverOrderId: first.serverOrderId, duplicate: true });
    expect(transport.serverOrderCount()).toBe(1);
  });

  it('rejects with a non-retryable error when a rejection is injected', async () => {
    const transport = new FakeTransport({ sleep: instant });
    transport.failNext('rejected');
    const error = (await transport
      .submitOrder(request('k1'))
      .catch((e: unknown) => e)) as TransportError;
    expect(error.kind).toBe('rejected');
    expect(error.retryable).toBe(false);
    expect(transport.serverOrderCount()).toBe(0);
  });

  it('stores the order but loses the response when timeout-after-commit is injected', async () => {
    const transport = new FakeTransport({ sleep: instant });
    transport.failNext('timeout-after-commit');
    await expect(transport.submitOrder(request('k1'))).rejects.toBeInstanceOf(TransportError);
    expect(transport.getServerOrder('k1')).toBeDefined();
  });

  it('waits for the configured latency through the injected sleep', async () => {
    const waits: number[] = [];
    const transport = new FakeTransport({
      latencyMs: 750,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    await transport.submitOrder(request('k1'));
    expect(waits).toEqual([750]);
  });
});
