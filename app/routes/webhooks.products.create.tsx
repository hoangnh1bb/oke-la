// Webhook handler for products/create — generates text and image embeddings for new products
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { embedText, embedImage } from "../lib/ai/text-and-image-embeddings.server";
import {
  upsertTextVector,
  upsertImageVector,
} from "../lib/ai/product-vector-upsert-and-query.server";
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

    // Write to ProductCache (needed by explainer, quiz, concierge) — non-blocking
    upsertProductCacheFromPayload(shop, payload as Parameters<typeof upsertProductCacheFromPayload>[1])
      .catch((err) => console.error("[SmartRec webhook] ProductCache upsert failed:", err));

    // Embed text (title + type + tags) — non-blocking
    const textContent = `${title} ${productType} ${tags}`.trim();
    embedText(textContent)
      .then((vector) => upsertTextVector(shop, productId, vector))
      .catch((err) =>
        console.error("[SmartRec webhook] text embed failed:", err)
      );

    // Embed featured image — non-blocking
    if (imageUrl) {
      embedImage(imageUrl)
        .then(
          (vector) =>
            vector && upsertImageVector(shop, productId, imageUrl, vector)
        )
        .catch((err) =>
          console.error("[SmartRec webhook] image embed failed:", err)
        );
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[SmartRec webhook] products/create error:", err);
    // Always return 200 to prevent Shopify retry storms on app errors
    return new Response("OK", { status: 200 });
  }
}
