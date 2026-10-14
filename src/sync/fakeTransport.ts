import {
  TransportError,
  type SubmitOrderRequest,
  type SubmitOrderResponse,
  type SyncTransport,
} from './types';

export type InjectedFailure =
  /** Fails before the server sees the order (retryable). */
  | 'network'
  /** Server error 5xx (retryable). */
  | 'server'
  /** Server validation rejection (not retryable, the order is parked). */
  | 'rejected'
  /** The server stores the order, then the response is lost (retryable). Tests idempotency. */
  | 'timeout-after-commit';

export interface ServerOrder {
  serverOrderId: string;
  idempotencyKey: string;
  request: SubmitOrderRequest;
  acceptedAt: string;
}

export interface FakeTransportOptions {
  /** Simulated round trip time. Default 800 ms, matching the demo feel. */
  latencyMs?: number;
  online?: boolean;
  /** Injected for tests so they never wait on real timers. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * In-memory stand-in for the Fieldbook server. Honours an online flag, latency, scripted failures
 * and idempotency keys. Server state lives only in memory, so a page reload starts a fresh server.
 */
export class FakeTransport implements SyncTransport {
  private online: boolean;
  private latencyMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => Date;
  private failures: InjectedFailure[] = [];
  private readonly orders = new Map<string, ServerOrder>();
  private sequence = 0;
  /** Number of calls received, including failed and duplicate ones. */
  callCount = 0;

  constructor(options: FakeTransportOptions = {}) {
    this.online = options.online ?? true;
    this.latencyMs = options.latencyMs ?? 800;
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? (() => new Date());
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  isOnline(): boolean {
    return this.online;
  }

  setLatency(latencyMs: number): void {
    this.latencyMs = latencyMs;
  }

  /** Queues failures that the next requests will hit, in order. */
  failNext(...failures: InjectedFailure[]): void {
    this.failures.push(...failures);
  }

  getServerOrder(idempotencyKey: string): ServerOrder | undefined {
    return this.orders.get(idempotencyKey);
  }

  serverOrderCount(): number {
    return this.orders.size;
  }

  /** Orders in the order the server accepted them. */
  serverOrders(): ServerOrder[] {
    return [...this.orders.values()];
  }

  async submitOrder(request: SubmitOrderRequest): Promise<SubmitOrderResponse> {
    this.callCount += 1;
    await this.sleep(this.latencyMs);

    if (!this.online) {
      throw new TransportError('offline', 'No connection');
    }

    const injected = this.failures.shift();
    if (injected === 'network') {
      throw new TransportError('timeout', 'Connection dropped before the server responded');
    }
    if (injected === 'server') {
      throw new TransportError('server', 'Server error, try again');
    }
    if (injected === 'rejected') {
      throw new TransportError('rejected', 'Order rejected: price list changed');
    }

    const existing = this.orders.get(request.idempotencyKey);
    if (existing) {
      return {
        serverOrderId: existing.serverOrderId,
        acceptedAt: existing.acceptedAt,
        duplicate: true,
      };
    }

    this.sequence += 1;
    const accepted: ServerOrder = {
      serverOrderId: `srv-${String(this.sequence).padStart(5, '0')}`,
      idempotencyKey: request.idempotencyKey,
      request,
      acceptedAt: this.now().toISOString(),
    };
    this.orders.set(request.idempotencyKey, accepted);

    if (injected === 'timeout-after-commit') {
      throw new TransportError('timeout', 'Response lost after the server accepted the order');
    }
    return {
      serverOrderId: accepted.serverOrderId,
      acceptedAt: accepted.acceptedAt,
      duplicate: false,
    };
  }
}
