/**
 * Find alternative products for UC-01 (Hesitating Shopper) and GET /api/alternatives.
 * Priority order (4-tier strategy):
 *   1. Substitution patterns from order history (view A → buy B)
 *   2. Shopify ML recommendations (purchase history + browsing patterns)
 *   3. Same collection + matching tags from Shopify API (sorted by best selling)
 *   4. Session-based fallback (same type from viewed products)
 * Results cached 4h per product per shop via memory-cache.
 */
import type { CurrentProduct, ViewedProduct } from "./types";
import { getSubstitutionTargets } from "./substitution-map-builder.server";
import { fetchSimilarProducts, fetchShopifyRecommendations, type ShopifyProduct } from "./shopify-product-query.server";
import { getCached, setCached } from "./memory-cache.server";

export interface AlternativeProduct {
  id: string;
  title: string;
  price: string;
  image: string;
  url: string;
  variant_id: string;
  matchReason: "substitution" | "shopify_ml" | "similar_products" | "session_fallback";
}

/**
 * Main entry point — finds alternatives using 4-tier strategy.
 * Called by UC-01 handler and GET /api/alternatives endpoint.
 */
export async function findAlternativeProducts(
  shop: string,
  currentProduct: CurrentProduct,
  viewedProducts: ViewedProduct[],
  limit: number,
): Promise<AlternativeProduct[]> {
  // Check combined cache first
  const cacheKey = `alts:${shop}:${currentProduct.id}`;
  const cached = getCached<AlternativeProduct[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  const results: AlternativeProduct[] = [];

  // Tier 1: Substitution patterns from order history
  const substitutionIds = await getSubstitutionTargets(shop, currentProduct.id, limit);
  if (substitutionIds.length > 0) {
    // Fetch product details for substitution targets via Shopify API
    const similar = await fetchSimilarProducts(
      shop,
      currentProduct.type,
      currentProduct.tags,
      currentProduct.id,
      20,
    );

    const substitutionProducts = substitutionIds
      .map((id) => similar.find((p) => p.id === id))
      .filter((p): p is ShopifyProduct => p !== undefined)
      .map((p) => toAlternative(p, "substitution"));

    results.push(...substitutionProducts);
  }

  if (results.length >= limit) {
    const final = results.slice(0, limit);
    setCached(cacheKey, final);
    return final;
  }

  // Tier 2: Shopify ML recommendations (purchase history + browsing patterns)
  const existingIds = new Set(results.map((r) => r.id));

  const mlRecommendations = await fetchShopifyRecommendations(shop, currentProduct.id, limit);
  for (const p of mlRecommendations) {
    if (results.length >= limit) break;
    if (existingIds.has(p.id) || p.id === currentProduct.id) continue;
    results.push(toAlternative(p, "shopify_ml"));
    existingIds.add(p.id);
  }

  if (results.length >= limit) {
    const final = results.slice(0, limit);
    setCached(cacheKey, final);
    return final;
  }

  // Tier 3: Same type + matching tags from Shopify API (sorted by best selling)
  const remaining = limit - results.length;

  const similarProducts = await fetchSimilarProducts(
    shop,
    currentProduct.type,
    currentProduct.tags,
    currentProduct.id,
    remaining + 5, // Fetch extra to account for dedup
  );

  for (const p of similarProducts) {
    if (results.length >= limit) break;
    if (existingIds.has(p.id)) continue;
    results.push(toAlternative(p, "similar_products"));
    existingIds.add(p.id);
  }

  if (results.length >= limit) {
    const final = results.slice(0, limit);
    setCached(cacheKey, final);
    return final;
  }

  // Tier 4: Session fallback — same type from viewed products
  const sessionAlts = viewedProducts
    .filter((p) => p.type === currentProduct.type && p.id !== currentProduct.id && !existingIds.has(p.id))
    .map((p): AlternativeProduct => ({
      id: p.id,
      title: p.title,
      price: p.price,
      image: p.image,
      url: p.url || "",
      variant_id: "",
      matchReason: "session_fallback",
    }));

  results.push(...sessionAlts.slice(0, limit - results.length));

  const final = results.slice(0, limit);
  setCached(cacheKey, final);
  return final;
}

function extractNumericId(gid: string): string {
  const match = gid.match(/\/(\d+)$/);
  return match ? match[1] : gid;
}

function toAlternative(p: ShopifyProduct, reason: AlternativeProduct["matchReason"]): AlternativeProduct {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    image: p.image,
    url: p.handle ? `/products/${p.handle}` : "",
    variant_id: p.variantId ? extractNumericId(p.variantId) : "",
    matchReason: reason,
  };
}
