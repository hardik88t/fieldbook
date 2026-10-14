// TODO(phase B3): build the Orders screen: list with status pills (queued, syncing, synced,
// failed + Retry), "Sync now" and pull-to-refresh, and order detail. Data: useOrders(), useOrder(id),
// useSync(). Order detail will live at src/app/order/[id].tsx (a root stack screen, added in B3).
// Final file path: src/app/(tabs)/orders.tsx
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

export default function OrdersScreen() {
  return <ScreenPlaceholder title="Orders" phaseTask="Phase B3 (Orders screen)" />;
}
