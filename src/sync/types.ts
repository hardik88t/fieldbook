/**
 * The contract between the app and the server. The real server (later phase) and FakeTransport
 * both implement SyncTransport, so the sync engine never knows which one it is talking to.
 */

export interface SubmitOrderLine {
  productId: string;
  productName: string;
  qty: number;
  unitPricePaise: number;
  linePaise: number;
}

export interface SubmitOrderPayload {
  orderId: string;
  customerId: string;
  note: string;
  createdAt: string;
  lines: SubmitOrderLine[];
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
}

export interface SubmitOrderRequest {
  /** Same value on every retry of the same order. The server must treat repeats as one order. */
  idempotencyKey: string;
  order: SubmitOrderPayload;
}

export interface SubmitOrderResponse {
  serverOrderId: string;
  acceptedAt: string;
  /** True when the server already had this idempotency key and returned the earlier result. */
  duplicate: boolean;
}

export interface SyncTransport {
  submitOrder(request: SubmitOrderRequest): Promise<SubmitOrderResponse>;
}

export type TransportErrorKind = 'offline' | 'timeout' | 'server' | 'rejected';

/**
 * Thrown by transports. `retryable` is false only for definitive rejections (for example a
 * validation error), which park the order instead of retrying it forever.
 */
export class TransportError extends Error {
  readonly kind: TransportErrorKind;
  readonly retryable: boolean;

  constructor(kind: TransportErrorKind, message: string) {
    super(message);
    this.name = 'TransportError';
    this.kind = kind;
    this.retryable = kind !== 'rejected';
  }
}
