/**
 * Shop client.
 *  - Catalogue: WooCommerce Store API (public, no keys): live prices and stock by SKU.
 *  - Orders: the wrk. app bridge (backend/woo/wrk-app-bridge.php), which creates the order on the server from SKUs
 *    (prices are never trusted from the app) and marks it paid only after checking the payment with Moyasar.
 */
import { config, hasWoo } from '@/config';

import { products, skuOf } from './catalogue';
import { personalFields } from './format';
import type { Profile } from './state';
import type { CartLine, OrderStatus } from './types';

export class ShopError extends Error {
  code: 'network' | 'rejected' | 'not-configured';
  constructor(code: ShopError['code'], message?: string) {
    super(message ?? code);
    this.name = 'ShopError';
    this.code = code;
  }
}

async function call<T>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  if (!hasWoo()) throw new ShopError('not-configured');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${config.wooBaseUrl}/wp-json${path}`, {
      ...init,
      signal: ctl.signal,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new ShopError('network');
  } finally {
    clearTimeout(timer);
  }
  let body: unknown = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) {
    const msg = body && typeof body === 'object' && 'message' in body ? String((body as { message: unknown }).message) : `HTTP ${res.status}`;
    throw new ShopError('rejected', msg);
  }
  return body as T;
}

/** SKU -> price in SAR, and SKU -> in stock. Only SKUs the shop knows are returned. */
export interface LiveCatalogue { price: Record<string, number>; inStock: Record<string, boolean> }

interface StoreApiProduct {
  sku?: string;
  is_in_stock?: boolean;
  prices?: { price?: string; currency_minor_unit?: number };
}
export async function fetchLiveCatalogue(): Promise<LiveCatalogue> {
  const list = await call<StoreApiProduct[]>('/wc/store/v1/products?per_page=100');
  const out: LiveCatalogue = { price: {}, inStock: {} };
  if (!Array.isArray(list)) return out;
  for (const p of list) {
    if (!p || typeof p.sku !== 'string' || !p.sku) continue;
    const minor = p.prices?.currency_minor_unit ?? 2;
    const raw = Number(p.prices?.price);
    if (Number.isFinite(raw) && raw > 0) out.price[p.sku] = raw / 10 ** minor;
    out.inStock[p.sku] = p.is_in_stock !== false;
  }
  return out;
}

export interface CreatedOrder { id: string; number: string; key: string; total: number; shipping: number; currency: string }

export async function createShopOrder(lines: CartLine[], who: Profile): Promise<CreatedOrder> {
  const body = {
    items: lines.map((l) => ({ sku: skuOf(l.id, l.tier), quantity: l.qty, fields: personalFields(products[l.id], l.personal) })),
    customer: { name: who.fullName, mobile: who.mobile, email: who.email },
    address: { city: who.city, district: who.district, street: who.street, extra: who.extra, country: 'SA' },
  };
  const r = await call<{ id: number | string; number: number | string; key: string; total: number; shipping: number; currency: string }>(
    '/wrk/v1/app/order', { method: 'POST', body: JSON.stringify(body) },
  );
  if (!r || !r.id || !r.key || !(Number(r.total) > 0)) throw new ShopError('rejected', 'bad order response');
  return { id: String(r.id), number: String(r.number ?? r.id), key: r.key, total: Number(r.total), shipping: Number(r.shipping) || 0, currency: r.currency || 'SAR' };
}

/** Tells the shop which payment paid the order. The shop checks it with Moyasar before marking the order paid. */
export async function confirmShopPayment(orderId: string, key: string, paymentId: string): Promise<{ status: OrderStatus }> {
  return call<{ status: OrderStatus }>(`/wrk/v1/app/order/${encodeURIComponent(orderId)}/paid`, {
    method: 'POST', body: JSON.stringify({ key, payment_id: paymentId }),
  });
}

export async function fetchShopOrder(orderId: string, key: string): Promise<{ status: OrderStatus; tracking_url?: string; eta?: string }> {
  return call(`/wrk/v1/app/order/${encodeURIComponent(orderId)}?key=${encodeURIComponent(key)}`);
}
