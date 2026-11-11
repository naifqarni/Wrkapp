/** Every environment value the app reads. With none set, the app runs on bundled and mock data. */
const env = process.env;

export const config = {
  wooBaseUrl: (env.EXPO_PUBLIC_WOO_BASE_URL ?? '').replace(/\/+$/, ''),
  moyasarPublishableKey: env.EXPO_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? '',
  supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** Community ships behind a flag until the legal review is done. Default on for development. */
  communityEnabled: (env.EXPO_PUBLIC_COMMUNITY_ENABLED ?? '1') !== '0',
  supportEmail: env.EXPO_PUBLIC_SUPPORT_EMAIL || 'hello@ranlab.dev',
} as const;

const url = (v: string | undefined, fallback: string) => (v || fallback).replace(/\/+$/, '');

/**
 * The three public addresses. Planned: wrk.sa (the community), store.wrk.sa (the store), corporate.wrk.sa (companies).
 * Until those domains are live they point at the current shop; change them in .env, not in code.
 */
export const links = {
  social: url(env.EXPO_PUBLIC_SOCIAL_URL, ''),
  store: url(env.EXPO_PUBLIC_STORE_URL, config.wooBaseUrl || 'https://shop.ranlab.dev'),
  corporate: url(env.EXPO_PUBLIC_CORPORATE_URL, 'https://shop.ranlab.dev/business'),
} as const;

export const hasWoo = () => config.wooBaseUrl.length > 0;
export const hasMoyasar = () => config.moyasarPublishableKey.length > 0;
export const hasSupabase = () => config.supabaseUrl.length > 0 && config.supabaseAnonKey.length > 0;

/** Delivery inside Saudi Arabia is included in the price (the shop has one free-shipping zone). */
export const shipping = { fee: 0, freeFrom: 0 } as const;
