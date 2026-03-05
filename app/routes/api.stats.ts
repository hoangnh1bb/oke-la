import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return Response.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
    const subscription = await db.subscription.findUnique({
      where: { shopId: shop },
    });

    if (!subscription || subscription.plan === "free") {
      return Response.json({ error: "Growth plan required" }, { status: 403 });
    }

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

    const orderCount = await db.orderAttribution.count({
      where: {
        shopId: shop,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return Response.json({
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
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
