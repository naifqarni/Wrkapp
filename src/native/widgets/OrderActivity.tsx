/** Web, Android and unsupported platforms: there is no Live Activity. Android uses OrderNotification. */
import type { OrderSurfaceProps } from '../orderProps';

export interface OrderActivityHandle {
  getId(): string;
  update(props: OrderSurfaceProps, staleDate?: Date): Promise<void>;
  end(policy?: 'default' | 'immediate', props?: OrderSurfaceProps): Promise<void>;
  getPushToken(): Promise<string | null>;
}
export const orderActivity: {
  start(props: OrderSurfaceProps, url?: string, staleDate?: Date): OrderActivityHandle;
  getInstances(): OrderActivityHandle[];
} | null = null;
