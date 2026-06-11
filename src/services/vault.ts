import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Encrypted local storage for the Ghost Account list, backed by the
 * iOS Keychain (Secure Enclave) / Android Keystore via expo-secure-store.
 *
 * SecureStore values can be rejected above ~2 KB on some iOS releases, so
 * JSON payloads are chunked across keys: `${key}.n` holds the chunk count,
 * `${key}.0..n-1` hold the pieces.
 */

const CHUNK_SIZE = 1800;

// SecureStore is unavailable on web (Expo dev convenience) — fall back to
// an in-memory map so the app still runs in a browser preview.
const memoryFallback = new Map<string, string>();
const useMemory = Platform.OS === 'web';

async function setRaw(key: string, value: string): Promise<void> {
  if (useMemory) {
    memoryFallback.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getRaw(key: string): Promise<string | null> {
  if (useMemory) return memoryFallback.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function deleteRaw(key: string): Promise<void> {
  if (useMemory) {
    memoryFallback.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.slice(i, i + CHUNK_SIZE));
  }
  // Clear stale tail chunks from a previously larger payload.
  const prevCount = Number((await getRaw(`${key}.n`)) ?? 0);
  await setRaw(`${key}.n`, String(chunks.length));
  await Promise.all(chunks.map((c, i) => setRaw(`${key}.${i}`, c)));
  for (let i = chunks.length; i < prevCount; i++) await deleteRaw(`${key}.${i}`);
}

export async function loadJson<T>(key: string): Promise<T | null> {
  const count = Number((await getRaw(`${key}.n`)) ?? 0);
  if (!count) return null;
  const parts = await Promise.all(
    Array.from({ length: count }, (_, i) => getRaw(`${key}.${i}`)),
  );
  if (parts.some((p) => p === null)) return null; // corrupted — treat as empty
  try {
    return JSON.parse(parts.join('')) as T;
  } catch {
    return null;
  }
}

export async function clearJson(key: string): Promise<void> {
  const count = Number((await getRaw(`${key}.n`)) ?? 0);
  await deleteRaw(`${key}.n`);
  for (let i = 0; i < count; i++) await deleteRaw(`${key}.${i}`);
}
