import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import db from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
    // Check if Growth plan
    const subscription = await db.subscription.findUnique({
      where: { shopId: shop },
    });

    if (!subscription || subscription.plan === "free") {
      return json({ error: "Growth plan required" }, { status: 403 });
    }

    // Get usage stats by widget type (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const widgetStats = await db.usageLog.groupBy({
      by: ["widgetType"],
      where: {
        shopId: shop,
        timestamp: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    // Get products added via app
    const productsAdded = await db.usageLog.groupBy({
      by: ["productId"],
      where: {
        shopId: shop,
        eventType: "add_to_cart",
        srSource: true,
        productId: { not: null },
        timestamp: { gte: thirtyDaysAgo },
      },
      _count: true,
      orderBy: {
        _count: {
          productId: "desc",
        },
      },
      take: 10,
    });

    // Get order count (if available)
    const orderCount = await db.orderAttribution.count({
      where: {
        shopId: shop,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return json({
      widgetStats: widgetStats.map((stat) => ({
        widgetType: stat.widgetType,
        count: stat._count,
      })),
      topProducts: productsAdded.map((p) => ({
        productId: p.productId,
        count: p._count,
      })),
      orderCount,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
