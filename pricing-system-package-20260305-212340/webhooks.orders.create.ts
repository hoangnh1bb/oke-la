import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import db from "~/db.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const order = await request.json();
    const shop = request.headers.get("x-shopify-shop-domain");

    if (!shop || !order.id) {
      return json({ error: "Invalid webhook data" }, { status: 400 });
    }

    // Extract product IDs from line items
    const productIds = order.line_items?.map((item: any) => item.product_id.toString()) || [];
    const orderTotal = parseFloat(order.total_price) || 0;

    // Check if any products were added via app (from localStorage tracking)
    // This is best-effort attribution based on recent cart additions
    const recentAdditions = await db.usageLog.findMany({
      where: {
        shopId: shop,
        eventType: "add_to_cart",
        srSource: true,
        productId: { in: productIds },
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: {
        productId: true,
      },
    });

    const attributedProductIds = [...new Set(recentAdditions.map(a => a.productId).filter(Boolean))];

    if (attributedProductIds.length > 0) {
      // Store order attribution
      await db.orderAttribution.create({
        data: {
          shopId: shop,
          orderId: order.id.toString(),
          productIds: JSON.stringify(attributedProductIds),
          orderTotal,
          createdAt: new Date(order.created_at),
        },
      });

      console.log(`Order ${order.id} attributed to app: ${attributedProductIds.length} products`);
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error processing order webhook:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
