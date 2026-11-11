/** Web and unsupported platforms: there is no home-screen widget. */
import type { OrderSurfaceProps } from '../orderProps';

export const orderWidget: { updateSnapshot(props: OrderSurfaceProps): void; reload(): void } | null = null;
