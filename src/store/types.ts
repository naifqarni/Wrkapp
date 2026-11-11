export type ProductId = 'kit' | 'badge' | 'pen' | 'notebook' | 'card' | 'cardcase' | 'tray' | 'nameplate';
export type TierId = 'ess' | 'sig' | 'pre';
export type PersonalKey = 'name' | 'nameEn' | 'msg' | 'from' | 'date';

export interface Tier { id: TierId; ar: string; price: number; note: string; sku: string }
export interface Product {
  id: ProductId;
  sku: string;
  /** one-word name for a first-day moment */
  word: string;
  /** plain name */
  ar: string;
  sub: string;
  story: string;
  price: number;
  tiers?: Tier[];
  personal: PersonalKey[];
  mm: { w: number; h: number; d: number };
  inKit: boolean;
  spec: string[];
  photos: number;
}

export interface Personal { name: string; nameEn: string; msg: string; from: string; date: string }

export interface CartLine {
  key: string;
  id: ProductId;
  tier: TierId | null;
  price: number;
  qty: number;
  personal: Personal;
}

export type OrderStatus =
  | 'pending-payment' | 'paid' | 'personalising' | 'shipped' | 'out-for-delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  etaDate?: string;
  itemCount: number;
  total: number;
  trackingUrl?: string;
  lines: CartLine[];
}
