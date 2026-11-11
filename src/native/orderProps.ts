/**
 * What the system surfaces (Live Activity, Dynamic Island, widgets, Android notification) draw.
 * Widget code runs in an isolated runtime with no imports and no module scope, so the app does all
 * the thinking here and hands over plain strings and numbers.
 */
import { ORDER_STEPS, etaLabel, orderStatusLabel, orderStepIndex, type OrderStatus } from './orderStatus';

/** The fields we need from an order. `Order` in src/store/types.ts satisfies this. */
export interface TrackableOrder {
  id: string;
  number: string;
  status: OrderStatus;
  updatedAt: string;
  etaDate?: string;
  itemCount: number;
  total: number;
  trackingUrl?: string;
}

export interface OrderSurfaceProps {
  /** False when there is no order to show (widgets show the quiet empty face). */
  active: boolean;
  /** "1042" */
  number: string;
  /** "في الطريق" */
  label: string;
  /** 0..4 on the five-step line, -1 before payment or when cancelled. */
  step: number;
  steps: number;
  /** "غداً", or "" when unknown. */
  eta: string;
  /** "٣ قطع" style line: "3 قطع". */
  items: string;
  /** Deep link opened when the surface is tapped. */
  url: string;
}

export const EMPTY_SURFACE: OrderSurfaceProps = {
  active: false,
  number: '',
  label: 'لا طلبات الآن',
  step: -1,
  steps: ORDER_STEPS.length,
  eta: '',
  items: '',
  url: 'wrk://',
};

function itemsLabel(count: number): string {
  if (count === 1) return 'قطعة واحدة';
  if (count === 2) return 'قطعتان';
  if (count >= 3 && count <= 10) return `${count} قطع`;
  return `${count} قطعة`;
}

export function toSurfaceProps(order: TrackableOrder, now: Date = new Date()): OrderSurfaceProps {
  return {
    active: true,
    number: order.number,
    label: orderStatusLabel(order.status),
    step: orderStepIndex(order.status),
    steps: ORDER_STEPS.length,
    eta: order.status === 'delivered' ? '' : (etaLabel(order.etaDate, now) ?? ''),
    items: itemsLabel(order.itemCount),
    url: `wrk://orders/${encodeURIComponent(order.id)}`,
  };
}
