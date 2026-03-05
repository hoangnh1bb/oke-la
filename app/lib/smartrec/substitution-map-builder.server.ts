/**
 * Build substitution map from order history.
 * Pattern: products frequently bought together suggest substitution/complement relationships.
 * When shopper views product A but others who viewed A bought B instead → B is a substitution.
 * Cached in SubstitutionCache table, rebuilt every 4h.
 */
import prisma from "../../db.server";
import { fetchOrderSubstitutionData } from "./shopify-product-query.server";
import { getCached, setCached } from "./memory-cache.server";

/**
 * Get substitution products for a given source product.
 * Priority: DB cache → build from orders → empty.
 * Returns product IDs sorted by frequency (most substituted first).
 */
export async function getSubstitutionTargets(
  shop: string,
  sourceProductId: string,
  limit: number,
): Promise<string[]> {
  // Check in-memory cache first
  const cacheKey = `subst:${shop}:${sourceProductId}`;
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  // Check DB cache
  const dbEntries = await prisma.substitutionCache.findMany({
    where: { shop, sourceProductId },
    orderBy: { frequency: "desc" },
    take: limit,
  });

  if (dbEntries.length > 0) {
    const targets = dbEntries.map((e) => e.targetProductId);
    setCached(cacheKey, targets);
    return targets;
  }

  // Build from order history if no cache exists
  await buildSubstitutionMap(shop);

  // Re-query after build
  const freshEntries = await prisma.substitutionCache.findMany({
    where: { shop, sourceProductId },
    orderBy: { frequency: "desc" },
    take: limit,
  });

  const targets = freshEntries.map((e) => e.targetProductId);
  setCached(cacheKey, targets);
  return targets;
}

/**
 * Build substitution map from recent orders.
 * For each order with multiple products, every pair (A,B) where A≠B
 * creates a substitution entry: viewers of A might want B.
 */
async function buildSubstitutionMap(shop: string): Promise<void> {
  const buildKey = `subst-building:${shop}`;
  if (getCached<boolean>(buildKey)) return; // Prevent concurrent builds
  setCached(buildKey, true, 60 * 1000); // Lock for 60s

  const orders = await fetchOrderSubstitutionData(shop);

  for (const order of orders) {
    const ids = [...new Set(order.productIds)]; // Dedupe within order
    if (ids.length < 2) continue;

    // Create pairs: each product in order is a potential substitute for others
    for (const source of ids) {
      for (const target of ids) {
        if (source === target) continue;

        await prisma.substitutionCache.upsert({
          where: {
            shop_sourceProductId_targetProductId: { shop, sourceProductId: source, targetProductId: target },
          },
          update: { frequency: { increment: 1 } },
          create: { shop, sourceProductId: source, targetProductId: target, frequency: 1 },
        });
      }
    }
  }
}
