import { data } from "react-router";
import {
  productCache,
  productListCache,
  shopPolicyCache,
  type CachedProduct,
} from "./product-cache.server";
import db from "../db.server";

// Type for the admin GraphQL client from authenticate.public.appProxy
type AdminClient = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

// ── GraphQL Queries ────────────────────────────────────────────

const PRODUCT_BY_ID_QUERY = `#graphql
  query ProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      productType
      tags
      variants(first: 1) {
        nodes { id }
      }
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
      metafield(namespace: "reviews", key: "rating") {
        value
      }
      metafieldReviewCount: metafield(namespace: "reviews", key: "rating_count") {
        value
      }
    }
  }
`;

const PRODUCTS_BY_TYPE_QUERY = `#graphql
  query ProductsByType($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      nodes {
        id
        title
        handle
        productType
        tags
        variants(first: 1) {
          nodes { id }
        }
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
        metafield(namespace: "reviews", key: "rating") {
          value
        }
        metafieldReviewCount: metafield(namespace: "reviews", key: "rating_count") {
          value
        }
      }
    }
  }
`;

const SHOP_POLICY_QUERY = `#graphql
  query ShopPolicy {
    shop {
      refundPolicy {
        body
      }
    }
  }
`;

// ── Helpers ────────────────────────────────────────────────────

