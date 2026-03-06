// Upserts a product into ProductCache from a Shopify webhook payload.
// Called by products/create and products/update webhooks.
import prisma from "../../db.server";

interface ShopifyWebhookProduct {
  id: unknown;
  title?: unknown;
  handle?: unknown;
  product_type?: unknown;
  tags?: unknown;
  variants?: Array<{ price?: string }>;
  image?: { src?: string } | null;
  images?: Array<{ src?: string }>;
  status?: unknown;
}

export async function upsertProductCacheFromPayload(
  shop: string,
  payload: ShopifyWebhookProduct
): Promise<void> {
  const shopifyProductId = String(payload.id);
  const title = String(payload.title || "");
  const handle = String(payload.handle || "");
  const productType = String(payload.product_type || "");
  const tags = String(payload.tags || "");
  const status = String(payload.status || "active");

  // Extract lowest variant price
  const variants = Array.isArray(payload.variants) ? payload.variants : [];
  const prices = variants
    .map((v) => parseFloat(v.price || "0"))
    .filter((p) => !isNaN(p) && p > 0);
  const price = prices.length ? Math.min(...prices) : 0;

  // Featured image
  const imageUrl =
    payload.image?.src ||
    (Array.isArray(payload.images) ? payload.images[0]?.src : undefined) ||
    "";

  const availableForSale = status === "active";

  await prisma.productCache.upsert({
    where: { shop_shopifyProductId: { shop, shopifyProductId } },
    create: {
      shop,
      shopifyProductId,
      handle,
      title,
      productType,
      price,
      imageUrl,
      tags,
      availableForSale,
    },
    update: {
      handle,
      title,
      productType,
      price,
      imageUrl,
      tags,
      availableForSale,
    },
  });
}
