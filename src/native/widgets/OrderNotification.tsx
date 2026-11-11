/** iOS and web: no custom notification. iOS uses the Live Activity. */
import type { OrderSurfaceProps } from '../orderProps';

export interface OrderNotificationHandle {
  update(props: OrderSurfaceProps, options?: { title?: string; text?: string; ongoing?: boolean; url?: string; alertOnlyOnce?: boolean; channelId?: string }): Promise<void>;
  cancel(): Promise<void>;
}
export const orderNotification: {
  post(props: OrderSurfaceProps, options?: { id?: string; channelId?: string; title?: string; text?: string; ongoing?: boolean; alertOnlyOnce?: boolean; url?: string; color?: string; autoCancel?: boolean }): Promise<OrderNotificationHandle>;
  get(id: string): Promise<OrderNotificationHandle | null>;
  cancelAll(): Promise<void>;
} | null = null;