function extractNumericId(gid: string): number {
  const match = gid.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function formatPrice(amount: string, currencyCode: string): string {
  const num = parseFloat(amount);
  if (currencyCode === "VND") {
    return num.toLocaleString("vi-VN") + "₫";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(num);
}

function formatImageUrl(url: string | null, size: number = 160): string {
  if (!url) return "";
  if (url.includes("_" + size + "x")) return url;
  return url.replace(/\.([a-z]+)(\?.*)?$/i, `_${size}x${size}_crop_center.$1$2`);
}

function parseRating(metafieldValue: string | null): number | null {
  if (!metafieldValue) return null;
  try {
    const parsed = JSON.parse(metafieldValue);
    return typeof parsed === "object" && parsed.value
      ? parseFloat(parsed.value)
      : parseFloat(metafieldValue);
  } catch {
    const num = parseFloat(metafieldValue || "");
    return isNaN(num) ? null : num;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProductNode(node: any): CachedProduct {
  const priceData = node.priceRangeV2?.minVariantPrice;
  const imageUrl = node.featuredMedia?.preview?.image?.url || null;

  const firstVariantGid = node.variants?.nodes?.[0]?.id || "";

  return {
    id: extractNumericId(node.id),
    variant_id: extractNumericId(firstVariantGid),
    title: node.title || "",
    handle: node.handle || "",
    price: priceData ? formatPrice(priceData.amount, priceData.currencyCode) : "",
    image_url: formatImageUrl(imageUrl),
    url: "/products/" + (node.handle || ""),
    product_type: node.productType || "",
    tags: node.tags || [],
    rating: parseRating(node.metafield?.value || null),
    review_count: parseInt(node.metafieldReviewCount?.value || "0", 10) || 0,
  };
}

// ── Data Fetchers (Shopify Admin API) ──────────────────────────

async function fetchProductById(
  productId: number,
  admin: AdminClient,
  shop: string,
): Promise<CachedProduct | null> {
  const cacheKey = `${shop}:product:${productId}`;
  const cached = productCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await admin.graphql(PRODUCT_BY_ID_QUERY, {
      variables: { id: `gid://shopify/Product/${productId}` },
    });
    const responseJson = await response.json();
    const productNode = responseJson.data?.product;
    if (!productNode) return null;

    const product = mapProductNode(productNode);
    productCache.set(cacheKey, product);
    return product;
  } catch (e) {
    console.error("[SmartRec] fetchProductById error:", e);
    return null;
  }
}

async function fetchSimilarProducts(
  productType: string,
  tags: string[],
  excludeId: number,
  admin: AdminClient,
  shop: string,
): Promise<CachedProduct[]> {
  const queryParts: string[] = [];
  if (productType) queryParts.push(`product_type:"${productType}"`);
  if (tags.length > 0) {
    queryParts.push(
      tags
        .slice(0, 3)
        .map((t) => `tag:"${t}"`)
        .join(" OR "),
    );
  }

  const queryStr = queryParts.join(" OR ") || "*";
  const cacheKey = `${shop}:similar:${queryStr}`;
  const cached = productListCache.get(cacheKey);
  if (cached) return cached.filter((p) => p.id !== excludeId);

  try {
    const response = await admin.graphql(PRODUCTS_BY_TYPE_QUERY, {
      variables: { query: queryStr, first: 10 },
    });
    const responseJson = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = (responseJson.data?.products?.nodes || []).map((n: any) =>
      mapProductNode(n),
    );
    productListCache.set(cacheKey, products);
    return products.filter((p: CachedProduct) => p.id !== excludeId);
  } catch (e) {
    console.error("[SmartRec] fetchSimilarProducts error:", e);
    return [];
  }
}

async function fetchShopPolicies(
  admin: AdminClient,
  shop: string,
): Promise<{ hasFreeReturn: boolean }> {
  const cacheKey = `${shop}:policies`;
  const cached = shopPolicyCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await admin.graphql(SHOP_POLICY_QUERY);
    const responseJson = await response.json();
    const body = (responseJson.data?.shop?.refundPolicy?.body || "").toLowerCase();
    const hasFreeReturn =
      body.includes("miễn phí") ||
      body.includes("free") ||
      body.includes("không mất phí");
    const policies = { hasFreeReturn };
    shopPolicyCache.set(cacheKey, policies, 24 * 60 * 60 * 1000);
    return policies;
  } catch (e) {
    console.error("[SmartRec] fetchShopPolicies error:", e);
    return { hasFreeReturn: false };
  }
}

// ── Route Handlers ─────────────────────────────────────────────

interface IntentSession {
  currentProduct?: number;
  pageViews?: number[];
  backNavCount?: number;
  cartItems?: number[];
  cartHesitation?: number;
  comparePattern?: boolean;
  sizeChartOpen?: boolean;
  sessionDuration?: number;
}

interface IntentRequestBody {
  session?: IntentSession;
  score?: number;
  pageType?: string;
}

/**
 * POST /apps/smartrec/track — receive behavioral signals & store events
 */
export async function handleTrack(body: unknown, shop: string) {
  const req = body as {
    eventType?: string;
    widgetType?: string;
    productId?: string;
    sessionId?: string;
    value?: number;
    metadata?: string;
  };

  if (!req.eventType) return { ok: false, error: "eventType required" };

  await db.smartRecEvent.create({
    data: {
      shop,
      eventType: req.eventType,
      widgetType: req.widgetType || null,
      productId: req.productId || null,
      sessionId: req.sessionId || null,
      value: req.value || 0,
      metadata: req.metadata || null,
    },
  });

  return { ok: true };
}

/**
 * POST /apps/smartrec/intent — core intent engine
 * Receives session + score, fetches real product data from Shopify Admin API.
 */
export async function handleIntent(
  body: unknown,
  admin: AdminClient,
  shop: string,
) {
  const req = body as IntentRequestBody;
  const score = req.score ?? 0;
  const pageType = req.pageType ?? "";
  const sess = req.session ?? {};

  // Score < 30: browsing, don't interrupt
  if (score < 30) return { type: "none" };

  // Score 90+: ready to buy, don't distract
  if (score >= 90) return { type: "none" };

  // UC-02: Comparison Bar
  if (
    pageType === "product" &&
    sess.comparePattern &&
    sess.pageViews &&
    sess.pageViews.length >= 2 &&
    sess.currentProduct
  ) {
    const prevId = sess.pageViews[sess.pageViews.length - 2];
    const currId = sess.currentProduct;

    const [productA, productB] = await Promise.all([
      fetchProductById(prevId, admin, shop),
      fetchProductById(currId, admin, shop),
    ]);

    if (productA && productB) {
      const diffPoints: string[] = [];
      const priceA = parseFloat(productA.price.replace(/[^\d.]/g, ""));
      const priceB = parseFloat(productB.price.replace(/[^\d.]/g, ""));

      if (!isNaN(priceA) && !isNaN(priceB) && priceA !== priceB) {
        const cheaper = priceA < priceB ? productA : productB;
        const diff = Math.abs(priceA - priceB);
        diffPoints.push(`${cheaper.title.slice(0, 20)} rẻ hơn ${diff.toLocaleString("vi-VN")}₫`);
      }

      if (productA.rating && productB.rating && productA.rating !== productB.rating) {
        const better = productA.rating > productB.rating ? productA : productB;
        const ratingDiff = Math.abs(productA.rating - productB.rating).toFixed(1);
        diffPoints.push(`${better.title.slice(0, 20)} rating cao hơn ${ratingDiff}★`);
      }

      return {
        type: "comparison_bar",
        data: { productA, productB, diff_points: diffPoints.slice(0, 2) },
      };
    }
  }

  // UC-01: Alternative Nudge
  if (pageType === "product" && score >= 56 && score <= 89 && sess.currentProduct) {
    const current = await fetchProductById(sess.currentProduct, admin, shop);
    if (current) {
      const alts = await fetchSimilarProducts(
        current.product_type,
        current.tags,
        current.id,
        admin,
        shop,
      );
      if (alts.length > 0) {
        return {
          type: "alternative_nudge",
          data: { products: alts.slice(0, 2) },
        };
      }
    }
  }

  // UC-03: Tag Navigator
  if (
    sess.backNavCount &&
    sess.backNavCount >= 3 &&
    (!sess.cartItems || sess.cartItems.length === 0) &&
    sess.pageViews &&
    sess.pageViews.length >= 2
  ) {
    const viewedProducts = await Promise.all(
      sess.pageViews.slice(-6).map((id) => fetchProductById(id, admin, shop)),
    );

    const tagFreq: Record<string, number> = {};
    for (const p of viewedProducts) {
      if (!p) continue;
      for (const tag of p.tags) {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      }
    }

    const sortedTags = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag, count]) => ({ label: tag, value: tag, count }));

    if (sortedTags.length > 0) {
      return { type: "tag_navigator", data: { tags: sortedTags } };
    }
  }

  // UC-04: Trust Nudge
  if (
    pageType === "cart" &&
    sess.cartHesitation &&
    sess.cartHesitation > 60 &&
    sess.cartItems &&
    sess.cartItems.length > 0
  ) {
    const policies = await fetchShopPolicies(admin, shop);
    const cartProducts = await Promise.all(
      sess.cartItems.slice(0, 5).map((id) => fetchProductById(id, admin, shop)),
    );

    const items = cartProducts
      .filter((p): p is CachedProduct => p !== null)
      .map((p) => ({
        product_id: p.id,
        title: p.title,
        rating: p.rating,
        review_count: p.review_count,
        has_free_return: policies.hasFreeReturn,
      }));

    if (items.length > 0) {
      return { type: "trust_nudge", data: { items } };
    }
  }

  return { type: "none" };
}

