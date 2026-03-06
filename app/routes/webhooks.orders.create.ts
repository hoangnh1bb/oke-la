import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const ATTRIBUTION_WINDOW_HOURS = 24;

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { shop, payload } = await authenticate.webhook(request);

    if (!payload || !payload.id) {
      console.error("[Webhook] Invalid payload");
      return new Response("Invalid payload", { status: 400 });
    }

    const order = payload;
    const orderTime = new Date(order.created_at);
    const windowStart = new Date(orderTime.getTime() - ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000);

    console.log(`[Webhook] Processing order ${order.id} for shop ${shop}`);

    // Get line items from order
    const orderProducts = order.line_items?.map((item: any) => ({
      productId: item.product_id?.toString(),
      variantId: item.variant_id?.toString(),
      quantity: item.quantity,
      price: parseFloat(item.price),
    })) || [];

    if (orderProducts.length === 0) {
      console.log("[Webhook] No products in order");
      return new Response("OK", { status: 200 });
    }

    // Find cart additions within attribution window
    const recentInteractions = await db.usageLog.findMany({
      where: {
        shopId: shop,
        eventType: "add_to_cart",
        srSource: true,
        timestamp: { gte: windowStart, lte: orderTime },
      },
      orderBy: { timestamp: "desc" },
    });

    console.log(`[Webhook] Found ${recentInteractions.length} cart additions in 24h window`);

    // Match products
    let attributedRevenue = 0;
    const attributedProducts: string[] = [];

    for (const product of orderProducts) {
      const match = recentInteractions.find(
        (log) => log.productId === product.productId
      );

      if (match) {
        attributedRevenue += product.price * product.quantity;
        attributedProducts.push(product.productId);
        console.log(`[Webhook] Attributed product ${product.productId}: $${product.price * product.quantity}`);
      }
    }

    if (attributedRevenue > 0) {
      await db.orderAttribution.create({
        data: {
          shopId: shop,
          orderId: order.id.toString(),
          productIds: JSON.stringify(attributedProducts),
          orderTotal: parseFloat(order.total_price || "0"),
        },
      });

      console.log(`[Webhook] Created attribution: $${attributedRevenue} / $${order.total_price}`);
    } else {
      console.log("[Webhook] No attribution found for this order");
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Webhook] Error processing order:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
