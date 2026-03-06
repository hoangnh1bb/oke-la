// Webhook handler for products/update — re-embeds text/image and invalidates explainer cache
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { embedText, embedImage } from "../lib/ai/text-and-image-embeddings.server";
import {
  upsertTextVector,
  upsertImageVector,
} from "../lib/ai/product-vector-upsert-and-query.server";
import prisma from "../db.server";
import { upsertProductCacheFromPayload } from "../lib/ai/product-cache-upsert-from-webhook-payload.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { shop, payload } = await authenticate.webhook(request);
    if (!payload?.id) return new Response("OK", { status: 200 });

    const productId = String(payload.id);
    const title = (payload.title as string) || "";
    const tags = (payload.tags as string) || "";
    const productType = (payload.product_type as string) || "";
    const imageUrl = (payload.image as { src?: string } | null)?.src;

    // Update ProductCache — non-blocking
    upsertProductCacheFromPayload(shop, payload as Parameters<typeof upsertProductCacheFromPayload>[1])
      .catch((err) => console.error("[SmartRec webhook] ProductCache update failed:", err));

    // Re-embed text — non-blocking
    const textContent = `${title} ${productType} ${tags}`.trim();
    embedText(textContent)
      .then((vector) => upsertTextVector(shop, productId, vector))
      .catch((err) =>
        console.error("[SmartRec webhook] text re-embed failed:", err)
      );

    // Re-embed image if present — non-blocking
    if (imageUrl) {
      embedImage(imageUrl)
        .then(
          (vector) =>
            vector && upsertImageVector(shop, productId, imageUrl, vector)
        )
        .catch((err) =>
          console.error("[SmartRec webhook] image re-embed failed:", err)
        );
    }

    // Invalidate ExplainerCache entries referencing this product — non-blocking
    prisma.explainerCache
      .deleteMany({
        where: {
          shopId: shop,
          OR: [{ productAId: productId }, { productBId: productId }],
        },
      })
      .catch(() => {});

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[SmartRec webhook] products/update error:", err);
    return new Response("OK", { status: 200 });
  }
}
