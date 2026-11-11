/** Order states shared by the app, the Live Activity, the widgets and the Android notification. */
export type OrderStatus =
  | 'pending-payment'
  | 'paid'
  | 'personalising'
  | 'shipped'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled';

/** The five steps drawn on the progress line. */
export const ORDER_STEPS = ['paid', 'personalising', 'shipped', 'out-for-delivery', 'delivered'] as const satisfies readonly OrderStatus[];

const LABEL: Record<OrderStatus, string> = {
  'pending-payment': 'بانتظار الدفع',
  paid: 'استلمنا طلبك',
  personalising: 'نجهّزه باسمك',
  shipped: 'في الطريق',
  'out-for-delivery': 'مع المندوب',
  delivered: 'وصل',
  cancelled: 'أُلغي الطلب',
};

export function orderStatusLabel(status: OrderStatus): string {
  return LABEL[status];
}

/** -1 before payment and when cancelled. */
export function orderStepIndex(status: OrderStatus): number {
  return (ORDER_STEPS as readonly OrderStatus[]).indexOf(status);
}

/** While true, the order deserves a Live Activity / ongoing notification. */
export function isOrderLive(status: OrderStatus): boolean {
  return status === 'paid' || status === 'personalising' || status === 'shipped' || status === 'out-for-delivery';
}

/** "اليوم", "غداً", or a short date for the ETA. */
export function etaLabel(etaDate: string | undefined, now: Date = new Date()): string | null {
  if (!etaDate) return null;
  const eta = new Date(etaDate);
  if (Number.isNaN(eta.getTime())) return null;
  const day = (d: Date) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);
  const diff = day(eta) - day(now);
  if (diff <= 0) return 'اليوم';
  if (diff === 1) return 'غداً';
  if (diff === 2) return 'بعد غد';
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return `${eta.getDate()} ${months[eta.getMonth()]}`;
}
