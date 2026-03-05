/**
 * In-memory TTL cache for SmartRec.
 * Caches Shopify API responses (alternatives, substitution maps) to avoid excessive API calls.
 * Default TTL: 4 hours per spec. Entries auto-expire on read.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number = FOUR_HOURS_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(keyPrefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) store.delete(key);
  }
}
