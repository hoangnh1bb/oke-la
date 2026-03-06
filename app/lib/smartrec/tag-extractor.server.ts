/**
 * Extract most common tags from viewed products in a session.
 * Used by UC-03 (Lost Shopper) to suggest category filter shortcuts.
 * Tags come from client-side Liquid data attributes — no admin API call needed.
 */
import type { ViewedProduct } from "./types";

export function extractCommonTags(
  viewedProducts: ViewedProduct[],
  limit: number,
): { label: string; value: string }[] {
  const tagCount = new Map<string, number>();

  for (const product of viewedProducts) {
    if (!product.tags) continue;
    for (const tag of product.tags) {
      const normalized = tag.trim().toLowerCase();
      if (!normalized) continue;
      tagCount.set(normalized, (tagCount.get(normalized) || 0) + 1);
    }
  }

  return Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => ({ label: tag, value: tag }));
}
