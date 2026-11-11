/**
 * The one door into the community backend. Screens call getCommunityApi() and
 * nothing else. With EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * set it talks to Supabase; without them it runs on the in-memory mock.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { config, hasSupabase } from '@/config';
import { createSupabaseCommunityApi } from './supabase';
import type { CommunityApi } from './types';

export * from './types';

let instance: CommunityApi | null = null;

function build(): CommunityApi {
  if (hasSupabase()) {
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        // The session holds a random placeholder identity, never the work email.
        // Native keeps it in the app's private storage; web uses localStorage.
        ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
        storageKey: 'wrk.community.session',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return createSupabaseCommunityApi(client);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mock = require('./mock') as { createMockCommunityApi?: () => CommunityApi; mockCommunityApi?: CommunityApi; default?: CommunityApi | (() => CommunityApi) };
  if (typeof mock.createMockCommunityApi === 'function') return mock.createMockCommunityApi();
  if (mock.mockCommunityApi) return mock.mockCommunityApi;
  if (typeof mock.default === 'function') return mock.default();
  if (mock.default) return mock.default;
  throw new Error('src/community/api/mock.ts must export createMockCommunityApi()');
}

export function getCommunityApi(): CommunityApi {
  instance ??= build();
  return instance;
}

/** true when the app is talking to the real backend rather than the mock */
export const isLiveCommunity = (): boolean => hasSupabase();
