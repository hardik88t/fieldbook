import type { SqlDb } from '../sql';

import { createCartRepository, type CartRepository } from './cart';
import { createOrderRepository, type OrderRepository } from './orders';
import { createProductRepository, type ProductRepository } from './products';
import { createSettingsRepository, type SettingsRepository } from './settings';
import { createStopRepository, type StopRepository } from './stops';
import { createSyncQueueRepository, type SyncQueueRepository } from './syncQueue';

export type { CartLineView, CartRepository } from './cart';
export { EmptyCartError } from './orders';
export type { OrderRepository, PlaceOrderInput } from './orders';
export type { ProductFilter, ProductRepository } from './products';
export type { SettingsRepository } from './settings';
export type { StopRepository } from './stops';
export type { FailureUpdate, QueueItem, SyncQueueRepository } from './syncQueue';

export interface Repositories {
  products: ProductRepository;
  stops: StopRepository;
  orders: OrderRepository;
  cart: CartRepository;
  syncQueue: SyncQueueRepository;
  settings: SettingsRepository;
}

export function createRepositories(db: SqlDb): Repositories {
  return {
    products: createProductRepository(db),
    stops: createStopRepository(db),
    orders: createOrderRepository(db),
    cart: createCartRepository(db),
    syncQueue: createSyncQueueRepository(db),
    settings: createSettingsRepository(db),
  };
}
