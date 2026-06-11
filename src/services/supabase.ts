import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { clearJson, loadJson, saveJson } from '@/services/vault';

/**
 * Supabase handles identity only. Ghost-account data never leaves the
 * device — the session token itself is kept in the Keychain/Keystore via
 * the chunked secure vault (tokens exceed SecureStore's ~2 KB soft limit).
 */

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://lhculyshwpvewmhlwlom.supabase.co';
// Publishable key — safe to ship in the client.
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_iNyKsqe0sPOgULEzT9Kykw_Iq68Hbuy';

const secureSessionStorage = {
  getItem: (key: string) => loadJson<string>(`sb.${key}`),
  setItem: (key: string, value: string) => saveJson(`sb.${key}`, value),
  removeItem: (key: string) => clearJson(`sb.${key}`),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Web falls through to supabase's default localStorage handling.
    ...(Platform.OS !== 'web' ? { storage: secureSessionStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is foregrounded (Supabase RN guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