/**
 * GET /apps/smartrec/products — fetch alternatives for a product
 */
export async function handleProducts(
  params: URLSearchParams,
  admin: AdminClient,
  shop: string,
) {
  const productId = parseInt(params.get("productId") || "0", 10);
  if (!productId) {
    return data({ error: "productId required", code: "BAD_REQUEST" }, { status: 400 });
  }

  const product = await fetchProductById(productId, admin, shop);
  if (!product) {
    return { products: [], productId };
  }

  const alts = await fetchSimilarProducts(
    product.product_type,
    product.tags,
    product.id,
    admin,
    shop,
  );

  return { products: alts.slice(0, 4), productId };
}

/**
 * GET /apps/smartrec/config — merchant widget settings + styles
 */
export async function handleConfig(params: URLSearchParams, shopOverride?: string) {
  const shop = shopOverride || params.get("shop") || "";

  if (shop) {
    const settings = await db.smartRecSettings.findUnique({ where: { shop } });
    if (settings) {
      return {
        enabled: settings.enabled,
        thresholds: {
          browsing: settings.thresholdBrowsing,
          considering: settings.thresholdConsidering,
          highConsideration: settings.thresholdHighIntent,
          strongIntent: settings.thresholdStrongIntent,
          readyToBuy: settings.thresholdReadyToBuy,
        },
        widgets: {
          alternative_nudge: settings.alternativeNudge,
          comparison_bar: settings.comparisonBar,
          tag_navigator: settings.tagNavigator,
          trust_nudge: settings.trustNudge,
        },
        styles: {
          accentColor: settings.styleAccentColor,
          textColor: settings.styleTextColor,
          bgColor: settings.styleBgColor,
          borderRadius: settings.styleBorderRadius,
          fontSize: settings.styleFontSize,
          buttonStyle: settings.styleButtonStyle,
          customCSS: settings.styleCustomCSS,
          widgetTitle: settings.widgetTitle,
        },
      };
    }
  }

  return {
    enabled: true,
    thresholds: { browsing: 30, considering: 55, highConsideration: 75, strongIntent: 89, readyToBuy: 90 },
    widgets: { alternative_nudge: true, comparison_bar: true, tag_navigator: true, trust_nudge: true },
    styles: {
      accentColor: "#000000",
      textColor: "#1a1a1a",
      bgColor: "#ffffff",
      borderRadius: 8,
      fontSize: 14,
      buttonStyle: "filled",
      customCSS: "",
      widgetTitle: "Không chắc chắn? Khách hàng tương tự cũng xem những sản phẩm này.",
    },
  };
}
