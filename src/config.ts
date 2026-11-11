/** Every environment value the app reads. With none set, the app runs on bundled and mock data. */
const env = process.env;

export const config = {
  wooBaseUrl: (env.EXPO_PUBLIC_WOO_BASE_URL ?? '').replace(/\/+$/, ''),
  moyasarPublishableKey: env.EXPO_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? '',
  supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** Community ships behind a flag until the legal review is done. Default on for development. */
  communityEnabled: (env.EXPO_PUBLIC_COMMUNITY_ENABLED ?? '1') !== '0',
  supportEmail: 'hello@ranlab.dev',
} as const;

export const hasWoo = () => config.wooBaseUrl.length > 0;
export const hasMoyasar = () => config.moyasarPublishableKey.length > 0;
export const hasSupabase = () => config.supabaseUrl.length > 0 && config.supabaseAnonKey.length > 0;

/** Delivery inside Saudi Arabia is included in the price (the shop has one free-shipping zone). */
export const shipping = { fee: 0, freeFrom: 0 } as const;
