// Webhook handler for products/delete — removes all vectors and explainer cache for deleted product
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { deleteProductVectors } from "../lib/ai/product-vector-upsert-and-query.server";
import prisma from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { shop, payload } = await authenticate.webhook(request);
    if (!payload?.id) return new Response("OK", { status: 200 });

    const productId = String(payload.id);

    await Promise.allSettled([
      deleteProductVectors(shop, productId),
      prisma.explainerCache.deleteMany({
        where: {
          shopId: shop,
          OR: [{ productAId: productId }, { productBId: productId }],
        },
      }),
    ]);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[SmartRec webhook] products/delete error:", err);
    return new Response("OK", { status: 200 });
  }
}
