/**
 * In-memory product cache with TTL.
 * Avoids hitting Shopify Admin API on every storefront request.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_ENTRIES = 500;

class MemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    if (this.store.size >= MAX_ENTRIES) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

export interface CachedProduct {
  id: number;
  variant_id: number;
  title: string;
  handle: string;
  price: string;
  image_url: string;
  url: string;
  product_type: string;
  tags: string[];
  rating: number | null;
  review_count: number;
}

export const productCache = new MemoryCache<CachedProduct>();
export const productListCache = new MemoryCache<CachedProduct[]>();
export const shopPolicyCache = new MemoryCache<{ hasReturnPolicy: boolean }>();
