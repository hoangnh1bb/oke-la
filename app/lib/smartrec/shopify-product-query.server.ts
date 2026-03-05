/**
 * Shopify product queries for SmartRec.
 * - Similar products & orders: Admin API (offline session tokens)
 * - ML recommendations: Storefront API (no admin auth needed)
 */
import { unauthenticated } from "../../shopify.server";
import { getCached, setCached } from "./memory-cache.server";

export interface ShopifyProduct {
  id: string;
  title: string;
  price: string;
  image: string;
  tags: string[];
  productType: string;
  totalInventory: number;
}

/**
 * Fetch products matching tags/type from Shopify Admin API.
 * Excludes the current product. Sorted by relevance (tag overlap count).
 * Results cached 4h per shop+productType+tags combo.
 */
export async function fetchSimilarProducts(
  shop: string,
  productType: string,
  tags: string[],
  excludeId: string,
  limit: number,
): Promise<ShopifyProduct[]> {
  const cacheKey = `similar:${shop}:${productType}:${tags.slice(0, 3).sort().join(",")}`;
  const cached = getCached<ShopifyProduct[]>(cacheKey);
  if (cached) return cached.filter((p) => p.id !== excludeId).slice(0, limit);

  try {
    const { admin } = await unauthenticated.admin(shop);

    // Query products by type, then filter by tag overlap
    const query = `#graphql
      query SmartRecSimilarProducts($productType: String!, $first: Int!) {
        products(first: $first, query: $productType, sortKey: BEST_SELLING) {
          nodes {
            id
            title
            tags
            productType
            totalInventory
            featuredMedia {
              preview {
                image {
                  url
                }
              }
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: {
        productType: `product_type:'${productType}'`,
        first: 20,
      },
    });

    const data = await response.json();
    const products: ShopifyProduct[] = (data.data?.products?.nodes || [])
      .filter((p: { id: string }) => p.id !== excludeId)
      .map((p: {
        id: string;
        title: string;
        tags: string[];
        productType: string;
        totalInventory: number;
        featuredMedia?: { preview?: { image?: { url?: string } } };
        priceRangeV2?: { minVariantPrice?: { amount?: string } };
      }) => ({
        id: p.id,
        title: p.title,
        price: p.priceRangeV2?.minVariantPrice?.amount || "0",
        image: p.featuredMedia?.preview?.image?.url || "",
        tags: p.tags || [],
        productType: p.productType,
        totalInventory: p.totalInventory || 0,
      }));

    // Rank by tag overlap
    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    products.sort((a, b) => {
      const aOverlap = a.tags.filter((t) => tagSet.has(t.toLowerCase())).length;
      const bOverlap = b.tags.filter((t) => tagSet.has(t.toLowerCase())).length;
      return bOverlap - aOverlap;
    });

    setCached(cacheKey, products);
    return products.slice(0, limit);
  } catch (err) {
    if (console && console.debug) {
      console.debug("[SmartRec] fetchSimilarProducts failed:", err);
    }
    return [];
  }
}

/**
 * Fetch Shopify ML-powered product recommendations via Storefront API.
 * Uses public Storefront API — no admin auth needed, works from storefront context.
 * Shopify ML uses purchase history + browsing patterns to recommend products.
 */
export async function fetchShopifyRecommendations(
  shop: string,
  productId: string,
  limit: number,
): Promise<ShopifyProduct[]> {
  const cacheKey = `recommendations:${shop}:${productId}`;
  const cached = getCached<ShopifyProduct[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  try {
    const { storefront } = await unauthenticated.storefront(shop);

    const query = `#graphql
      query SmartRecRecommendations($productId: ID!) {
        productRecommendations(productId: $productId, intent: RELATED) {
          id
          title
          tags
          productType
          featuredImage {
            url
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    `;

    const response = await storefront.graphql(query, {
      variables: { productId },
    });

    const data = await response.json();
    const products: ShopifyProduct[] = (data.data?.productRecommendations || [])
      .map((p: {
        id: string;
        title: string;
        tags: string[];
        productType: string;
        featuredImage?: { url?: string };
        priceRange?: { minVariantPrice?: { amount?: string } };
      }) => ({
        id: p.id,
        title: p.title,
        price: p.priceRange?.minVariantPrice?.amount || "0",
        image: p.featuredImage?.url || "",
        tags: p.tags || [],
        productType: p.productType,
        totalInventory: 0,
      }));

    setCached(cacheKey, products);
    return products.slice(0, limit);
  } catch (err) {
    if (console && console.debug) {
      console.debug("[SmartRec] fetchShopifyRecommendations failed:", err);
    }
    return [];
  }
}

/**
 * Fetch complementary products via Storefront API (COMPLEMENTARY intent).
 * "Pair it with" — products that go well with cart items.
 * Requires Shopify Search & Discovery app config for best results.
 */
export async function fetchComplementaryProducts(
  shop: string,
  productId: string,
  limit: number,
): Promise<ShopifyProduct[]> {
  const cacheKey = `complementary:${shop}:${productId}`;
  const cached = getCached<ShopifyProduct[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  try {
    const { storefront } = await unauthenticated.storefront(shop);

    const query = `#graphql
      query SmartRecComplementary($productId: ID!) {
        productRecommendations(productId: $productId, intent: COMPLEMENTARY) {
          id
          title
          tags
          productType
          featuredImage {
            url
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    `;

    const response = await storefront.graphql(query, {
      variables: { productId },
    });

    const data = await response.json();
    const products: ShopifyProduct[] = (data.data?.productRecommendations || [])
      .map((p: {
        id: string;
        title: string;
        tags: string[];
        productType: string;
        featuredImage?: { url?: string };
        priceRange?: { minVariantPrice?: { amount?: string } };
      }) => ({
        id: p.id,
        title: p.title,
        price: p.priceRange?.minVariantPrice?.amount || "0",
        image: p.featuredImage?.url || "",
        tags: p.tags || [],
        productType: p.productType,
        totalInventory: 0,
      }));

    setCached(cacheKey, products);
    return products.slice(0, limit);
  } catch (err) {
    if (console && console.debug) {
      console.debug("[SmartRec] fetchComplementaryProducts failed:", err);
    }
    return [];
  }
}

/**
 * Fetch recent orders to build substitution patterns.
 * Pattern: customer viewed product A (in browsing session) but bought product B.
 * Simplified MVP: find products frequently bought together or in same orders.
 */
export async function fetchOrderSubstitutionData(
  shop: string,
  limit: number = 50,
): Promise<Array<{ orderId: string; productIds: string[] }>> {
  const cacheKey = `orders:${shop}`;
  const cached = getCached<Array<{ orderId: string; productIds: string[] }>>(cacheKey);
  if (cached) return cached;

  try {
    const { admin } = await unauthenticated.admin(shop);

    const query = `#graphql
      query SmartRecRecentOrders($first: Int!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          nodes {
            id
            lineItems(first: 10) {
              nodes {
                product {
                  id
                }
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query, { variables: { first: limit } });
    const data = await response.json();

    const orders = (data.data?.orders?.nodes || []).map(
      (order: { id: string; lineItems: { nodes: Array<{ product: { id: string } | null }> } }) => ({
        orderId: order.id,
        productIds: order.lineItems.nodes
          .map((li) => li.product?.id)
          .filter(Boolean) as string[],
      }),
    );

    setCached(cacheKey, orders);
    return orders;
  } catch (err) {
    if (console && console.debug) {
      console.debug("[SmartRec] fetchOrderSubstitutionData failed:", err);
    }
    return [];
  }
}
