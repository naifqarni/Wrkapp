/**
 * One call keeps every system surface in step with an order:
 *
 *   await syncOrderSurfaces(order)     // after checkout, on every status change, on app start
 *
 * - iOS: starts, updates or ends the Live Activity (Lock Screen + Dynamic Island) and refreshes the widget.
 * - Android: posts or updates the ongoing order notification and refreshes the widget.
 * - Web: does nothing.
 *
 * While the app is closed, the server keeps the Live Activity moving with ActivityKit push
 * (see `onOrderPushToken`). The payload format is documented in handoff/native.md.
 */
import { Platform } from 'react-native';
import { isOrderLive } from './orderStatus';
import { EMPTY_SURFACE, toSurfaceProps, type TrackableOrder } from './orderProps';
import type { OrderActivityHandle } from './widgets/OrderActivity';

type Activity = typeof import('./widgets/OrderActivity').orderActivity;
type Notification = typeof import('./widgets/OrderNotification').orderNotification;
type Widget = typeof import('./widgets/OrderWidget').orderWidget;

/**
 * The widget modules touch a native module when they load. They are required lazily and inside a
 * try/catch, so an old development build, Expo Go, or a build without the expo-widgets plugin simply
 * has no system surfaces instead of crashing at start-up.
 */
let surfaces: { activity: Activity; notification: Notification; widget: Widget } | null = null;
function load() {
  if (surfaces) return surfaces;
  const attempt = <T,>(get: () => T): T | null => {
    try {
      return get();
    } catch {
      return null;
    }
  };
  surfaces = {
    activity: attempt(() => (require('./widgets/OrderActivity') as typeof import('./widgets/OrderActivity')).orderActivity),
    notification: attempt(
      () => (require('./widgets/OrderNotification') as typeof import('./widgets/OrderNotification')).orderNotification
    ),
    widget: attempt(() => (require('./widgets/OrderWidget') as typeof import('./widgets/OrderWidget')).orderWidget),
  };
  return surfaces;
}

const ANDROID_CHANNEL = 'orders';
const live = new Map<string, OrderActivityHandle>();
const tokenListeners = new Set<(event: { orderId: string; activityId: string; pushToken: string }) => void>();

function notificationId(orderId: string) {
  return `order-${orderId}`;
}

/** A Live Activity may run 8 hours; mark content stale if nothing arrives for 6. */
function staleDate() {
  return new Date(Date.now() + 6 * 60 * 60 * 1000);
}

async function reportToken(orderId: string, handle: OrderActivityHandle) {
  try {
    const pushToken = await handle.getPushToken();
    if (pushToken) tokenListeners.forEach((l) => l({ orderId, activityId: handle.getId(), pushToken }));
  } catch {
    // Push is optional: local updates still work.
  }
}

export async function syncOrderSurfaces(order: TrackableOrder): Promise<void> {
  if (Platform.OS === 'web') return;
  const { activity: orderActivity, notification: orderNotification, widget: orderWidget } = load();
  const props = toSurfaceProps(order);
  const showing = isOrderLive(order.status);
  try {
    orderWidget?.updateSnapshot(showing || order.status === 'delivered' ? props : EMPTY_SURFACE);
  } catch {
    // No widget placed, or widgets unsupported: fine.
  }

  if (Platform.OS === 'ios' && orderActivity) {
    try {
      let handle = live.get(order.id) ?? null;
      if (showing) {
        if (handle) {
          await handle.update(props, staleDate());
        } else {
          handle = orderActivity.start(props, props.url, staleDate());
          live.set(order.id, handle);
          void reportToken(order.id, handle);
        }
      } else if (handle) {
        // Delivered: leave the final state on the Lock Screen for the system default time, then go.
        await handle.end(order.status === 'delivered' ? 'default' : 'immediate', props);
        live.delete(order.id);
      }
    } catch {
      // Live Activities can be switched off in Settings. Never let that break checkout.
    }
  }

  if (Platform.OS === 'android' && orderNotification) {
    try {
      const id = notificationId(order.id);
      const existing = await orderNotification.get(id);
      const options = {
        channelId: ANDROID_CHANNEL,
        title: props.label,
        text: props.eta ? `wrk. #${props.number}  ${props.eta}` : `wrk. #${props.number}`,
        ongoing: showing,
        alertOnlyOnce: true,
        autoCancel: !showing,
        url: props.url,
        color: '#111112',
      };
      if (showing || order.status === 'delivered') {
        if (existing) await existing.update(props, options);
        else if (showing) await orderNotification.post(props, { id, ...options });
      } else if (existing) {
        await existing.cancel();
      }
    } catch {
      // Notifications denied: the in-app order page still shows everything.
    }
  }
}

/** Call on app start so activities started before a relaunch can still be updated. */
export function adoptRunningOrderActivities(orderIdByActivityId: Record<string, string>): void {
  if (Platform.OS !== 'ios') return;
  const orderActivity = load().activity;
  if (!orderActivity) return;
  try {
    for (const handle of orderActivity.getInstances()) {
      const orderId = orderIdByActivityId[handle.getId()];
      if (orderId) live.set(orderId, handle);
    }
  } catch {
    // ignore
  }
}

/** Sign-out, or the order list is empty. */
export async function clearOrderSurfaces(): Promise<void> {
  if (Platform.OS === 'web') return;
  const { notification: orderNotification, widget: orderWidget } = load();
  try {
    orderWidget?.updateSnapshot(EMPTY_SURFACE);
  } catch {}
  for (const [id, handle] of live) {
    try {
      await handle.end('immediate');
    } catch {}
    live.delete(id);
  }
  try {
    await orderNotification?.cancelAll();
  } catch {}
}

/**
 * iOS: receive the per-activity push token and send it to the backend with the order id, so the server
 * can update the Live Activity when the courier scans the parcel. Returns an unsubscribe function.
 */
export function onOrderPushToken(listener: (event: { orderId: string; activityId: string; pushToken: string }) => void): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

/**
 * The simplest wiring: pass the whole order list whenever it changes.
 *
 *   const orders = useOrders((s) => s.orders);
 *   useEffect(() => { void syncOrders(orders); }, [orders]);
 *
 * Every order still in motion gets its Live Activity / notification; the widget shows the newest one.
 */
export async function syncOrders(orders: readonly TrackableOrder[]): Promise<void> {
  if (Platform.OS === 'web') return;
  const byNewest = [...orders].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const moving = byNewest.filter((o) => isOrderLive(o.status));
  if (byNewest.length === 0) return clearOrderSurfaces();
  // Oldest first so the newest order is the last to write the widget.
  for (const order of [...(moving.length ? moving : byNewest.slice(0, 1))].reverse()) {
    await syncOrderSurfaces(order);
  }
}
