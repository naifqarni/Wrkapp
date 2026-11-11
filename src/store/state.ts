import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { priceOf, products, sample } from './catalogue';
import type { CartLine, Order, OrderStatus, Personal, PersonalKey, ProductId, TierId } from './types';

const storage = createJSONStorage(() => AsyncStorage);

/* ---------- باسمك: typed once, shown on every piece ---------- */
interface PersonalState extends Personal {
  tier: TierId;
  set: (k: PersonalKey, v: string) => void;
  setTier: (t: TierId) => void;
}
export const usePersonal = create<PersonalState>()(
  persist(
    (set) => ({
      name: '', nameEn: '', msg: '', from: '', date: '', tier: 'sig',
      set: (k, v) => set({ [k]: v } as Pick<Personal, PersonalKey>),
      setTier: (tier) => set({ tier }),
    }),
    { name: 'wrk-personal-v1', storage },
  ),
);
/** What to show on objects: the visitor's text, or the sample until they type. */
export const shown = (s: Personal, k: PersonalKey) => s[k].trim() || sample[k];

/* ---------- cart ---------- */
interface CartState {
  lines: CartLine[];
  add: (id: ProductId, tier: TierId | null, personal: Personal, price?: number) => CartLine;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}
const lineKey = (id: ProductId, tier: TierId | null, p: Personal) => [id, tier ?? '', p.name, p.nameEn, p.date, p.msg, p.from].join('|');

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (id, tier, personal, price) => {
        const keep: Personal = { name: '', nameEn: '', msg: '', from: '', date: '' };
        for (const k of products[id].personal) keep[k] = personal[k].trim();
        const key = lineKey(id, tier, keep);
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          const next = { ...existing, qty: Math.min(99, existing.qty + 1) };
          set({ lines: get().lines.map((l) => (l.key === key ? next : l)) });
          return next;
        }
        const line: CartLine = { key, id, tier, price: price ?? priceOf(id, tier), qty: 1, personal: keep };
        set({ lines: [...get().lines, line] });
        return line;
      },
      setQty: (key, qty) =>
        set({ lines: qty <= 0 ? get().lines.filter((l) => l.key !== key) : get().lines.map((l) => (l.key === key ? { ...l, qty: Math.min(99, qty) } : l)) }),
      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      clear: () => set({ lines: [] }),
    }),
    { name: 'wrk-cart-v1', storage },
  ),
);
export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.price, 0);

/* ---------- who receives it ---------- */
export interface Profile { fullName: string; mobile: string; email: string; city: string; district: string; street: string; extra: string }
interface ProfileState extends Profile { set: (patch: Partial<Profile>) => void }
export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({ fullName: '', mobile: '', email: '', city: '', district: '', street: '', extra: '', set: (patch) => set(patch) }),
    { name: 'wrk-profile-v1', storage },
  ),
);

/* ---------- orders placed from this device ---------- */
interface OrdersState {
  orders: Order[];
  /** shop order key per order id, needed to read status later */
  keys: Record<string, string>;
  upsert: (o: Order, key?: string) => void;
  setStatus: (id: string, status: OrderStatus, patch?: Partial<Order>) => void;
}
export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      keys: {},
      upsert: (o, key) =>
        set({
          orders: [o, ...get().orders.filter((x) => x.id !== o.id)],
          keys: key ? { ...get().keys, [o.id]: key } : get().keys,
        }),
      setStatus: (id, status, patch) =>
        set({ orders: get().orders.map((o) => (o.id === id ? { ...o, ...patch, status, updatedAt: new Date().toISOString() } : o)) }),
    }),
    { name: 'wrk-orders-v1', storage },
  ),
);
